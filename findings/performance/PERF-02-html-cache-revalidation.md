# PERF-02 — Prerendered HTML revalidates every navigation while edge copies age for days

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **Confirmed** |
| Area | Performance / caching |
| Affected URL | `/`, `/contact`, `/services`, `/bitelevate` |
| Date | 2026-10-22 |
| Evidence | [home headers](../../evidence/headers/home_run1.txt), [contact headers](../../evidence/headers/contact_run1.txt), [304 capture](../../evidence/headers/conditional_home.txt), [timings](../../evidence/timings/pages.csv) |

## What I observed

Cached HTML returns:

```http
cache-control: public, max-age=0, must-revalidate
age: 1480440
etag: W/"eb276f06e2d113b385ff2f2f24041046"
x-nextjs-prerender: 1
x-vercel-cache: HIT
```

`age: 1480440` is **17.13 days**. The same policy is present on `/contact` (`age: 34901`, 9.7 hours), `/services` (16.9 days), and `/bitelevate` (5.0 days). The browser sees `max-age=0`, so it must revalidate on every navigation. A conditional request with the ETag returned:

```http
HTTP/2 304
cache-control: public, max-age=0, must-revalidate
x-vercel-cache: HIT
```

## Why it matters

The edge copy is cheap to serve, but every repeat navigation still costs a full browser round trip to confirm the HTML has not changed. On a high-latency mobile connection, that 304 is on the critical path before the browser can reuse the document. The HTML also stays at the edge for days while content changes may only appear after a deploy or purge.

This is a policy mismatch: the page is prerendered (`x-nextjs-prerender: 1`) and edge-cached, but the cache directives do not describe that model.

## Root cause

**Strongly inferred:** the routes are fully static at build time and have no `revalidate` interval, so Next.js emits `max-age=0, must-revalidate` for browser revalidation while Vercel keeps the prerendered artifact in its edge cache. There is no explicit `s-maxage` or `stale-while-revalidate` in the response.

## Recommended fix

Choose an explicit freshness window and make it visible in headers. For a marketing page, 5 minutes is a reasonable starting point:

```tsx
// app/(marketing)/page.tsx
export const revalidate = 300; // 5 minutes
```

Apply the same segment config to `/contact`, `/services`, and `/bitelevate` if their content is CMS-driven. If the content only changes on deploy, `revalidate = false` is also valid, but then document that the 17-day edge age is intentional and add a purge step to the deploy.

If you need a browser TTL without making every route dynamic, add a scoped header rule for the document routes only. Listing the routes explicitly avoids accidentally overriding the immutable asset policy:

```js
// next.config.mjs
const documentRoutes = ['/', '/contact', '/services', '/bitelevate'];

const nextConfig = {
  async headers() {
    return documentRoutes.map((source) => ({
      source,
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
        },
      ],
    }));
  },
};
```

Test the exact routes in a preview. Do not use a broad `/(.*)` rule: it would also match `/_next/static` and could replace the correct immutable policy.

## Why this approach

I rejected `max-age=31536000` on HTML. It would eliminate revalidation, but it would also make an urgent content correction invisible for a year unless every client is purged. Short `s-maxage` plus `stale-while-revalidate` gives fast repeat visits while bounding staleness. I also rejected removing the ETag; the 304 is working correctly and is useful once the browser TTL is non-zero.

## Verification

```bash
curl -sSI https://www.cynbit.in/ | grep -iE 'cache-control|age|x-vercel-cache|etag'

# After a change, a second request should show a bounded age and a 304/200
# consistent with the chosen s-maxage, not a 17-day age.
```

Check both a cold browser profile and a warm one. Confirm hashed JS/CSS still returns `max-age=31536000, immutable`.

## Effort and risk of change

- **Effort:** 1–3 hours plus preview verification.
- **Risk:** Medium. A longer TTL can show stale legal copy, job counts, or contact details. Pair it with on-demand revalidation (`revalidatePath`) or a deploy hook; do not set it and forget it.
