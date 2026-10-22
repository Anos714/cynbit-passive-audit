# Passive backend audit — cynbit.in

**Target:** `https://www.cynbit.in` (apex `https://cynbit.in` redirects to `www`)
**Date:** 2026-10-22 (UTC)
**Method:** anonymous GET/HEAD only; no exploitation, no load testing, no form submissions, no non-public paths.
**Platform observed:** Vercel edge + Next.js App Router.

This is a read-only review of a public marketing site. It is not a penetration test. Every statement below is tied to a capture in [`evidence/`](evidence/) or is explicitly labelled **Hypothesis**.

## Summary

The site is a statically prerendered Next.js application on Vercel. TLS, compression, static asset caching, ETag revalidation, 404 handling, and source-map protection are sound. The main gaps are browser-side hardening and cache policy, not an exposed backend: the review found no public REST or GraphQL surface, no credentials in client bundles, and no evidence of an authentication system to attack.

Nine findings: **4 Medium, 4 Low, 0 High, 0 Critical**, plus one labelled Info
item where the evidence stops short of a conclusion. The highest-value fixes are
a CSP/header baseline, reducing the 597 KB modern-path JavaScript payload, and
making the cache policy match the actual rendering model. The `/careers` route is
the only page observed bypassing the edge cache, and it costs roughly twice the
cached homepage on a warm connection.

## Findings

| ID | Finding | Severity | Confidence | Evidence |
|---|---|---|---|---|
| [SEC-01](findings/security/SEC-01-missing-security-headers.md) | No CSP and no complementary browser-isolation headers | Medium | Confirmed | [home headers](evidence/headers/home_run1.txt) |
| [SEC-02](findings/security/SEC-02-hsts-not-subdomain-complete.md) | HSTS lacks `includeSubDomains` and `preload` | Low | Confirmed | [apex headers](evidence/headers/apex_run1.txt) |
| [SEC-03](findings/security/SEC-03-wildcard-cors.md) | Wildcard CORS on HTML documents, inconsistently applied | Low | Confirmed | [home](evidence/headers/home_run1.txt), [contact](evidence/headers/contact_run1.txt) |
| [SEC-04](findings/security/SEC-04-server-actions-abuse-surface.md) | Two public Server Actions; abuse controls unverified | Info | Confirmed ID / Hypothesis controls | [extracts](evidence/assets/extracts/server-actions.txt) |
| [PERF-01](findings/performance/PERF-01-client-payload.md) | Homepage ships 597 KB of decoded JavaScript on the modern path | Medium | Confirmed | [asset sizes](evidence/timings/assets.csv) |
| [PERF-02](findings/performance/PERF-02-html-cache-revalidation.md) | Prerendered HTML revalidates on every navigation while edge copies age for days | Medium | Confirmed | [home headers](evidence/headers/home_run1.txt), [304](evidence/headers/conditional_home.txt) |
| [PERF-03](findings/performance/PERF-03-careers-uncached.md) | `/careers` is `no-store` and misses the edge cache on every request | Medium | Confirmed / Strongly inferred | [careers headers](evidence/headers/careers_run1.txt) |
| [PERF-04](findings/performance/PERF-04-sitemap-lastmod.md) | Sitemap `lastmod` is request time for 16 static URLs | Low | Confirmed | [sitemap](evidence/raw/sitemap.xml) |
| [PERF-05](findings/performance/PERF-05-third-party-render-blocking.md) | Third-party font CSS is render-blocking; GTM is preloaded before interaction | Low | Confirmed | [home HTML](evidence/raw/home_run1.html) |

Severity is scoped to the observed configuration. No authentication, payment flow, or sensitive customer data was found, so there is no basis for a Critical or High rating. The Medium findings are defense-in-depth or repeat-visit performance issues with realistic but bounded impact. See the [rubric](docs/03-security-findings.md#severity-rubric).

## What the site does correctly

1. **TLS 1.3 with valid, host-specific certificates.** `www` negotiates TLS 1.3; both `www` and apex present a Let's Encrypt certificate with a matching SAN, and both verify with return code 0. [TLS evidence](evidence/tls/README.md)
2. **HSTS is present with a two-year max-age.** `strict-transport-security: max-age=63072000` on every HTTPS response captured, including errors. [example](evidence/headers/home_run1.txt)
3. **Hashed static assets are immutable and edge-cached.** All 18 homepage JS/CSS responses returned `cache-control: public, max-age=31536000, immutable`, `content-encoding: br`, and `x-vercel-cache: HIT`. [asset timings](evidence/timings/assets.csv)
4. **ETag revalidation works.** A conditional GET with the homepage ETag returned `304` with no body. [304 capture](evidence/headers/conditional_home.txt)
5. **404 and source-map behavior is correct.** A non-existent URL returned a real `404` with a custom body; a public chunk's `.js.map` returned `403`, not the map. [404 headers](evidence/headers/404.txt), [map headers](evidence/headers/source_map.txt)
6. **No secrets or REST endpoints in the downloaded client code.** No `/api/`, `/graphql`, `/v1`, `NEXT_PUBLIC_*`, bearer tokens, or cloud keys were found in the 16 homepage chunks or the contact chunk. The only credential-like storage is a localStorage flag for a newsletter modal (`cynbit_newsletter_seen`), not a session token.

## Contents

- [Scope and methodology](docs/00-scope-and-methodology.md)
- [Architecture](docs/01-architecture.md)
- [API surface](docs/02-api-surface.md)
- [Security findings](docs/03-security-findings.md)
- [Performance findings](docs/04-performance-findings.md)
- [Recommendations and roadmap](docs/05-recommendations-roadmap.md)
- [Limitations](docs/06-limitations.md)
- [Raw observations](notes/raw-observations.md)
- [Finding template](findings/_TEMPLATE.md)

## Reproduce the headline checks

```bash
# Security header baseline
curl -sSI https://www.cynbit.in/ | grep -iE 'content-security-policy|strict-transport-security|x-content-type-options|referrer-policy|permissions-policy|x-frame-options|cross-origin'

# HTML cache policy and edge age
curl -sSI https://www.cynbit.in/ | grep -iE 'cache-control|age|x-vercel-cache|etag'

# Careers cache behavior
curl -sSI https://www.cynbit.in/careers | grep -iE 'cache-control|x-vercel-cache|age'

# Sitemap lastmod values
curl -sS https://www.cynbit.in/sitemap.xml | grep -o '<lastmod>[^<]*' | sort | uniq -c
```

## Scope note

Only publicly linked pages (`/`, `/contact`, `/careers`, `/services`, `/bitelevate`), `robots.txt`, `sitemap.xml`, a single non-existent URL, public bundle files, and one `.js.map` URL were requested. `/api/`, `/admin/`, `/portal/`, authentication, forms, and mutations were not touched. No personal data or credentials are included in this repository.
