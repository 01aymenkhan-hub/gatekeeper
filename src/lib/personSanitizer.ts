const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_DECODED_BYTES = 2.5 * 1024 * 1024; // 2.5 MB max stored image size

export function validateDocumentImageDataUrl(raw: string): {
  mime: string;
  buffer: Buffer;
  normalizedDataUrl: string;
} {
  const trimmed = raw.trim();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(trimmed);
  if (!match) {
    throw new Error('Invalid image format. Expected a base64-encoded image data URL.');
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error('Unsupported document image type. Allowed types: JPEG, PNG, WebP.');
  }

  const base64Clean = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Empty document image payload.');
  }

  if (buffer.byteLength > MAX_DECODED_BYTES) {
    throw new Error('Document image exceeds the maximum allowed size (2.5 MB).');
  }

  const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
  return {
    mime: normalizedMime,
    buffer,
    normalizedDataUrl: `data:${normalizedMime};base64,${base64Clean}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizePersonForClient<T extends Record<string, any> | null | undefined>(
  person: T
): T {
  if (!person || typeof person !== 'object') return person;

  const hasCnicImage = Boolean(person.cnicImageData);
  const hasDlsImage = Boolean(person.dlsImageData);

  const clone = { ...person };
  delete clone.cnicImageData;
  delete clone.cnicImageMime;
  delete clone.dlsImageData;
  delete clone.dlsImageMime;

  return {
    ...clone,
    hasCnicImage,
    hasDlsImage,
  } as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeVisitForClient<T extends Record<string, any> | null | undefined>(
  visit: T
): T {
  if (!visit || typeof visit !== 'object') return visit;
  if (!visit.person) return visit;
  return {
    ...visit,
    person: sanitizePersonForClient(visit.person),
  } as T;
}
