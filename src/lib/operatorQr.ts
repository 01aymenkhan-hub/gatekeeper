import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'gatekeeper_secret_jwt_key_2026')
  .digest();

/**
 * Generates a cryptographically secure random token for an operator.
 * Format: GKOP_<64-character-hex-random>
 * 
 * Distinct prefix 'GKOP_' prevents confusion with visitor passes ('GKP-...').
 */
export function generateOperatorQrToken(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `GKOP_${randomBytes}`;
}

/**
 * Computes a secure SHA-256 hash of the operator token.
 * This one-way hash is stored in the database for constant-time comparison during login.
 */
export function hashOperatorQrToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Encrypts the raw token using AES-256-GCM.
 * This allows an authorized admin to view or reprint the card later without regenerating,
 * while preventing exposure of the raw token if the database is read directly.
 */
export function encryptOperatorQrToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(token.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts the encrypted token using AES-256-GCM.
 */
export function decryptOperatorQrToken(encryptedPayload: string): string | null {
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[Operator QR] Failed to decrypt token:', err);
    return null;
  }
}

/**
 * Extracts and cleans an operator QR token from raw scanner output.
 */
export function cleanOperatorQrToken(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // If already GKOP_...
  if (trimmed.startsWith('GKOP_')) {
    return trimmed;
  }

  // If JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.token && typeof parsed.token === 'string' && parsed.token.startsWith('GKOP_')) {
        return parsed.token.trim();
      }
    } catch {}
  }

  // If embedded in a URL query parameter
  if (trimmed.includes('?')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://localhost/${trimmed}`);
      const tokenParam = url.searchParams.get('token') || url.searchParams.get('op_token');
      if (tokenParam && tokenParam.startsWith('GKOP_')) {
        return tokenParam.trim();
      }
    } catch {}
  }

  return trimmed;
}

// In-memory rate limiting map for QR login attempts per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkQrLoginRateLimit(ip: string): { allowed: boolean; remainingWaitMs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60 * 1000 }); // 1-minute window
    return { allowed: true };
  }

  if (record.count >= 15) {
    return { allowed: false, remainingWaitMs: record.resetAt - now };
  }

  record.count += 1;
  return { allowed: true };
}

export function resetQrLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
