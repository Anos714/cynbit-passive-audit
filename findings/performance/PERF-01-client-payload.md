# PERF-01 — Homepage ships 597 KB of decoded JavaScript on the modern path

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **Confirmed** (size); **Hypothesis** (main-thread impact) |
| Area | Performance / client payload |
| Affected URL | `/` (homepage) |
| Date | 2026-10-22 |
| Evidence | [asset timings](../../evidence/timings/assets.csv), [asset files](../../evidence/assets/js/), [home HTML](../../evidence/raw/home_run1.html) |

## What I observed

The homepage HTML references 16 script tags. One is marked `noModule`:

```html
<script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" noModule=""></script>
```

Modern browsers are expected to skip that chunk. Excluding it, the homepage requests **15 JavaScript chunks totalling 597,497 decoded bytes** and **186,310 Brotli bytes**. Including the legacy polyfill chunk, the markup references **710,091 decoded bytes** across 16 chunks. Two CSS files add **181,212 decoded bytes** (25,695 Brotli bytes).

The four largest decoded chunks:

| Chunk | Decoded | Brotli |
|---|---:|---:|
| `1255-eae4096fb21f1304.js` | 173,892 B | 46,143 B |
| `4bd1b696-100b9d70ed4e49c1.js` | 173,025 B | 55,614 B |
| `5563-f2fb65d9a5ac2236.js` | 127,487 B | 43,682 B |
| `polyfills-42372ed130431b0a.js` (noModule) | 112,594 B | 41,343 B |

All hashed assets return correct caching headers:

```http
cache-control: public, max-age=31536000, immutable
content-encoding: br
x-vercel-cache: HIT
```

Full table and per-file headers: [`assets.csv`](../../evidence/timings/assets.csv), [`evidence/headers/assets/`](../../evidence/headers/assets/).

## Why it matters

The bytes are compressed well, but the browser still has to decompress, parse, and execute 597 KB of JavaScript before the page is fully interactive. On a mid-range mobile device this can add hundreds of milliseconds of main-thread work, competing with the LCP image and font rendering. The exact CPU cost was not measured (no throttled trace was run); the size is confirmed and the impact direction is well established.

The framework and shared layout dominate the payload, not a single page-specific mistake. The page chunk itself is 43,289 B decoded; the largest chunks are React/Next.js runtime and shared dependencies. That makes this a tuning problem, not a rewrite.

## Root cause

**Strongly inferred:** the marketing layout imports client-side components (navigation, animation wrapper, newsletter modal) into the initial bundle, and the App Router runtime ships its standard shared chunks. The page is otherwise static; much of the interactive UI is below the fold or only needed after a delay.

The `noModule` polyfills chunk is correctly excluded from the modern path. It is included in the raw 710 KB figure only for completeness; the operative number is 597 KB.

## Recommended fix

Start with measurement, then split the client boundary. Do not remove the framework.

```js
// next.config.mjs
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  // ...
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
```

```tsx
// app/(marketing)/newsletter-modal-loader.tsx
'use client';

import dynamic from 'next/dynamic';

// The modal is delayed by 5 s in the current code; it does not need to be
// in the initial layout chunk.
export const NewsletterModal = dynamic(() => import('./newsletter-modal'), {
  ssr: false,
  loading: () => null,
});
```

Then:

1. Move below-the-fold animation wrappers behind `dynamic()` or render them as Server Components where no state is needed.
2. Check whether `framer-motion` is used only for entrance animations; if so, replace those with CSS transitions for the initial viewport.
3. Keep `next/font` self-hosted; do not add another font runtime.
4. Re-run the analyzer after each change and compare the **modern-path** total, not the raw script-tag count.

`optimizePackageImports` can help with barrel imports, but it will not remove React/Next runtime bytes. Do not expect it to solve the bulk of this finding.

## Why this approach

I rejected removing the App Router or replacing the framework: the shared runtime is the cost of the current architecture, and a migration would exceed the problem. I also rejected a blanket “remove animations” recommendation; that is a product change. Lazy-loading delayed/below-the-fold client components is lower risk and directly targets the initial payload.

## Verification

```bash
ANALYZE=true npm run build
# Compare the client chunk list before/after.

# Recompute the homepage modern-path total:
curl -sS https://www.cynbit.in/ \
  | grep -oE 'src="/_next/static/[^"]+\.js"' \
  | sed -E 's/src="([^"]+)"/\1/' \
  | sort -u \
  | while read -r u; do
      curl -sS --compressed -o /tmp/chunk.js "https://www.cynbit.in$u"
      printf '%s %s\n' "$(stat -c%s /tmp/chunk.js)" "$u"
    done \
  | awk '{s+=$1} END {print s " decoded bytes"}'
```

Target a measurable reduction in the 597 KB modern-path total, not just a lower compressed number. A 15–25% reduction is realistic from lazy-loading delayed UI and trimming animation code; a 50% reduction would require a more invasive component split.

## Effort and risk of change

- **Effort:** 2–4 days including measurement and regression testing.
- **Risk:** Medium. Dynamic imports can change hydration timing, cause layout shift if a placeholder is missing, or break the delayed modal. Test on a throttled mobile profile and verify the contact/newsletter interactions still work.
