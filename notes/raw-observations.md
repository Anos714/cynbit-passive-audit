# Raw observations

Collected 2026-10-22, 13:04–13:23 UTC. This file is the working log; the individual capture files are the source of truth.

## Request log

All requests were anonymous and sequential. No POST, no form submission.

| UTC | Request | Result | Saved as |
|---|---|---|---|
| 13:04:26 | `GET https://cynbit.in/` | `307` → `https://www.cynbit.in/` | `headers/apex_run*.txt` (later runs) |
| 13:04:26 | `HEAD https://cynbit.in/` | `307` | transcript only |
| 13:04:36 | `GET https://www.cynbit.in/` | `200`, `x-vercel-cache: HIT` | `headers/home_run*.txt` |
| 13:04:36 | `GET /robots.txt` | `200`, `age: 512071` | `headers/robots.txt`, `raw/robots.txt` |
| 13:04:38 | `GET /sitemap.xml` | `200`, `x-vercel-cache: MISS`, `age: 0` | `headers/sitemap.xml`, `raw/sitemap.xml` |
| 13:04:56 | `GET /this-page-should-not-exist-xyz` | `404`, `x-next-error-status: 404` | `headers/404.txt`, `raw/404.html` |
| 13:04:59 | `OPTIONS /` | `204` | `headers/options_home.txt` |
| 13:05–13:07 | 3 × `GET` each: `/`, `/contact`, `/careers`, `/services`, `/bitelevate` | `200` each | `headers/*_run*.txt`, `raw/*_run1.html` (runs 2–3 were byte-identical and are not retained), `timings/pages.csv` |
| 13:07–13:12 | 16 homepage JS + 2 CSS + contact page JS | `200` each | `assets/`, `headers/assets/`, `timings/assets.csv` |
| 13:18:19 | `GET .../webpack-13fd2c27c7c4c378.js.map` | `403`, `x-robots-tag: noindex` | `headers/source_map.txt` |
| 13:18:23 | `GET /` with `If-None-Match: W/"eb276f..."` | `304` | `headers/conditional_home.txt` |
| 13:18:26–13:18:32 | 3 × `GET https://cynbit.in/` | `307` each | `headers/apex_run1..3.txt` |
| 13:19 | TLS handshake + certificate reads | TLS 1.3, verify 0 | `tls/README.md` |
| 13:19 | DNS A-record resolution | 216.198.79.65 / 64.29.17.65 / 216.198.79.1 | `tls/README.md` |
| 13:20–13:22 | Warm-connection timing samples (`/`, `/careers`) | `200` | `timings/warm.csv` |
| 13:23 | Headless Firefox screenshot attempt | no file produced (default profile was locked); a later retry with a fresh profile succeeded | `screenshots/README.md` |

Approximate total: **55 HTTP requests over 19 minutes**. The three-run timing samples are bursts of three with 3-second spacing; there are no concurrent requests. The screenshot retry happened later and is not part of this window or the timing sample.

## Host and redirect behavior

Apex:

```http
HTTP/2 307
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
date: Thu, 22 Oct 2026 13:18:26 GMT
location: https://www.cynbit.in/
server: Vercel
strict-transport-security: max-age=63072000
x-vercel-id: bom1::6r5xv-1792675106932-752c04d9e444
```

`http://cynbit.in/` returned a single `308 Permanent Redirect` to `https://cynbit.in/` with `server: Vercel` and a `Refresh: 0;url=https://cynbit.in/` header. No `www` canonical link was found in the homepage HTML.

## Security headers (home)

```http
HTTP/2 200
access-control-allow-origin: *
age: 1480440
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-encoding: br
content-type: text/html; charset=utf-8
date: Thu, 22 Oct 2026 13:06:26 GMT
etag: W/"eb276f06e2d113b385ff2f2f24041046"
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-matched-path: /
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: HIT
x-vercel-id: bom1::zzcw6-1792674386924-0e1ee8d6a08c
```

Absent on all five pages: CSP, XCTO, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP, CORP. No `Set-Cookie` on any response.

## Cache status

| Route | Cache-Control | Edge | Age |
|---|---|---|---|
| `/` | `public, max-age=0, must-revalidate` | HIT | 1,480,440 s |
| `/contact` | `public, max-age=0, must-revalidate` | HIT | 34,901 s |
| `/careers` | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0 |
| `/services` | `public, max-age=0, must-revalidate` | HIT | 1,460,076 s |
| `/bitelevate` | `public, max-age=0, must-revalidate` | HIT | 429,065 s |
| `robots.txt` | `public, max-age=0, must-revalidate` | HIT | 512,071 s |
| `sitemap.xml` | `public, max-age=0, must-revalidate` | MISS | 0 |
| Hashed JS/CSS | `public, max-age=31536000, immutable` | HIT | n/a |

Conditional request:

```http
HTTP/2 304
cache-control: public, max-age=0, must-revalidate
date: Thu, 22 Oct 2026 13:18:23 GMT
server: Vercel
x-vercel-cache: HIT
```

## Timings

