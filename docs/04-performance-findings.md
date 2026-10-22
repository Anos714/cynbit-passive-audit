# 04 — Performance findings

## Measurement method

- Three cold-connection `GET`s per page, sequential, 3 s apart. `time_starttransfer` (TTFB) and `time_appconnect` were recorded.
- Two warm `GET`s per page on a reused connection for the two pages that mattered (`/` and `/careers`).
- Decoded bundle size is `stat` size after `curl --compressed`; transfer size is `curl`'s `size_download` (Brotli-compressed bytes).
- No synthetic throttling, no Lighthouse, no load test. Numbers are one vantage point, not a field-data claim.

## Page timings

| Page | Edge cache | `age` at capture | Cold TTFB median | Warm TTFB |
|---|---|---:|---:|---:|
| `/` | HIT | 1,480,440 s (17.1 d) | 2.928 s | 0.650 s |
| `/contact` | HIT | 34,901 s (9.7 h) | 1.036 s | not sampled |
| `/careers` | **MISS** | 0 s | 0.829 s | **1.423 s** |
| `/services` | HIT | 1,460,076 s (16.9 d) | 0.963 s | not sampled |
| `/bitelevate` | HIT | 429,065 s (5.0 d) | 0.262 s | not sampled |

Cold TTFB is dominated by TLS setup on this host, which varied from 0.15 s to 2.43 s, so the cold column does not rank pages reliably — `/careers` looks *faster* than `/` there for that reason alone. The warm sample on a reused connection is the only clean signal: `/careers` (1.108 s and 1.738 s) is roughly **2×** the cached homepage (0.581 s and 0.719 s). Raw data: [`pages.csv`](../evidence/timings/pages.csv), [`warm.csv`](../evidence/timings/warm.csv).

Rendering signal:

- Cached pages: `x-nextjs-prerender: 1`, `x-vercel-cache: HIT`, `age` > 0.
- `/careers`: no `x-nextjs-prerender`, `x-vercel-cache: MISS`, `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`.

## Client payload

The homepage HTML contains 16 script tags. One is `noModule` polyfills, so modern browsers are expected to fetch 15 chunks. Measurements:

| Bundle group | Decoded | Brotli transfer | Notes |
|---|---:|---:|---|
| Modern-path JS (15 chunks) | **597,497 B** (583.5 KiB) | **186,310 B** (181.9 KiB) | Excludes `noModule` polyfills |
| All 16 script tags | 710,091 B (693.4 KiB) | 227,653 B (222.3 KiB) | Includes 112,594 B polyfills for legacy browsers |
| CSS (2 files) | **181,212 B** (177.0 KiB) | 25,695 B (25.1 KiB) | One Tailwind bundle is 177,526 B decoded |
| Homepage HTML | 100,498 B (98.1 KiB) | 15,392 B | Includes RSC flight data and JSON-LD |
| Contact page HTML | 64,026 B (62.5 KiB) | 11,163 B | Same shell, smaller page payload |

Largest decoded chunks:

| Chunk | Decoded | Transfer | Cache policy |
|---|---:|---:|---|
| `4bd1b696-100b9d70ed4e49c1.js` | 173,025 B | 55,614 B | `public, max-age=31536000, immutable` |
| `1255-eae4096fb21f1304.js` | 173,892 B | 46,143 B | `public, max-age=31536000, immutable` |
| `5563-f2fb65d9a5ac2236.js` | 127,487 B | 43,682 B | `public, max-age=31536000, immutable` |
| `polyfills-42372ed130431b0a.js` | 112,594 B | 41,343 B | `noModule`; not fetched by modern browsers |
| `app/(marketing)/page-786d2581113641b8.js` | 43,289 B | 10,256 B | `public, max-age=31536000, immutable` |
| `app/(marketing)/layout-98cfbe01c086f5c9.js` | 26,611 B | 7,643 B | `public, max-age=31536000, immutable` |
| `app/(marketing)/contact/page-c119885162e933b7.js` | 24,534 B | 6,284 B | `public, max-age=31536000, immutable` |

The cache policy on static assets is correct and does not need changing. The issue is the amount of code, not its delivery. Full table: [`assets.csv`](../evidence/timings/assets.csv); sizes and hashes: [`MANIFEST.csv`](../evidence/assets/MANIFEST.csv).

## Cache behavior

| Resource | `cache-control` | Edge | Revalidation |
|---|---|---|---|
| Prerendered HTML `/` | `public, max-age=0, must-revalidate` | HIT, `age` 17.1 d | Browser must revalidate every navigation; `304` observed |
| Prerendered HTML `/contact` | `public, max-age=0, must-revalidate` | HIT, `age` 9.7 h | Not sampled |
| Dynamic HTML `/careers` | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS, `age` 0 | Never cached |
| Hashed JS/CSS | `public, max-age=31536000, immutable` | HIT | None needed |
| `robots.txt` | `public, max-age=0, must-revalidate` | HIT, `age` 5.9 d | Fine; low change rate |
| `sitemap.xml` | `public, max-age=0, must-revalidate` | MISS, `age` 0 | Regenerated every request; `lastmod` moves with it |

`age` is the shared-cache age at the edge, not browser age. The browser still sees `max-age=0` and revalidates. A `304` is cheaper than a `200`, but it is still a full round trip before the HTML can be reused.

## Third-party delivery

The homepage `<head>` contains:

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"/>
<link rel="preload"
  href="https://www.googletagmanager.com/gtag/js?id=G-LK6CQWCWX0" as="script"/>
```

The font stylesheet is a render-blocking cross-origin request. GTM is preloaded before any user interaction. There is no `preconnect` or `dns-prefetch` for either origin in the captured HTML. This is a Low finding because the main text fonts are already self-hosted and preloaded; the external sheet is primarily for Material Symbols.

## Index

| ID | Finding | Severity |
|---|---|---|
| [PERF-01](../findings/performance/PERF-01-client-payload.md) | 597 KB modern-path JS; 177 KB CSS | Medium |
| [PERF-02](../findings/performance/PERF-02-html-cache-revalidation.md) | Prerendered HTML revalidates every navigation; edge copy ages for days | Medium |
| [PERF-03](../findings/performance/PERF-03-careers-uncached.md) | `/careers` is `no-store` and always misses the edge | Medium |
| [PERF-04](../findings/performance/PERF-04-sitemap-lastmod.md) | Sitemap `lastmod` is request time for 16 static URLs | Low |
| [PERF-05](../findings/performance/PERF-05-third-party-render-blocking.md) | Render-blocking Google Fonts CSS; early GTM preload | Low |
