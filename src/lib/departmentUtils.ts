export interface DepartmentRecord {
  id: string;
  name: string;
  normalizedName: string;
  hodName: string;
  whatsappNumber: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  visitCount?: number;
}

export function normalizeDepartmentName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function cleanAndValidateWhatsapp(raw: string): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, cleaned: '', error: 'WhatsApp number is required.' };
  }

  // Strip spaces, dashes, and parentheses while preserving leading '+'
  const compact = trimmed.replace(/[\s\-()]+/g, '');

  // Accept Pakistani mobile format (03XXXXXXXXX) or international format (+923XXXXXXXXX / 923XXXXXXXXX / +\d{10,15})
  const isPakLocal = /^03\d{9}$/.test(compact);
  const isInternational = /^\+?[1-9]\d{9,14}$/.test(compact);

  if (!isPakLocal && !isInternational) {
    return {
      valid: false,
      cleaned: compact,
      error:
        'Please enter a valid WhatsApp number (e.g., 03001234567 or +923001234567).',
    };
  }

  return { valid: true, cleaned: compact };
}
