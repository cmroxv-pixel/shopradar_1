/**
 * Central input validation & sanitisation for ShopRadar API routes.
 * Import these helpers in every route handler — never trust raw user input.
 */

import { NextResponse } from 'next/server';

// ─── Limits ────────────────────────────────────────────────────────────────

export const LIMITS = {
  SEARCH_QUERY_MAX:    200,   // characters
  PRODUCT_NAME_MAX:    300,
  URL_MAX:             2048,
  COUNTRY_CODE_MAX:    2,
  CURRENCY_CODE_MAX:   3,
  MARKETPLACE_MAX:     100,
  USER_ID_MAX:         64,
  EMAIL_MAX:           254,   // RFC 5321
  PRICE_MAX:           1_000_000,
  IMAGE_B64_MAX_MB:    5,
  LISTINGS_MAX:        200,   // for csv-export / verify
  URLS_VERIFY_MAX:     30,
  MESSAGES_MAX:        50,    // for chat-completion
  MESSAGE_CONTENT_MAX: 4000,  // per message
  PRICE_HISTORY_MAX:   365,   // data points
} as const;

// ─── Generic helpers ───────────────────────────────────────────────────────

/** Remove control characters and trim. Returns null if result is empty. */
export function sanitiseString(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  // Strip null bytes and ASCII control chars (keep printable + unicode)
  const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLen) return null;
  return cleaned;
}

/** Like sanitiseString but returns a fallback instead of null on bad input. */
export function sanitiseStringOr(raw: unknown, maxLen: number, fallback: string): string {
  return sanitiseString(raw, maxLen) ?? fallback;
}

/** Validate a UUID-v4 string (Supabase user IDs). */
export function isValidUUID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Validate an ISO 3166-1 alpha-2 country code (2 letters). */
export function sanitiseCountry(raw: unknown): string {
  const s = sanitiseString(raw, 2);
  if (!s || !/^[a-zA-Z]{2}$/.test(s)) return 'au';
  return s.toLowerCase();
}

/** Validate an ISO 4217 currency code (3 letters). */
export function sanitiseCurrency(raw: unknown): string {
  const s = sanitiseString(raw, 3);
  if (!s || !/^[a-zA-Z]{3}$/.test(s)) return 'AUD';
  return s.toUpperCase();
}

/** Clamp a number to [min, max]; return fallback if not a finite number. */
export function sanitiseNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Validate a URL and ensure it uses http/https. */
export function sanitiseUrl(raw: unknown): string | null {
  const s = sanitiseString(raw, LIMITS.URL_MAX);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Validate an email address (basic RFC 5321 shape). */
export function sanitiseEmail(raw: unknown): string | null {
  const s = sanitiseString(raw, LIMITS.EMAIL_MAX);
  if (!s) return null;
  // Simple but solid: local@domain.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s.toLowerCase();
}

/** Validate a base64 image payload and check its size. */
export function sanitiseImageBase64(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // base64 chars only
  if (!/^[A-Za-z0-9+/=]+$/.test(raw)) return null;
  // Size check: base64 expands by ~4/3
  const approxBytes = (raw.length * 3) / 4;
  if (approxBytes > LIMITS.IMAGE_B64_MAX_MB * 1024 * 1024) return null;
  return raw;
}

/** Validate mime type for images. */
export function sanitiseMimeType(raw: unknown): string {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const s = sanitiseString(raw, 50);
  if (!s || !allowed.includes(s)) return 'image/jpeg';
  return s;
}

// ─── Standard error responses ──────────────────────────────────────────────

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function payloadTooLarge(field: string) {
  return NextResponse.json(
    { error: `${field} exceeds maximum allowed size` },
    { status: 413 },
  );
}

// ─── Body size guard ───────────────────────────────────────────────────────

/**
 * Parse the JSON body and reject if it exceeds maxBytes.
 * Returns [body, null] on success or [null, errorResponse] on failure.
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request,
  maxBytes: number,
): Promise<[T, null] | [null, NextResponse]> {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return [null, payloadTooLarge('Request body')];
  }
  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      return [null, payloadTooLarge('Request body')];
    }
    const body = JSON.parse(text) as T;
    return [body, null];
  } catch {
    return [null, badRequest('Invalid JSON body')];
  }
}