Cold-connection runs (`time_starttransfer`, includes TLS):

| Page | Run 1 | Run 2 | Run 3 | Median | TLS at run 1 |
|---|---:|---:|---:|---:|---:|
| `/` | 2.529 | 3.271 | 2.928 | 2.928 | 0.985 |
| `/contact` | 3.506 | 1.036 | 0.405 | 1.036 | 1.834 |
| `/careers` | 1.299 | 0.829 | 0.823 | 0.829 | 0.150 |
| `/services` | 1.082 | 0.963 | 0.599 | 0.963 | 0.581 |
| `/bitelevate` | 0.261 | 0.982 | 0.262 | 0.262 | 0.149 |

Warm connection (reused):

```text
home    ttfb 0.719 s  total 0.721 s
home    ttfb 0.581 s  total 0.583 s
careers ttfb 1.738 s  total 1.987 s
careers ttfb 1.108 s  total 1.302 s
```

## Client bundle inventory

Homepage scripts (16; one `noModule` polyfill):

```text
1255-eae4096fb21f1304.js                 173,892 B decoded
4bd1b696-100b9d70ed4e49c1.js             173,025 B
5563-f2fb65d9a5ac2236.js                 127,487 B
polyfills-42372ed130431b0a.js            112,594 B  noModule
app/(marketing)/page-786d...js            43,289 B
app/(marketing)/layout-98cf...js          26,611 B
1356-2ed480e29f4f7933.js                  13,604 B
app/layout-0a45...js                       9,006 B
2619-04bc32f026a0d946.js                   8,564 B
4773-f4ec9607d8ab92ce.js                   5,990 B
app/error-8e28...js                        4,994 B
webpack-13fd2c27c7c4c378.js                4,225 B
app/not-found-6bdc...js                    3,512 B
app/global-error-2ee8...js                 2,341 B
main-app-0ee650784ad95c4e.js                 527 B
app/(marketing)/template-a9d5...js            430 B
```

Modern path total: **597,497 B decoded / 186,310 B Brotli**. All 16 including polyfills: **710,091 B / 227,653 B**. CSS: **181,212 B decoded / 25,695 B Brotli**.

Contact-only chunk: `app/(marketing)/contact/page-c119...js`, **24,534 B decoded / 6,284 B transfer**.

All assets: `cache-control: public, max-age=31536000, immutable`, `content-encoding: br`, `x-vercel-cache: HIT`.

## Bundle search

Searched all downloaded chunks for:

```text
/api/  /graphql  /v1  fetch(  axios  localStorage  sessionStorage
createServerReference  $ACTION_  NEXT_PUBLIC_  process.env.
sk_live  pk_live  AIza  eyJ  Bearer
```

Results:

- No `/api/`, `/graphql`, or `/v1` strings.
- No `NEXT_PUBLIC_*` or `process.env.*` names.
- No cloud keys, JWTs, or bearer tokens.
- `localStorage` appears twice, both around `cynbit_newsletter_seen` (modal suppression).
- Two `createServerReference` calls: `submitInquiry` and `subscribeToNewsletter`.
- Third-party origins: `googletagmanager.com`, `fonts.googleapis.com`, `vercel.live`, plus social links.

## Form details

Contact form fields: `fullName`, `email`, `company`, `industry`, `message`. `required` on fullName, email, message. No `action` attribute. Client handler calls the Server Action and branches on `{ success }`. Newsletter modal calls `subscribeToNewsletter`.

## Sitemap

82 URLs. 16 static URLs share `2026-10-22T13:04:38.470Z` (2) or `...471Z` (14). Blog/case-study entries have older dates (for example `2026-05-20T09:19:43.853Z`). `sitemap.xml` response has `date: 13:04:39`, `x-vercel-cache: MISS`, `age: 0`.

## Source map and 404

Source map: `403`, `content-type: text/plain`, `cache-control: no-store`, `x-matched-path: /_next/static/not-found.txt`, `x-robots-tag: noindex`.

404: real `404`, custom HTML, `content-encoding: br`, `x-next-error-status: 404`, `x-vercel-cache: HIT`, `age: 574663`.

## TLS and DNS

See [`tls/README.md`](../evidence/tls/README.md). Summary: separate Let's Encrypt certificates for apex and www, both verify; `www` negotiated TLS 1.3 with `TLS_AES_128_GCM_SHA256`; A records 216.198.79.65 / 64.29.17.65 for www and 216.198.79.1 for apex.

## Redaction note

Public business email addresses and phone numbers embedded in the captured HTML and JavaScript were replaced with equal-length placeholders before committing, so the decoded byte counts in the report still match the captured files. The redaction does not affect any finding: no finding relies on contact details. Placeholder addresses such as `alex@example.com` in form markup were left as-is because they are sample input, not real contact data.

## Capture normalization note

The header captures originally contained CRLF line endings and a trailing space after the HTTP status line (for example, `HTTP/2 200 ` after the reason phrase). They were normalized to LF and trailing whitespace was stripped before commit so the repository passes `git diff --check`. Header names and values, ordering, and blank-line separation are unchanged.
