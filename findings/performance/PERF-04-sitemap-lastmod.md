# PERF-04: Sitemap `lastmod` is request time for 16 static URLs

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Confirmed** |
| Area | Performance / cacheability / SEO integrity |
| Affected URL | `/sitemap.xml` |
| Date | 2026-10-22 |
| Evidence | [sitemap XML](../../evidence/raw/sitemap.xml), [sitemap headers](../../evidence/headers/sitemap.xml) |

## What I observed

The sitemap contains 82 URLs. Sixteen of them share a timestamp at the exact second the sitemap was requested:

```xml
<url>
<loc>https://cynbit.in</loc>
<lastmod>2026-10-22T13:04:38.470Z</lastmod>
...
<url>
<loc>https://cynbit.in/story</loc>
<lastmod>2026-10-22T13:04:38.470Z</lastmod>
...
```

Fourteen use `...38.471Z`; two use `...38.470Z`. The HTTP response was:

```http
date: Thu, 22 Oct 2026 13:04:39 GMT
age: 0
cache-control: public, max-age=0, must-revalidate
content-encoding: br
x-vercel-cache: MISS
```

The 16 request-time URLs are exactly the static marketing pages (`/`, `/story`, `/team`, `/contact`, `/careers`, `/services`, `/products`, `/case-studies`, `/impact`, `/bitelevate`, `/bitelevate/paths`, `/diaries`, `/blog`, `/privacy`, `/terms`, `/cookies`). Blog posts and case studies retain older, content-specific timestamps.

## Why it matters

`lastmod` is a hint search engines may use to decide whether a URL needs recrawling. If it changes on every request, it stops distinguishing changed pages from unchanged ones. The sitemap also misses the edge cache (`age: 0`, `x-vercel-cache: MISS`), so every crawler request regenerates the XML.

This is a correctness problem more than a speed problem. A sitemap that says "all 16 pages changed one second ago" is less useful than one with no `lastmod` at all.

## Root cause

**Confirmed pattern:** the static entries are generated with `new Date()` (or equivalent) at request time, not from a per-page `updatedAt`. The sitemap route is dynamic, so the value moves on each request.

## Recommended fix

Use a build/deploy timestamp for static pages and real per-entry timestamps for content. Cache the route.

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export const revalidate = 3600; // sitemap changes at most hourly

const BUILD_TIME = new Date(process.env.BUILD_TIME ?? Date.now());

const staticPages = [
  { path: '', priority: 1 },
  { path: '/story', priority: 0.8 },
  { path: '/team', priority: 0.8 },
  // ...
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return staticPages.map(({ path, priority }) => ({
    url: `https://cynbit.in${path}`,
    lastModified: BUILD_TIME,
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
```

For blog posts and case studies, use the CMS `updatedAt` value per entry instead of `BUILD_TIME`. If a page has no meaningful modification date, omit `lastmod` for that entry; a false timestamp is worse than no timestamp.

Set `BUILD_TIME` in the deployment environment, or derive it once at module scope from the build. Do not call `new Date()` inside the request handler.

## Why this approach

I rejected removing `lastmod` globally: content pages do have real dates, and those are useful. I also rejected using the current time for "freshness"; that is the bug. A build timestamp is honest for static pages, and per-entry dates are honest for CMS content.

## Verification

```bash
# Two requests at least one minute apart should not move the static lastmod values.
curl -sS https://www.cynbit.in/sitemap.xml | grep -o '<lastmod>[^<]*' | sort | uniq -c
sleep 65
curl -sS https://www.cynbit.in/sitemap.xml | grep -o '<lastmod>[^<]*' | sort | uniq -c

curl -sSI https://www.cynbit.in/sitemap.xml | grep -iE 'cache-control|age|x-vercel-cache'
```

Expect `x-vercel-cache: HIT` on the second request, a bounded `age`, and stable timestamps for unchanged static pages.

## Effort and risk of change

- **Effort:** 2–4 hours including CMS date mapping.
- **Risk:** Low. The main risk is publishing an older date for a page that did change; pair the change with the content publish workflow so `updatedAt` is maintained.
