import type { NextConfig } from 'next';

/**
 * Security headers are a launch gate (spec A.4), not a later hardening pass.
 * CSP is deliberately strict: the Live Hello capture path uses getUserMedia and
 * never file uploads, so no blob: or data: sources are needed for media input.
 */
const csp = [
  "default-src 'self'",
  // next/script and the inlined runtime need unsafe-inline; tightened to nonce in Sprint 7.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' blob: data: https:",
  "media-src 'self' blob:",
  "connect-src 'self' wss: https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Surfaces that must never be indexed: accounts, money, sessions, studio, admin. */
const PRIVATE_PREFIXES = ['/account', '/wallet', '/favorites', '/session', '/creator/studio', '/admin'];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      // Never index private surfaces (§A.6). Each page also sets `robots` in
      // its metadata; this header is the belt to that braces, so that a page
      // added without the metadata still cannot leak into an index.
      ...PRIVATE_PREFIXES.map((prefix) => ({
        source: `${prefix}/:path*`,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default nextConfig;
