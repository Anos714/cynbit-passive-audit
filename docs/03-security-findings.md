# 03: Security findings

## Severity rubric

The criteria are defined once in [scope and methodology](00-scope-and-methodology.md#severity-rubric). This page uses those levels and does not redefine them.

## Index

| ID | Finding | Severity | Confidence | Affected URL |
|---|---|---|---|---|
| [SEC-01](../findings/security/SEC-01-missing-security-headers.md) | No CSP and no complementary browser-isolation headers | Medium | Confirmed | All HTML routes |
| [SEC-02](../findings/security/SEC-02-hsts-not-subdomain-complete.md) | HSTS lacks `includeSubDomains` and `preload` | Low | Confirmed | `www.cynbit.in`, `cynbit.in` |
| [SEC-03](../findings/security/SEC-03-wildcard-cors.md) | Wildcard CORS on HTML documents, inconsistently applied | Low | Confirmed | `/`, `/services`; absent on `/contact`, `/careers`, `/bitelevate` |
| [SEC-04](../findings/security/SEC-04-server-actions-abuse-surface.md) | Two public Server Actions; abuse controls unverified | Info | Confirmed IDs / Hypothesis controls | `/contact`, all marketing pages |

**Distribution:** 0 Critical, 0 High, 1 Medium, 2 Low, 1 Info.

## Why there is no Critical or High

The accessible application is a marketing site. No login, payment, account, admin UI, or sensitive record was observed. The only write surfaces found are two Server Actions (contact and newsletter), and neither was invoked. Missing headers reduce defense-in-depth but do not, by themselves, give an attacker a path to data. The report does not upgrade them to High on the theoretical basis that "XSS could happen."

## Header matrix

| Header | `/` | `/contact` | `/careers` | `/services` | `/bitelevate` |
|---|---|---|---|---|---|
| `content-security-policy` | absent | absent | absent | absent | absent |
| `strict-transport-security` | `max-age=63072000` | `max-age=63072000` | `max-age=63072000` | `max-age=63072000` | `max-age=63072000` |
| `includeSubDomains` | no | no | no | no | no |
| `preload` | no | no | no | no | no |
| `x-content-type-options` | absent | absent | absent | absent | absent |
| `referrer-policy` | absent | absent | absent | absent | absent |
| `permissions-policy` | absent | absent | absent | absent | absent |
| `x-frame-options` | absent | absent | absent | absent | absent |
| `x-xss-protection` | absent | absent | absent | absent | absent |
| `cross-origin-opener-policy` | absent | absent | absent | absent | absent |
| `cross-origin-resource-policy` | absent | absent | absent | absent | absent |
| `access-control-allow-origin` | `*` | absent | absent | `*` | absent |
| `x-powered-by` | absent | `Next.js` | `Next.js` | absent | `Next.js` |
| `set-cookie` | absent | absent | absent | absent | absent |

Evidence: [`evidence/headers/`](../evidence/headers/). The table is a direct transcription of the `run1` captures; `run2`/`run3` agree on cache status and security headers. The `/careers` `103 Early Hints` response carries `Referrer-Policy`, but the final `200` does not; the matrix reflects final responses. `X-XSS-Protection` is absent and intentionally not recommended: modern browsers ignore it, and a malformed legacy filter can introduce issues. CSP is the replacement, not a revival of that header.

`x-powered-by` is inconsistent across routes, which suggests route-level header handling rather than a single global policy. It is not a finding on its own; it is context for SEC-01. `server: Vercel` and `x-vercel-id` disclose the platform and an edge/function chain; this is normal for the hosting model and is not scored as a vulnerability. The only application-framework disclosure is `x-powered-by: Next.js` on three routes, which is low-value fingerprinting and is removed by `poweredByHeader: false`. The `Vary` header does not include `Origin`, which is correct while CORS is wildcard or absent, but would need to change if an origin allowlist is introduced.

## Positive controls in the same area

- HSTS is present on every full HTTPS response, including the 404 and source-map 403 responses. The 304 revalidation was the one exception.
- No cookies are set, so there is no session cookie to mis-scope.
- Source maps are blocked (`403`) rather than publicly served.
- The 404 response is a real 404, not a soft 200.
- No client bundle contained a secret or an API token.
