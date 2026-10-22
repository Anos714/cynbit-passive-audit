# PERF-05 — Render-blocking Google Fonts CSS and early GTM preload

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Confirmed** (request order); **Hypothesis** (magnitude of impact) |
| Area | Performance / third-party delivery |
| Affected URL | `/` (and shared marketing layout) |
| Date | 2026-10-22 |
| Evidence | [home HTML](../../evidence/raw/home_run1.html) |

## What I observed

The homepage `<head>` includes a stylesheet from Google Fonts and a preload for Google Tag Manager:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"/>
<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-LK6CQWCWX0" as="script"/>
```

The page also preloads two self-hosted WOFF2 fonts and `/logo.svg`. There is no `preconnect` or `dns-prefetch` for `fonts.googleapis.com`, `fonts.gstatic.com`, or `googletagmanager.com` in the captured HTML.

## Why it matters

A stylesheet in the document head is render-blocking: the browser must fetch the CSS from a third-party origin, then discover and fetch the font files from `fonts.gstatic.com`, before it can finish the first paint. The GTM preload competes for early bandwidth even though analytics is not needed for the initial render.

The exact LCP/FCP impact was not measured. The request relationship is confirmed; the size of the penalty depends on the user's network and cache state.

## Root cause

**Strongly inferred:** the Material Symbols icon font is loaded from Google Fonts as a stylesheet, while the body fonts use `next/font` (the two self-hosted `.woff2` preloads). GTM is preloaded by the analytics integration in the root layout.

## Recommended fix

Self-host the icon subset:

```tsx
// app/fonts.ts
import localFont from 'next/font/local';

export const materialSymbols = localFont({
  src: './fonts/material-symbols-outlined.woff2',
  variable: '--font-material-symbols',
  display: 'swap',
  preload: true,
});
```

Add the WOFF2 file to the repository, apply `materialSymbols.variable` on `<html>`, and replace the Google Fonts `<link>` with CSS that uses `font-family: var(--font-material-symbols)`. Subset the font to the icons actually used; the current query requests the full variable axis.

For analytics, keep the loader after interaction/hydration:

```tsx
import Script from 'next/script';

<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
  strategy="afterInteractive"
/>
```

If the external font stays for now, at least add resource hints:

```html
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
```

That reduces DNS/TLS cost but does not remove the third-party dependency or the render-blocking request.

## Why this approach

I rejected simply adding `preconnect` as the final fix. It is a cheap mitigation, but self-hosting removes an entire cross-origin round trip and makes the icon font subject to the same immutable caching as the rest of the assets. I also rejected removing analytics; the site owner likely needs it. Deferring it until after interaction is the lower-risk change.

## Verification

```bash
# The Google Fonts stylesheet should disappear from the HTML.
curl -sS https://www.cynbit.in/ | grep -i 'fonts.googleapis.com' || echo 'no external font css'

# The GTM script should no longer be preloaded in the head.
curl -sS https://www.cynbit.in/ | grep -i 'preload.*googletagmanager' || echo 'no gtm preload'
```

Use a browser performance waterfall to confirm the render-blocking request is gone and that icons still render. Test the contact and careers pages, which use the same icon set.

## Effort and risk of change

- **Effort:** 1–3 hours for self-hosting and icon coverage checks; 30 minutes for the resource-hint interim fix.
- **Risk:** Low. The main risk is missing glyphs after subsetting. Keep the full font as a fallback until the subset is verified on every page.
