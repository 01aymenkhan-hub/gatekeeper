import prisma from '@/lib/prisma';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_DECODED_BYTES = 8 * 1024 * 1024; // 8 MB generous safety ceiling for full-card images

export function validateDocumentImageDataUrl(raw: string): {
  mime: string;
  buffer: Buffer;
  normalizedDataUrl: string;
} {
  const trimmed = raw.trim();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(trimmed);
  if (!match) {
    throw new Error('Invalid image format. Expected a base64-encoded image data URL.');
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error('Unsupported document image type. Allowed types: JPEG, PNG, WebP.');
  }

  const base64Clean = match[2].replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Clean)) {
    throw new Error('Invalid base64 encoding in document image.');
  }

  const buffer = Buffer.from(base64Clean, 'base64');

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Empty document image payload.');
  }

  if (buffer.byteLength > MAX_DECODED_BYTES) {
    throw new Error('Document image exceeds the maximum allowed size (8 MB).');
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

  const hasCnicImage =
    typeof person.hasCnicImage === 'boolean'
      ? person.hasCnicImage
      : Boolean(person.cnicImageData);
  const hasDlsImage =
    typeof person.hasDlsImage === 'boolean'
      ? person.hasDlsImage
      : Boolean(person.dlsImageData);

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

export async function getPersonImageFlagsMap(
  personIds: string[]
): Promise<Map<string, { hasCnicImage: boolean; hasDlsImage: boolean }>> {
  const uniqueIds = Array.from(new Set(personIds.filter(Boolean)));
  const map = new Map<string, { hasCnicImage: boolean; hasDlsImage: boolean }>();
  if (uniqueIds.length === 0) return map;

  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; hasCnicImage: boolean; hasDlsImage: boolean }>
    >`
      SELECT
        "id",
        ("cnicImageData" IS NOT NULL AND LENGTH("cnicImageData") > 0) AS "hasCnicImage",
        ("dlsImageData" IS NOT NULL AND LENGTH("dlsImageData") > 0) AS "hasDlsImage"
      FROM "persons"
      WHERE "id" = ANY(${uniqueIds}::text[])
    `;
    for (const row of rows) {
      map.set(row.id, {
        hasCnicImage: Boolean(row.hasCnicImage),
        hasDlsImage: Boolean(row.hasDlsImage),
      });
    }
  } catch (err) {
    console.warn('Failed to query person image flags via raw SQL:', err);
  }

  return map;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sanitizePersonWithDbFlags<T extends Record<string, any> | null | undefined>(
  person: T
): Promise<T> {
  if (!person || typeof person !== 'object') return person;
  const id = typeof person.id === 'string' ? person.id : '';
  if (!id) return sanitizePersonForClient(person);

  const flagsMap = await getPersonImageFlagsMap([id]);
  const dbFlags = flagsMap.get(id);

  return sanitizePersonForClient({
    ...person,
    hasCnicImage: dbFlags ? dbFlags.hasCnicImage : Boolean(person.cnicImageData ?? person.hasCnicImage),
    hasDlsImage: dbFlags ? dbFlags.hasDlsImage : Boolean(person.dlsImageData ?? person.hasDlsImage),
  }) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sanitizeVisitsWithDbFlags<T extends Record<string, any>>(
  visits: T[]
): Promise<T[]> {
  if (!Array.isArray(visits) || visits.length === 0) return visits;
  const personIds = visits
    .map((v) => (v?.person?.id ? String(v.person.id) : ''))
    .filter(Boolean);
  const flagsMap = await getPersonImageFlagsMap(personIds);

  return visits.map((visit) => {
    if (!visit || !visit.person) return visit;
    const pid = String(visit.person.id || '');
    const dbFlags = flagsMap.get(pid);
    return {
      ...visit,
      person: sanitizePersonForClient({
        ...visit.person,
        hasCnicImage: dbFlags
          ? dbFlags.hasCnicImage
          : Boolean(visit.person.cnicImageData ?? visit.person.hasCnicImage),
        hasDlsImage: dbFlags
          ? dbFlags.hasDlsImage
          : Boolean(visit.person.dlsImageData ?? visit.person.hasDlsImage),
      }),
    };
  });
}
