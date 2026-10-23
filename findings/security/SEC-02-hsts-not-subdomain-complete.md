# SEC-02: HSTS lacks `includeSubDomains` and `preload`

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Confirmed** |
| Area | Security architecture / transport |
| Affected URL | `https://www.cynbit.in`, `https://cynbit.in` |
| Date | 2026-10-22 |
| Evidence | [apex headers](../../evidence/headers/apex_run1.txt), [home headers](../../evidence/headers/home_run1.txt), [TLS/DNS](../../evidence/tls/README.md) |

## What I observed

Every full HTTPS response captured includes HSTS, including the apex redirect and the 404; the one `304 Not Modified` revalidation omitted it ([capture](../../evidence/headers/conditional_home.txt)).

```http
strict-transport-security: max-age=63072000
```

`max-age=63072000` is 730 days (two years). The directive has no `includeSubDomains` and no `preload`. The same value is returned by both hostnames.

The apex redirect is:

```http
HTTP/2 307
location: https://www.cynbit.in/
server: Vercel
strict-transport-security: max-age=63072000
```

## Why it matters

HSTS protects a host from protocol downgrade and cookie theft over HTTP. Without `includeSubDomains`, only the exact host that sent the header is covered; a subdomain that still serves HTTP is not protected by the apex/www policy. Without `preload`, a first-time visitor who never receives the header remains vulnerable to a downgrade on that first request. The impact is bounded here because no cookies are set and the site is public, but the policy is weaker than it appears.

This is not a claim that any subdomain is insecure. No subdomain inventory or DNS enumeration was performed, and `/admin/` and `/portal/` were not contacted. The correct conclusion is that the header does not cover them, not that they are vulnerable.

## Root cause

**Strongly inferred:** the HSTS value is set in a single header rule without the optional directives, probably in Vercel project settings or `next.config`. The two-year max-age shows an intentional HSTS rollout; the missing directives look like an incomplete configuration rather than a deliberate exception.

## Recommended fix

Only after inventorying every subdomain, set:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Example Next.js config:

```js
// next.config.mjs
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

If Vercel project settings already add HSTS, do not add a second conflicting header; update the existing rule. For preload, submit the domain at <https://hstspreload.org/> only after the policy has been live long enough for the inventory to be complete.

## Why this approach

I rejected jumping straight to `preload` because removal from the preload list is slow and operationally painful, and because a single HTTP-only subdomain can become unreachable once `includeSubDomains` is enforced. I also rejected lowering `max-age`; two years is appropriate for a site that already forces HTTPS. The only missing piece is coverage, not duration.

## Verification

```bash
curl -sSI https://www.cynbit.in/ | grep -i strict-transport-security
curl -sSI https://cynbit.in/     | grep -i strict-transport-security

# Expect:
# strict-transport-security: max-age=63072000; includeSubDomains; preload
```

Check each known subdomain over HTTP and HTTPS before enabling `includeSubDomains`. A subdomain that only serves HTTP should be fixed or explicitly removed from the plan.

## Effort and risk of change

- **Effort:** about 1 hour to change the header; weeks of waiting for preload review.
- **Risk:** High if applied before the subdomain inventory. `includeSubDomains` can make an HTTP-only internal service unreachable in browsers that have seen the header. `preload` is effectively permanent on the timescale of a release.
