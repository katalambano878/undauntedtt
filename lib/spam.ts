/**
 * Lightweight spam heuristics for public forms (contact, etc.).
 * Works without reCAPTCHA — bots currently bypass client-side checks.
 */

const DISPOSABLE_EMAIL_HINTS = [
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'trashmail.com',
  'yopmail.com',
  '10minutemail.com',
  'sharklasers.com',
];

/** Random letter-soup like "feoaBPeVzkkWUBYORjgoKO" — no spaces, mixed case, high entropy. */
export function looksLikeGibberish(input: string | null | undefined): boolean {
  const s = String(input || '').trim();
  if (!s) return true;
  if (/\s/.test(s)) return false; // real names/messages usually have spaces
  if (s.length < 8) return false;
  // All letters, no digits/punctuation, and mixed case → classic bot noise
  if (/^[A-Za-z]+$/.test(s) && /[a-z]/.test(s) && /[A-Z]/.test(s) && s.length >= 10) {
    return true;
  }
  // Long single-token alphanumeric blobs
  if (/^[A-Za-z0-9]{16,}$/.test(s)) return true;
  return false;
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return DISPOSABLE_EMAIL_HINTS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export interface ContactSpamInput {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  phone?: string;
  /** Honeypot field — must be empty for humans */
  website?: string;
  company?: string;
}

export function detectContactSpam(input: ContactSpamInput): string | null {
  if (input.website || input.company) {
    return 'honeypot filled';
  }

  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();

  if (!name || !email || !subject || !message) {
    return 'missing fields';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'invalid email';
  }
  if (isDisposableEmail(email)) {
    return 'disposable email';
  }
  if (name.length > 100 || subject.length > 200 || message.length > 5000) {
    return 'input too long';
  }
  if (looksLikeGibberish(name) || looksLikeGibberish(subject)) {
    return 'gibberish name/subject';
  }
  // Message is a single token of letter-soup with no spaces
  if (!/\s/.test(message) && message.length >= 12 && /^[A-Za-z0-9]+$/.test(message)) {
    return 'gibberish message';
  }
  // Extremely short "messages" that are just noise
  if (message.length < 10) {
    return 'message too short';
  }
  // Dot-stuffed emails often used by bots (k.a.i.d.en...)
  const local = email.split('@')[0] || '';
  if ((local.match(/\./g) || []).length >= 3) {
    return 'suspicious email local-part';
  }

  return null;
}
