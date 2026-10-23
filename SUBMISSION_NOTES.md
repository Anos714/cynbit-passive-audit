# Submission notes

Long form of the answer for the candidate portal: repository URL plus technical
setup notes.

## Repository

https://github.com/Anos714/cynbit-passive-audit

## What this is

A passive, read-only review of the publicly observable backend and delivery
configuration of `cynbit.in`: response headers, caching and rendering model, API
surface exposed in client bundles, TLS posture, and measured page performance.
Nine findings, each with raw evidence and a concrete fix.

## Where to start

1. [`README.md`](README.md): summary, findings table, what the site does well.
2. [`findings/`](findings/): one file per finding; every claim links to a capture.
3. [`docs/05-recommendations-roadmap.md`](docs/05-recommendations-roadmap.md):
   what to fix first and what each fix costs.

## Setup

Documentation only. No build step, no dependencies, no services required.

- Markdown renders on GitHub; the architecture diagram is Mermaid, also rendered
  by GitHub.
- Snippets under [`snippets/`](snippets/) are TypeScript/Next.js reference code
  for reading. They are not wired into a build.
- Captures under [`evidence/`](evidence/) are plain text, HTML, CSV, and the bundle manifest.

## Method

All requests were anonymous `GET`/`HEAD` against publicly linked pages, at a
normal browsing rate: 52 requests over 19 minutes, sequential, no concurrency.
No scanning, fuzzing, injection, authentication attempt, form submission, load
test, or access to `/api/`, `/admin/`, or `/portal/` was performed.

See [`docs/00-scope-and-methodology.md`](docs/00-scope-and-methodology.md) for the
full allowed/forbidden list and the request log.

## Tools

| Tool | Use |
|---|---|
| `curl` | headers, timings, bundle downloads, conditional requests |
| `openssl s_client` | TLS handshake and certificate inspection (port 443 only) |
| `getent ahostsv4` | public A-record resolution |
| Manual source review | Server Action discovery, credential storage, third-party origins |

## Time spent

| Phase | Approx. |
|---|---|
| Capture and bundle download | 1.5 h |
| Analysis and triage | 2.5 h |
| Writing and snippets | 3 h |

## What authorised access would add

- Confirm server-side validation and throttling on `submitInquiry` and
  `subscribeToNewsletter` (currently a labelled hypothesis, SEC-04).
- Verify authentication and authorisation on `/portal/` and `/admin/`.
- Review the rendering trigger on `/careers` and the query behind it.

None of these were attempted, because each requires access the brief did not
grant.
