// snippets/middleware.ts
// Place at the repository root (same level as app/) as middleware.ts.
//
// Why this shape:
// - A per-request nonce is the only CSP primitive that works with Next.js's
//   inline bootstrap scripts without 'unsafe-inline'.
// - Next.js reads the CSP request header and applies the nonce to its own
//   script tags. The response header is what the browser enforces.
// - 'strict-dynamic' lets the nonced Next bootstrap load its own chunks while
//   still blocking unnonced inline injection.
//
// Important: a nonce must appear in the HTML, so fully static pages may need
// to become dynamic or use a build-time hash policy instead. Ship this in
// Report-Only first. See docs/05-recommendations-roadmap.md.

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    "default-src 'self'",
    // GTM is allowlisted for browsers that do not support strict-dynamic.
    // In CSP3 browsers, only nonced scripts load.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${
      isDev ? " 'unsafe-eval'" : ''
    }`,
    // Next.js/Tailwind emit inline style attributes. Removing this requires a
    // separate style-src-attr rollout; document the trade-off before doing so.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('content-security-policy', csp);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY'); // compatibility for older browsers
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'permissions-policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');

  return response;
}

export const config = {
  // Run on documents, not on immutable assets. The negative lookahead keeps
  // the middleware off /_next/static, images, and fonts.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
