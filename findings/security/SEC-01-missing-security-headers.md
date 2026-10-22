# SEC-01: No CSP and no complementary browser-isolation headers

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **Confirmed** |
| Area | Security architecture / response headers |
| Affected URL | All HTML routes: `/`, `/contact`, `/careers`, `/services`, `/bitelevate` |
| Date | 2026-10-22 |
| Evidence | [home headers](../../evidence/headers/home_run1.txt), [contact headers](../../evidence/headers/contact_run1.txt), [home HTML](../../evidence/raw/home_run1.html) |

## What I observed

The response headers contain no `Content-Security-Policy` on any of the five HTML routes. There is also no `<meta http-equiv="Content-Security-Policy">` in the homepage HTML. The same responses omit `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, and `Cross-Origin-Resource-Policy`.

Relevant lines from the homepage capture:

```http
HTTP/2 200
access-control-allow-origin: *
cache-control: public, max-age=0, must-revalidate
content-encoding: br
content-type: text/html; charset=utf-8
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-vercel-cache: HIT
```

The page loads these third-party origins and inline scripts:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...">
<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-LK6CQWCWX0" as="script"/>
```

The HTML also contains Next.js hydration/flight inline scripts. There is no nonce attribute on the inline scripts in the captured HTML. See [home HTML](../../evidence/raw/home_run1.html).

## Why it matters

There is no second line of defense if an HTML injection is ever introduced through content, a CMS field, a query parameter, or a compromised third-party script. A CSP would restrict where scripts can load from and whether the page can be framed. The missing `X-Content-Type-Options` allows MIME sniffing in older browsers; the missing `Referrer-Policy` leaves full URL leakage to third parties on the browser default; the missing frame protection allows the contact form to be framed.

The site has no login, payment, or observed sensitive endpoint, so this is not a High finding. It is a real gap because the homepage already trusts Google Tag Manager, Google Fonts, and inline Next.js bootstrap code, and the response gives the browser no policy to constrain any of them.

## Root cause

**Strongly inferred:** the deployment has no global header middleware or `next.config` header rule for the document routes. Next.js does not add a CSP by default, and Vercel only adds HSTS here. The inconsistent `x-powered-by` across routes (present on `/contact`, `/careers`, `/bitelevate`; absent on `/` and `/services`) suggests route-level handling rather than one global policy.

## Recommended fix

Add a single middleware that sets the non-CSP baseline on every document and a nonce-based CSP. The full working file is in [`snippets/middleware.ts`](../../snippets/middleware.ts).

```ts
// middleware.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)'],
};
```

Because the site loads GA through a preload and likely a framework component, replace that loader with the nonce-aware version in [`snippets/analytics.tsx`](../../snippets/analytics.tsx). Also set `poweredByHeader: false` in `next.config.mjs` to remove the remaining `x-powered-by: Next.js` values.

**Static-page caveat:** a per-request nonce must be present in the HTML. If the marketing pages remain fully prerendered, enforcing a nonce CSP can force them to render dynamically or require build-time hashes. Roll out in `Content-Security-Policy-Report-Only` first, then enforce on the dynamic form routes; do not assume the nonce is free. This is the main trade-off discussed in the [roadmap](../../docs/05-recommendations-roadmap.md#trade-offs).

## Why this approach

I rejected `script-src 'unsafe-inline'` as the CSP: it would silence the report without preventing inline script injection. I also rejected relying on `X-Frame-Options` alone; `frame-ancestors 'none'` is the modern control and works where XFO is ignored. The nonce + `strict-dynamic` combination is the standard Next.js pattern, but it is explicitly staged because of the static-rendering cost.

## Verification

```bash
curl -sSI https://www.cynbit.in/ \
  | grep -iE 'content-security-policy|x-content-type-options|referrer-policy|permissions-policy|x-frame-options|cross-origin'

# Expect a nonce in both the header and the inline scripts:
curl -sS https://www.cynbit.in/ | grep -o "nonce=\"[^\"]*\"" | sort -u
```

A browser test should show no CSP violations in the console for the homepage, contact form, and GA pageview. Run the report-only policy for at least a week before enforcing.

## Effort and risk of change

- **Effort:** 1–2 hours for the header baseline; 2–4 hours for report-only CSP; 1–2 days for enforcement and allowlist tuning.
- **Risk:** Medium. A strict `script-src` can break GTM, Next.js hydration, or font loading. COOP can break OAuth popups if any are added later. The report-only phase is the safety valve.
