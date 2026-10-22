# SEC-03 — Wildcard CORS on HTML documents, inconsistently applied

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Confirmed** |
| Area | Security architecture / CORS |
| Affected URL | `/` and `/services` (observed); absent on `/contact`, `/careers`, `/bitelevate` |
| Date | 2026-10-22 |
| Evidence | [home headers](../../evidence/headers/home_run1.txt), [services headers](../../evidence/headers/services_run1.txt), [contact headers](../../evidence/headers/contact_run1.txt), [OPTIONS capture](../../evidence/headers/options_home.txt) |

## What I observed

`/` and `/services` return:

```http
access-control-allow-origin: *
```

`/contact`, `/careers`, and `/bitelevate` do not return the header at all. The `OPTIONS` response on `/` is:

```http
HTTP/2 204
access-control-allow-methods: OPTIONS, GET, HEAD
access-control-allow-origin: *
```

No `Access-Control-Allow-Credentials: true` is present. No `Set-Cookie` is present. The `Vary` header does not include `Origin`.

## Why it matters

`Access-Control-Allow-Origin: *` lets any website read the response body with JavaScript. For a public marketing page this is not a confidentiality breach: the content is already public. The reason to fix it is that the header is unnecessary, inconsistent, and easy to copy into a future endpoint that does handle user-specific data. A wildcard origin plus a later `Allow-Credentials` change would be a real exposure; the current configuration is only a weak default.

The inconsistency is itself a maintenance signal: there is no single CORS policy. A developer adding `/api/` later cannot infer the intended allowlist from these responses.

## Root cause

**Hypothesis:** a route-level header rule or an edge configuration adds `Access-Control-Allow-Origin: *` to statically served marketing pages, while dynamically rendered routes bypass it. The exact source is not visible from outside. It is not a Next.js default.

## Recommended fix

Remove the wildcard from document responses. Do not replace it with a list of "trusted" marketing origins; documents do not need CORS.

```ts
// middleware.ts — only add CORS where an actual cross-origin API is intended
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED = new Set(['https://app.example.com']);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // Public documents: no CORS headers at all.
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.delete('access-control-allow-origin');
    return response;
  }

  if (origin && ALLOWED.has(origin)) {
    response.headers.set('access-control-allow-origin', origin);
    response.headers.set('access-control-allow-credentials', 'true');
    response.headers.append('vary', 'Origin');
  }
  return response;
}
```

If the wildcard is coming from a `headers()` rule, remove that rule rather than trying to delete it in middleware. If a public, credential-free API genuinely needs cross-origin reads, keep `*` only on that API path and never add `Allow-Credentials`.

## Why this approach

I rejected an origin allowlist for the marketing pages. An allowlist still enables cross-origin reads for the listed sites, and there is no business need for a browser on another origin to read the HTML. I also rejected `Access-Control-Allow-Origin: null`; it is not a security control and is frequently bypassable.

## Verification

```bash
for p in / /contact /careers /services /bitelevate; do
  printf '%s: ' "$p"
  curl -sSI "https://www.cynbit.in$p" | grep -i '^access-control-allow-origin' || echo 'absent'
done
```

Expect `absent` on all document routes. If a cross-origin API is added later, test it with an allowed and a disallowed `Origin` header and confirm `Vary: Origin`.

## Effort and risk of change

- **Effort:** 1–2 hours, mostly locating the source of the header.
- **Risk:** Low. Removing CORS from public documents should not affect normal navigation, images, or same-origin fetches. Check any embedded partner widget that reads the page HTML cross-origin; none was observed.
