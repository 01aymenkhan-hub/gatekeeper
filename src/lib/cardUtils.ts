export function formatCardNoForStorage(raw: string): string {
  return raw
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function normalizeCardKey(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-_.]+/g, '')
    .toUpperCase();
}
