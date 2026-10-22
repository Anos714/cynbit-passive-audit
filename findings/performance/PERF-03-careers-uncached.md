# PERF-03 — `/careers` is `no-store` and always misses the edge cache

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **Confirmed** (behavior); **Strongly inferred** (root cause) |
| Area | Performance / caching |
| Affected URL | `/careers` |
| Date | 2026-10-22 |
| Evidence | [careers headers](../../evidence/headers/careers_run1.txt), [timings](../../evidence/timings/pages.csv) |

## What I observed

All three `/careers` responses returned:

```http
HTTP/2 200
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-encoding: br
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-powered-by: Next.js
x-vercel-cache: MISS
```

There was no `x-nextjs-prerender` header and `age` was `0` on every run. Warm-connection TTFB on `/careers` was **1.108 s** and **1.738 s**, versus **0.581 s** and **0.719 s** on the cached homepage. The page HTML contains the full list of ~20 job openings, so the content is not inherently per-user.

## Why it matters

Every `/careers` visit invokes the Next.js runtime and rebuilds the page, even when the job list has not changed. That is the slowest observed route on a warm connection and the only route that does not benefit from the edge cache. At normal traffic this is wasted compute; during a hiring campaign it is the page most likely to receive a burst.

The 5-second job-data freshness trade-off is preferable to a full origin render on every request.

## Root cause

**Strongly inferred:** the route is dynamically rendered. The absence of `x-nextjs-prerender` and the `private, no-cache, no-store` policy indicate that Next.js opted the route out of static generation. A common cause is a per-request API (`cookies()`, `headers()`, `searchParams`) or an explicit `dynamic = 'force-dynamic'` / `cache: 'no-store'` data fetch. The exact trigger is not visible from outside.

The page content itself does not require per-user rendering: it is a list of public roles.

## Recommended fix

Make the route ISR and avoid request-scoped APIs in the page component:

```tsx
// app/(marketing)/careers/page.tsx
export const revalidate = 300; // refresh job data every 5 minutes

export default async function CareersPage() {
  // Do not call cookies()/headers()/searchParams here.
  const jobs = await getOpenRoles(); // must be cacheable
  return <CareersList jobs={jobs} />;
}
```

If the roles come from a remote API, make the fetch cacheable:

```ts
const response = await fetch(`${process.env.CAREERS_API}/roles`, {
  next: { revalidate: 300 },
  headers: { accept: 'application/json' },
});

if (!response.ok) {
  throw new Error(`careers api ${response.status}`);
}
```

If the data source is a CMS/DB client rather than `fetch`, wrap it in `unstable_cache` with the same 300-second window, or move the role list to build-time content and revalidate on publish.

## Why this approach

I rejected `dynamic = 'force-static'` without a revalidation window: job openings change, and a stale list is a business problem. ISR at 5 minutes keeps the page fast while bounding staleness. I also rejected caching only at the browser; the first visitor after expiry would still pay the origin cost, and `private` prevents shared caching.

## Verification

```bash
for i in 1 2 3; do
  curl -sSI https://www.cynbit.in/careers \
    | grep -iE 'cache-control|x-vercel-cache|age|x-nextjs-prerender'
  sleep 2
done
```

After the fix, a warm request should show `x-vercel-cache: HIT`, a non-zero `age`, and `s-maxage=300` (or the chosen window). Repeat the warm timing sample and compare against the homepage. Do not use the cold-connect TTFB for the comparison; it is dominated by TLS variance.

## Effort and risk of change

- **Effort:** 2–4 hours including a CMS/API cache review.
- **Risk:** Low–Medium. A closed role could remain visible for up to 5 minutes. Add on-demand revalidation when an admin publishes a role if that delay is unacceptable.
