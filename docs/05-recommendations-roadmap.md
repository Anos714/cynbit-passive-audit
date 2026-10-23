# 05: Recommendations and roadmap

Sequenced by impact per unit of effort. "Now" items are small, reversible config changes. "Next" items need a code change and a test. "Later" items depend on an inventory or a product decision.

## Now

| # | Action | Fixes | Effort | Impact | Risk |
|---|---|---|---|---|---|
| 1 | Add the non-CSP header baseline: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP/CORP; set `poweredByHeader: false` | SEC-01 | 1–2 h | Medium | Low; verify embedded content and OAuth popups before COOP |
| 2 | Ship CSP in **Report-Only** on all HTML; collect violations for one week | SEC-01 | 2–4 h | Medium | Low; no enforcement yet |
| 3 | Make `/careers` statically cached or ISR (`revalidate = 300`) with `s-maxage` + `stale-while-revalidate` | PERF-03 | 2–4 h | Medium | Low–Medium; job edits may take up to 5 min to appear |
| 4 | Set an explicit HTML cache policy that matches the rendering model: short browser `max-age`, longer `s-maxage`, `stale-while-revalidate` | PERF-02 | 1–3 h | Medium | Medium; stale copy if content changes outside a deploy |
| 5 | Replace the Google Fonts stylesheet with a self-hosted Material Symbols subset, or add `preconnect` if it stays | PERF-05 | 1–3 h | Low | Low; icon coverage must be checked |

## Next

| # | Action | Fixes | Effort | Impact | Risk |
|---|---|---|---|---|---|
| 6 | Enforce CSP with a per-request nonce on dynamic routes; use hashes or a build-time policy for static routes | SEC-01 | 1–2 d | Medium | **High** if applied blindly: nonce generation can force static pages to render dynamically and lose edge caching |
| 7 | Run `@next/bundle-analyzer`; lazy-load below-the-fold client sections; remove animation libraries from the initial layout where possible | PERF-01 | 2–4 d | Medium | Medium; visual regressions and hydration edge cases |
| 8 | Add a server-side rate limit to both Server Actions with `429` + `Retry-After` (see snippet) | [SEC-04](../findings/security/SEC-04-server-actions-abuse-surface.md) (abuse half) | 4–8 h | Medium | Low–Medium; NAT/shared-IP false positives |
| 9 | Add strict server-side schema validation to `submitInquiry` and `subscribeToNewsletter` | [SEC-04](../findings/security/SEC-04-server-actions-abuse-surface.md) (validation half) | 2–4 h | Medium | Low; must preserve the existing field names |
| 10 | Add `includeSubDomains` to HSTS, then submit to the preload list after a subdomain inventory | SEC-02 | 1 h + waiting period | Low | **High** if any subdomain is HTTP-only; can make it unreachable |

## Later

| # | Action | Fixes | Effort | Impact | Risk |
|---|---|---|---|---|---|
| 11 | Replace request-time `lastmod` with per-entry `updatedAt` from the CMS/content source; add ISR to `sitemap.xml` | PERF-04 | 2–4 h | Low | Low |
| 12 | Add a documented vulnerability-disclosure contact (`security.txt`) and an on-call mailbox | Process | 1 h | Low | Low |
| 13 | Re-measure TTFB and cache hit ratio from a real-user monitoring source, not a single `curl` host | Measurement | 1 d | n/a | Low |

## Trade-offs

1. **Nonce CSP vs static edge caching.** A per-request nonce must appear in the HTML. For a fully prerendered page, that either forces dynamic rendering or requires a different policy (hashes or a strict `script-src` with build-time hashes). For this site, enforcing nonce CSP on every route could trade a security improvement for a measurable TTFB regression. The pragmatic path is report-only first, then enforce on the two dynamic/form routes and use hashes on static marketing pages.
2. **Longer `s-maxage` vs content freshness.** The homepage HTML was 17.1 days old at the edge. Extending shared caching reduces origin work but makes an urgent content change (phone number, job closure, legal copy) wait for a purge. Pair any longer TTL with on-demand revalidation or a deploy hook.
3. **`includeSubDomains` vs subdomain availability.** HSTS with `includeSubDomains` is stronger, but if any internal or legacy subdomain still serves HTTP, browsers will refuse to downgrade and may make it unreachable. Inventory first; do not enable it blind.
4. **Removing client JavaScript vs interaction quality.** The page uses client components for navigation, animation, and the newsletter modal. Cutting bundle size by removing those can change the experience. Measure with the bundle analyzer and lazy-load below-the-fold components before deleting features.
5. **IP rate limiting vs shared NAT.** A 5-per-10-minute IP limit can block a whole office or a university NAT. Combine per-IP limits with per-email/per-domain limits, and return a clear `Retry-After` rather than a generic failure.

## Implementation order that keeps the site shippable

1. Header baseline + CSP report-only (no user-visible change).
2. `/careers` caching + HTML cache policy (measurable repeat-visit win).
3. Self-host icons (removes a third-party render-blocking request).
4. Bundle analysis and lazy loading (largest code change; do after measurement).
5. CSP enforcement on dynamic routes; HSTS preload only after inventory.

## Snippets

- [Nonce CSP middleware](../snippets/middleware.ts)
- [Nonce-aware GA loader](../snippets/analytics.tsx)
- [Rate limiter](../snippets/lib/rate-limit.ts)
- [Route handler with 429 + `Retry-After`](../snippets/app/api/inquiry/route.ts)
- [Strict inquiry schema](../snippets/lib/inquiry-schema.ts)
- [Error envelope with correlation ID](../snippets/lib/errors.ts)
- [Static/ISR sitemap](../snippets/app/sitemap.ts)
