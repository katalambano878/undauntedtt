/**
 * Site defaults for Undaunted Treasure Trove.
 *
 * Every value is overridable via NEXT_PUBLIC_* env vars (and most are
 * also overridable via the Supabase CMS settings). The fallbacks here
 * are the production brand values, so the app renders correctly even
 * if env vars are not yet wired up.
 */

function env(key: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  return String(process.env[key] ?? '').trim();
}

/** Text logo / wordmark (header, footer, PWA) — kept short for the script font */
export function getWordmark(): string {
  return env('NEXT_PUBLIC_WORDMARK') || 'Undaunted TT';
}

/** Display name (store / site title) */
export function getSiteName(): string {
  return env('NEXT_PUBLIC_SITE_NAME') || 'Undaunted Treasure Trove';
}

/** Short line for meta / hero */
export function getSiteTagline(): string {
  return env('NEXT_PUBLIC_SITE_TAGLINE') || 'Curated jewelry from Adenta, Ghana';
}

export function getContactEmail(): string {
  return env('NEXT_PUBLIC_CONTACT_EMAIL') || 'info@undauntedtt.com';
}

/** Human-readable phone for display */
export function getContactPhoneDisplay(): string {
  return env('NEXT_PUBLIC_CONTACT_PHONE') || '0550244386';
}

/** E.164-style for tel: / SMS (best effort from display or raw env) */
export function getContactPhoneTel(): string {
  const raw = env('NEXT_PUBLIC_CONTACT_PHONE_TEL') || env('NEXT_PUBLIC_CONTACT_PHONE') || '0550244386';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.includes('+')) return '+' + digits.replace(/^\+/, '');
  // Ghana is the default fallback country (+233). Override via
  // NEXT_PUBLIC_PHONE_DEFAULT_CC if you operate elsewhere.
  const defaultCc = (env('NEXT_PUBLIC_PHONE_DEFAULT_CC') || '233').replace(/\D/g, '');
  if (defaultCc && digits.startsWith('0') && digits.length >= 9) {
    return `+${defaultCc}${digits.slice(1)}`;
  }
  return digits.length >= 10 ? `+${digits}` : digits;
}

export function getContactAddress(): string {
  return env('NEXT_PUBLIC_CONTACT_ADDRESS') || 'Adenta, Greater Accra, Ghana';
}

/** Strip placeholder / empty so "[Your address]" never shows in UI */
export function sanitizeAddressDisplay(addr: string | undefined | null): string {
  const t = (addr ?? '').trim();
  if (!t || /^\[Your address\]$/i.test(t)) return '';
  return t;
}

/** WhatsApp link (full URL) — falls back to deriving from contact phone */
export function getContactWhatsAppUrl(): string {
  const raw = env('NEXT_PUBLIC_CONTACT_WHATSAPP') || env('NEXT_PUBLIC_CONTACT_PHONE') || '0550244386';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const tel = getContactPhoneTel().replace(/\D/g, '');
  return tel ? `https://wa.me/${tel}` : '';
}

/**
 * Default social links. Supports full-URL env vars; falls back to the
 * brand's known social presence when env vars are not set.
 */
export function getDefaultSocialLinks() {
  return {
    instagram: env('NEXT_PUBLIC_SOCIAL_INSTAGRAM') || 'https://www.instagram.com/undaunted_tt/',
    tiktok: env('NEXT_PUBLIC_SOCIAL_TIKTOK') || 'https://www.tiktok.com/@undaunted_tt',
    snapchat: env('NEXT_PUBLIC_SOCIAL_SNAPCHAT') || 'https://www.snapchat.com/add/ab_nah',
    youtube: env('NEXT_PUBLIC_SOCIAL_YOUTUBE'),
    facebook: env('NEXT_PUBLIC_SOCIAL_FACEBOOK'),
    twitter: env('NEXT_PUBLIC_SOCIAL_TWITTER'),
    whatsapp: getContactWhatsAppUrl(),
  };
}

export function getSocialInstagramHandle(): string {
  return env('NEXT_PUBLIC_SOCIAL_INSTAGRAM_HANDLE') || 'undaunted_tt';
}

export function getSocialTiktokHandle(): string {
  return env('NEXT_PUBLIC_SOCIAL_TIKTOK_HANDLE') || 'undaunted_tt';
}

export function getSocialYoutubeHandle(): string {
  return env('NEXT_PUBLIC_SOCIAL_YOUTUBE_HANDLE');
}

export function getSocialSnapchatHandle(): string {
  return env('NEXT_PUBLIC_SOCIAL_SNAPCHAT_HANDLE') || 'ab_nah';
}

export function getDefaultMetaDescription(): string {
  const tag = getSiteTagline();
  const addr = getContactAddress();
  if (addr) return `${tag}. ${addr}.`;
  return `${tag}. Shop online.`;
}

export function getDefaultTitleSuffix(): string {
  return `${getSiteName()} | ${getSiteTagline()}`;
}

/** SMS sender id (max 11 alphanumeric chars per Moolre / typical providers) */
export function getSmsSenderId(): string {
  const id = (env('NEXT_PUBLIC_SMS_SENDER_ID') || 'UNDAUNTEDTT').toUpperCase();
  return id.slice(0, 11);
}

/** Auto-generated product SKU prefix */
export function getSkuPrefix(): string {
  return (env('NEXT_PUBLIC_SKU_PREFIX') || 'UTT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'UTT';
}

/** Server: admin / notification email fallback */
export function getServerAdminEmail(): string {
  return env('ADMIN_EMAIL') || getContactEmail();
}

export function getServerEmailFrom(): string {
  const explicit = env('EMAIL_FROM');
  if (explicit) return explicit;
  const name = getSiteName();
  const email = getServerAdminEmail();
  return `${name} <${email}>`;
}
