# 00 — Scope and methodology

## Objective

Evaluate the publicly observable backend and delivery configuration of `https://www.cynbit.in` for a Backend Developer Intern assessment. The report separates confirmed observations from inference and proposes fixes that fit the observed Next.js/Vercel stack.

## Test window and vantage point

- Date: **2026-10-22**, approximately **13:04–13:23 UTC**.
- Client: a Linux host running `curl` 8.x, OpenSSL 3.x, and Firefox headless. No browser automation profile, cookies, or authenticated session was used.
- All HTTP requests were anonymous, sequential, and made without concurrency. Timing samples used three sequential runs per page with 3-second spacing; asset downloads used 2-second spacing.
- Approximate volume: **55 HTTP requests over ~19 minutes**, averaging under 3 requests/minute. This includes timing repeats, 17 bundle downloads, one conditional request, one source-map request, and one 404 request. No request was sent to `/api/`, `/admin/`, `/portal/`, or any path not listed below.
- The exact request list is in [raw observations](../notes/raw-observations.md#request-log).

## Allowed actions actually performed

| Action | Count | Notes |
|---|---:|---|
| Anonymous `GET` to public pages | 15 | `/`, `/contact`, `/careers`, `/services`, `/bitelevate`; three runs each |
| Anonymous `GET` to public JS/CSS | 19 | 16 homepage JS + 1 contact JS + 2 CSS; response headers for each |
| `HEAD`/`GET` to `robots.txt`, `sitemap.xml` | 2 | Public crawler files |
| `GET` to one non-existent URL | 1 | `404` behavior |
| Conditional `GET` with `If-None-Match` | 1 | Homepage ETag; observed `304` |
| `GET` to one `.js.map` | 1 | Already-public chunk; observed `403` |
| TLS handshakes / DNS resolutions | 4 / 2 | No port scan; only 443 |
| `OPTIONS` to `/` | 1 | Observed `204` and CORS methods |

No POST, PUT, PATCH, or DELETE was sent. No form was submitted. No Server Action was invoked. No authentication, fuzzing, injection, directory discovery, or load test was performed.

## Forbidden actions deliberately avoided

- Port scanning, service fingerprinting, network enumeration.
- Directory/endpoint/parameter brute force (`ffuf`, `dirb`, `gobuster`).
- Injection probes, authentication attempts, session manipulation.
- Access to `/api/`, `/admin/`, `/portal/`, `.env`, backups, or other non-public paths.
- Contact-form submission or invocation of `submitInquiry` / `subscribeToNewsletter`.
- Load, stress, or concurrency testing.
- GraphQL introspection, social engineering, account creation.
- Vulnerability scanners (Nikto, sqlmap, ZAP, Nessus).

## Evidence policy

- Raw headers are stored in [`evidence/headers/`](../evidence/headers/); header names, values, and order are verbatim, with CRLF normalized to LF and trailing whitespace stripped (see [normalization note](../notes/raw-observations.md#capture-normalization-note)).
- Raw HTML, `robots.txt`, `sitemap.xml`, and the 404 body are in [`evidence/raw/`](../evidence/raw/).
- Decoded bundle files and their response headers are in [`evidence/assets/`](../evidence/assets/) and [`evidence/headers/assets/`](../evidence/headers/assets/).
- Timing CSVs are in [`evidence/timings/`](../evidence/timings/).
- TLS and DNS observations are in [`evidence/tls/README.md`](../evidence/tls/README.md).
- No cookies were set on any response. No PII, credentials, or session tokens were collected. The site's public business phone/address in JSON-LD was not reproduced because it is unnecessary for the findings.

## Measurement caveats

`curl`'s `time_starttransfer` includes DNS, TCP, and TLS setup for a new connection. The host's TLS handshakes varied from **0.15 s to 2.43 s**, which dominates cold-connect TTFB. To avoid attributing network variance to the origin, the report also computes:

```text
origin_response_after_tls = time_starttransfer - time_appconnect
```

and reports a small warm-connection sample where the same connection is reused. These are single-vantage measurements, not a synthetic benchmark. See [limitations](06-limitations.md).

## Severity rubric

| Severity | Definition used here |
|---|---|
| Critical | Confirmed compromise of confidentiality/integrity/availability with little or no precondition; or unauthenticated access to sensitive data. |
| High | Confirmed issue with a realistic path to user harm, data exposure, or sustained outage. |
| Medium | Confirmed weakness that materially weakens defense-in-depth or repeat-user performance, but has a precondition or bounded impact. |
| Low | Confirmed hardening gap or inefficiency with limited direct impact. |
| Info | Observation useful for context; not a defect on its own. |

**Distribution:** 0 Critical, 0 High, 4 Medium, 4 Low, 1 Info. A public marketing site with no login, payment, or observed sensitive endpoint does not justify a Critical/High rating for missing headers or cache tuning. That restraint is intentional.
