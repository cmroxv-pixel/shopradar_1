import { NextRequest, NextResponse } from 'next/server';

// In-memory store — resets on cold start, good enough for Vercel
// For production at scale, replace with Upstash Redis
const store = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 100 requests
let cleanupCounter = 0;
function cleanup() {
  cleanupCounter++;
  if (cleanupCounter % 100 === 0) {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (val.resetAt < now) store.delete(key);
    }
  }
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt };
}

// Rate limit configs per route type
const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  // Auth routes — strictest: 5 attempts per 15 minutes
  auth: { limit: 5, windowMs: 15 * 60 * 1000 },
  // AI routes — expensive: 20 per 15 minutes
  ai: { limit: 20, windowMs: 15 * 60 * 1000 },
  // Search routes — 30 per 15 minutes
  search: { limit: 30, windowMs: 15 * 60 * 1000 },
  // General API — 60 per 15 minutes
  general: { limit: 60, windowMs: 15 * 60 * 1000 },
};

function getLimitConfig(pathname: string): { limit: number; windowMs: number; type: string } {
  if (pathname.includes('/sign-up-login') || pathname.includes('/auth')) {
    return { ...LIMITS.auth, type: 'auth' };
  }
  if (pathname.includes('/api/ai-recommend') || pathname.includes('/api/deal-score') || pathname.includes('/api/photo-search')) {
    return { ...LIMITS.ai, type: 'ai' };
  }
  if (pathname.includes('/api/serpapi') || pathname.includes('/api/google-search')) {
    return { ...LIMITS.search, type: 'search' };
  }
  return { ...LIMITS.general, type: 'general' };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate limit API routes and auth page POST-like actions
  const shouldLimit =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/sign-up-login');

  if (!shouldLimit) return NextResponse.next();

  const ip = getIP(req);
  const config = getLimitConfig(pathname);
  const key = `${config.type}:${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
  const { allowed, remaining, resetAt } = rateLimit(key, config.limit, config.windowMs);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

    // Return JSON for API routes, redirect for page routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: config.type === 'auth'
            ? `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again.`
            : `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        }
      );
    }
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(config.limit));
  res.headers.set('X-RateLimit-Remaining', String(remaining));
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/sign-up-login',
  ],
};
