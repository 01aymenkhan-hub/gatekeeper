'use client';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_INPUT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB max input file

export type CompressedImageResult =
  | { ok: true; dataUrl: string; error?: undefined }
  | { ok: false; error: string; dataUrl?: undefined };

/**
 * Compresses an identity document image (CNIC or DLS) or visitor photo into a
 * clean, readable JPEG data URL (~80-150KB) suitable for secure database storage.
 * Never throws: returns { ok: true, dataUrl } or { ok: false, error }.
 */
export async function compressIdentityImageFile(
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 640,
  quality: number = 0.84
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
    return { ok: false, error: 'Image file is too large (maximum 10 MB).' };
  }

  return new Promise<CompressedImageResult>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
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
          resolve({ ok: false, error: 'Unable to initialize image compression canvas' });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (!compressedDataUrl || !compressedDataUrl.startsWith('data:image/jpeg;base64,')) {
          resolve({ ok: false, error: 'Failed to encode compressed identity image' });
          return;
        }

        resolve({ ok: true, dataUrl: compressedDataUrl });
      } catch (err) {
        resolve({
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to compress image',
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, error: 'Failed to decode captured image file' });
    };

    img.src = objectUrl;
  });
}
