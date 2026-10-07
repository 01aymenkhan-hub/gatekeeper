/**
 * Search normalization and comparison utilities for Gate Keeper.
 * 
 * IMPORTANT: Normalization is STRICTLY for search matching and comparisons.
 * Stored database values, OCR extraction results, and display strings are NEVER altered.
 */

/**
 * Normalizes a search query or target string by removing harmless separators
 * (hyphens, spaces, slashes, backslashes, dots, underscores, colons, commas)
 * and converting to lowercase.
 */
export function normalizeSearchValue(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toString()
    .replace(/[\s\-_./,\\]+/g, '')
    .toLowerCase();
}

/**
 * Normalizes string for text comparison (collapses multiple whitespaces, trims, lowercases).
 */
export function cleanSearchQuery(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * If the input consists of 13 digits (Pakistani CNIC), format it into XXXXX-XXXXXXX-X.
 * If 5-12 digits, formats the initial block with a hyphen.
 */
export function getCnicHyphenatedVariants(digitsOnly: string): string[] {
  const cleanDigits = digitsOnly.replace(/\D/g, '');
  const variants: string[] = [];

  if (cleanDigits.length >= 13) {
    const formatted = `${cleanDigits.slice(0, 5)}-${cleanDigits.slice(5, 12)}-${cleanDigits.slice(12, 13)}`;
    variants.push(formatted);
  } else if (cleanDigits.length >= 5) {
    const partial = `${cleanDigits.slice(0, 5)}-${cleanDigits.slice(5)}`;
    variants.push(partial);
  }

  return variants;
}

/**
 * Checks if a target string contains the search query using normalized comparison.
 */
export function matchesNormalized(
  target: string | null | undefined,
  query: string | null | undefined
): boolean {
  if (!target || !query) return false;
  const normTarget = normalizeSearchValue(target);
  const normQuery = normalizeSearchValue(query);
  if (!normQuery) return false;
  return normTarget.includes(normQuery);
}
