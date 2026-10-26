'use client';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_INPUT_FILE_BYTES = 15 * 1024 * 1024; // 15 MB max input camera/upload file

export type CompressedImageResult =
  | { ok: true; dataUrl: string; error?: undefined }
  | { ok: false; error: string; dataUrl?: undefined };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Retains and optimizes the complete scanned identity document image (CNIC or DLS)
 * or visitor photo into a high-readability JPEG data URL suitable for reliable database storage.
 * Falls back to raw FileReader data URL if canvas re-encoding is unavailable.
 */
export async function compressIdentityImageFile(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1100,
  quality: number = 0.88
): Promise<CompressedImageResult> {
  if (!file) {
    return { ok: false, error: 'No image file provided' };
  }

  const normalizedType = (file.type || '').toLowerCase();
  if (normalizedType && !ALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) {
    return {
      ok: false,
      error: 'Unsupported image format. Please use JPEG, PNG, or WebP.',
    };
  }

  if (file.size > MAX_INPUT_FILE_BYTES) {
    return { ok: false, error: 'Image file is too large (maximum 15 MB).' };
  }

  return new Promise<CompressedImageResult>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let targetW = img.naturalWidth || img.width || maxWidth;
        let targetH = img.naturalHeight || img.height || maxHeight;

        if (targetW > maxWidth || targetH > maxHeight) {
          const scale = Math.min(maxWidth / targetW, maxHeight / targetH);
          targetW = Math.max(1, Math.round(targetW * scale));
          targetH = Math.max(1, Math.round(targetH * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const rawUrl = await readFileAsDataUrl(file);
          resolve({ ok: true, dataUrl: rawUrl });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/')) {
          const rawUrl = await readFileAsDataUrl(file);
          resolve({ ok: true, dataUrl: rawUrl });
          return;
        }

        resolve({ ok: true, dataUrl: compressedDataUrl });
      } catch {
        try {
          const rawUrl = await readFileAsDataUrl(file);
          resolve({ ok: true, dataUrl: rawUrl });
        } catch (fallbackErr) {
          resolve({
            ok: false,
            error: fallbackErr instanceof Error ? fallbackErr.message : 'Failed to process image',
          });
        }
      }
    };

    img.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const rawUrl = await readFileAsDataUrl(file);
        resolve({ ok: true, dataUrl: rawUrl });
      } catch {
        resolve({ ok: false, error: 'Failed to decode captured image file' });
      }
    };

    img.src = objectUrl;
  });
}
