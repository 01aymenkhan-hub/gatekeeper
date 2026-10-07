import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Generates a cryptographically secure, random, unguessable pass code for a visitor.
 * Example format: GKP-A8E2C91D4B70
 * 
 * Contains NO personally identifiable information (PII).
 */
export function generatePassCode(): string {
  const randomBytes = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `GKP-${randomBytes}`;
}

/**
 * Generates a clean QR code Data URL with high-contrast quiet space,
 * optimized for camera scanning and crisp printing.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#020617',
      light: '#ffffff',
    },
  });
}

/**
 * Extracts and cleans a visitor pass code from a raw QR code scan payload.
 * Handles:
 * - Plain pass codes: GKP-A8E2C91D4B70
 * - URLs: https://domain.com/checkout?pass=GKP-A8E2C91D4B70
 * - URLs path-based: https://domain.com/pass/GKP-A8E2C91D4B70
 * - JSON: {"pass": "GKP-..."} or {"code": "GKP-..."}
 * - Card identifiers or visit numbers
 */
export function extractPassCode(rawScan: string): string {
  if (!rawScan) return '';
  const trimmed = rawScan.trim();

  // 1. Check if JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.passCode || parsed.pass || parsed.code || parsed.id) {
        return (parsed.passCode || parsed.pass || parsed.code || parsed.id).toString().trim();
      }
    } catch {
      // Ignore JSON parse error and fallback
    }
  }

  // 2. Check if URL with query parameter ?pass=... or ?code=...
  if (trimmed.includes('?')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://localhost/${trimmed}`);
      const passParam = url.searchParams.get('pass') || url.searchParams.get('code') || url.searchParams.get('id');
      if (passParam) return passParam.trim();
    } catch {
      // Ignore URL parse error
    }
  }

  // 3. Check if path ends with pass code
  const lastSegment = trimmed.split('/').pop()?.trim() || '';
  if (lastSegment.startsWith('GKP-') || lastSegment.startsWith('VIS-') || lastSegment.startsWith('GK-')) {
    return lastSegment;
  }

  return trimmed;
}
