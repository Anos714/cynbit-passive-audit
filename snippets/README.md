# Reference snippets

These are drop-in reference implementations for the observed stack (Next.js App Router on Vercel). They are intentionally small; the point is the pattern and the reasoning, not a framework.

## Placement

| File | Copy to | Purpose |
|---|---|---|
| `middleware.ts` | repo root, beside `app/` | Nonce CSP + baseline security headers |
| `analytics.tsx` | `app/components/analytics.tsx` | Nonce-aware GA4/GTM loader |
| `next.config.mjs` | repo root | Remove `x-powered-by` |
| `lib/rate-limit.ts` | `lib/rate-limit.ts` | Shared fixed-window limiter |
| `lib/inquiry-schema.ts` | `lib/inquiry-schema.ts` | Strict Zod schema for the contact form |
| `lib/errors.ts` | `lib/errors.ts` | Correlation-ID JSON error envelope |
| `app/api/inquiry/route.ts` | `app/api/inquiry/route.ts` | Reference POST with 429 + `Retry-After` |
| `app/sitemap.ts` | `app/sitemap.ts` | Static/ISR sitemap with honest timestamps |

## Dependencies

```bash
npm i @upstash/redis zod
```

`@upstash/redis` needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Do not commit either value. The current site does not have these helpers; this is a proposed implementation.

## Important trade-offs

1. **Nonce CSP and static pages.** A nonce must be in the HTML. If the page is fully prerendered, a per-request nonce can force dynamic rendering. Start with `Content-Security-Policy-Report-Only`; enforce on the dynamic form routes first. For static routes, consider build-time hashes instead of a nonce.
2. **`style-src 'unsafe-inline'`.** Next.js and Tailwind emit inline style attributes. Removing this directive requires a separate `style-src-attr` rollout and may break the UI. Keep it initially and document it.
3. **Redis dependency.** A rate limiter in a serverless function must be shared. An in-memory `Map` is not a control. Upstash adds a network round trip per submission; at 5 requests/minute that is acceptable.
4. **IP trust.** `x-real-ip` is used because Vercel sets it. Do not trust `X-Forwarded-For` from an arbitrary client unless a trusted proxy overwrites it.
5. **Route handler vs Server Action.** The live form uses a Server Action. The reference route handler shows the HTTP semantics (`429`, `Retry-After`) clearly. If you keep the action, reuse the same helpers and return a structured error object; the client must translate it into a visible retry message.

## Quick checks

```bash
# Type-check after copying into a Next.js project
npx tsc --noEmit

# Build
npm run build

# Header check (after deploy)
curl -sSI https://www.cynbit.in/ | grep -iE 'content-security-policy|x-content-type-options|referrer-policy|permissions-policy'

# Rate-limit check (authorised environment only)
for i in $(seq 1 7); do
  curl -sS -o /dev/null -D - -X POST https://your-preview.example/api/inquiry \
    -F 'fullName=Test User' \
    -F 'email=test@example.com' \
    -F 'message=This is a test inquiry.' \
    | grep -iE 'HTTP/|retry-after|x-correlation-id'
done
```

Only run the POST check against a preview you own. Never run it against the production site without permission.
