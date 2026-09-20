import { NextResponse, type NextRequest } from 'next/server';

/**
 * Staging gate.
 *
 * Snae's public surfaces are an adult-services marketplace, and every creator
 * profile in this build is placeholder content that reads as real. A staging
 * deployment therefore must not be openly reachable: the spec's launch gates
 * (processor approval, legal review, buyer age assurance) all sit ahead of
 * anything public.
 *
 * Basic auth is applied only when both credentials are configured, so
 * production — once it has its own real access controls — is unaffected, and a
 * local `npm run dev` needs no setup.
 */
export function middleware(request: NextRequest) {
  const user = process.env.STAGING_AUTH_USER;
  const password = process.env.STAGING_AUTH_PASSWORD;

  // Not configured means not a gated environment. Fail open deliberately:
  // failing closed would make a misconfigured production deploy unreachable.
  if (!user || !password) return NextResponse.next();

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ') && isAuthorized(header.slice(6), user, password)) {
    const response = NextResponse.next();
    // Nothing behind this gate should ever be indexed, whatever a page says.
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    /**
     * Gated responses must never reach a shared cache.
     *
     * Next marks statically prerendered pages `s-maxage=31536000`, and the CDN
     * in front of App Platform honours it. Without this override the first
     * authenticated request warms the edge cache and every later request is
     * served that 200 straight from the CDN — the middleware is never consulted
     * and the gate is bypassed entirely. Observed in the first staging deploy.
     */
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.delete('CDN-Cache-Control');
    return response;
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Snae staging", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function isAuthorized(encoded: string, user: string, password: string): boolean {
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  // Split on the first colon only — passwords may contain colons.
  const separator = decoded.indexOf(':');
  if (separator === -1) return false;

  return (
    timingSafeEqual(decoded.slice(0, separator), user) &&
    timingSafeEqual(decoded.slice(separator + 1), password)
  );
}

/**
 * Compares without leaking length or content through timing. Node's
 * `crypto.timingSafeEqual` is not available on the Edge runtime that
 * middleware uses, so this is the equivalent.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export const config = {
  // The health probe must stay reachable, and Next's own static assets are
  // requested before the browser can send credentials.
  matcher: ['/((?!healthz|_next/static|_next/image|favicon.ico).*)'],
};
