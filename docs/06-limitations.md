# 06 — Limitations

## What this method cannot see

1. **Server code and validation.** The contact form was not submitted and the Server Action was not invoked. Whether `submitInquiry` validates length, type, or content server-side is unknown. A strict schema is recommended, not proven missing.
2. **Rate limiting.** A server-side limiter is invisible to anonymous `GET` requests. The report labels the abuse-control concern a hypothesis and does not claim the endpoint is unthrottled.
3. **Authentication and authorization.** No login or admin surface was found or tested. `/admin/` and `/portal/` are listed in `robots.txt`; they were not requested.
4. **Data layer.** The database, CRM, email provider, and any queues are not exposed in public headers or client code. The architecture diagram stops at "data layer — not observable."
5. **Runtime vulnerabilities.** No dependency scanner, version fingerprinting, or exploit test was run. Next.js/React versions are not asserted.
6. **WAF and bot protection.** A `403` on a source map and normal 404s do not prove a WAF. No payloads were sent, so rules cannot be characterized.
7. **Real-user performance.** TTFB comes from one host on one network path. TLS setup varied by more than 2 seconds, and the warm sample is only two requests per page. Field data (CrUX/RUM) would be needed to rank pages for users.
8. **Third-party runtime behavior.** GTM, Google Fonts, and `vercel.live` were identified from HTML/bundles but not executed under a consent tool or privacy policy check. No claim is made about what those scripts collect.
9. **Redirect and edge behavior under load.** Only single requests were made; cache hit ratios and failover behavior were not measured.
10. **Subdomain inventory.** HSTS `includeSubDomains` cannot be recommended safely without knowing every subdomain. No DNS enumeration was performed beyond the two target hostnames.

## What would change the conclusions

- A successful authorised POST to `submitInquiry` with malformed and oversized input would show whether server validation exists.
- A small, authorised rate-limit test (e.g., 10 requests) would confirm or refute the abuse-control hypothesis.
- Access to the Next.js config and Server Action source would confirm the cache and header root causes.
- RUM data would replace the single-vantage TTFB numbers and could move `/careers` up or down.
- A subdomain inventory would make the HSTS recommendation safe to action.
- A rendered screenshot or Lighthouse trace would add visual/LCP evidence; the headless screenshot attempt produced no file (see [screenshots README](../evidence/screenshots/README.md)).

## What this report does not claim

- No SQL injection, XSS, SSRF, IDOR, or authentication bypass is claimed. None was tested, and a marketing site with no observed input reflection does not justify speculation.
- `/admin/` and `/portal/` are not claimed as exposed. `robots.txt` is a crawling instruction, not an access-control list.
- Missing headers do not make the site "unprotected". TLS 1.3, HSTS, Brotli, immutable assets, ETag revalidation, blocked source maps, and a real 404 are all present.
- No vendor or framework migration is recommended. The observed stack is appropriate for the workload; the findings are config and code-level.
