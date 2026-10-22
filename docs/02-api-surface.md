# 02: API surface

## Result

No public REST, GraphQL, or versioned JSON API was found in the downloaded client code. The forms use Next.js **Server Actions**, which are same-origin POSTs to the current page route with a `Next-Action` header. The action IDs and names ship in public JavaScript; that is normal for Server Actions and is not a secret leak by itself.

| Surface | Evidence | Method | Confidence |
|---|---|---|---|
| HTML routes `/`, `/contact`, `/careers`, `/services`, `/bitelevate` | [headers](../evidence/headers/) | `GET` | Confirmed |
| `submitInquiry` Server Action | `createServerReference("40abb1a98c0be9294b518c6ca84ffcc8f63f3a5849", …, "submitInquiry")` in [action extracts](../evidence/assets/extracts/server-actions.txt) | Same-origin POST to the contact page with `Next-Action` header (framework behavior); **not invoked** | Confirmed ID; **Strongly inferred** transport |
| `subscribeToNewsletter` Server Action | `createServerReference("404e55971a25359df792b3be859e08deff64cc9a32", …, "subscribeToNewsletter")` in [action extracts](../evidence/assets/extracts/server-actions.txt) | Same-origin POST to the current marketing page; **not invoked** | Confirmed ID; **Strongly inferred** transport |
| `/api/*`, `/graphql`, `/v1/*` | No matches in 17 downloaded JS chunks | n/a | **Confirmed absence in downloaded code**, not a guarantee for the whole deployment |
| `/admin/`, `/portal/` | Listed in `robots.txt`; not requested | n/a | Unverified by design |

The action IDs are build-specific. They will change on redeploy; do not treat them as stable API routes.

## Contact form

Source: [contact page HTML](../evidence/raw/contact_run1.html), [action extracts](../evidence/assets/extracts/server-actions.txt).

| Property | Observed |
|---|---|
| Fields | `fullName` (text, `required`), `email` (email, `required`), `company` (text), `industry` (text), `message` (textarea, `required`, 5 rows) |
| `action` attribute | None |
| Client submit handler | `preventDefault()`, builds `FormData`, calls the `submitInquiry` Server Action |
| Client-side constraints | HTML `required` and `type=email` only; no `minlength`, `maxlength`, `pattern`, or schema object observed in the contact chunk |
| Success UI | "Inquiry Received." |
| Error UI | Generic "Something went wrong. Please try again or email us directly." |
| Server response shape | `{ success: boolean }`; the client branches on `r.success` |

The absence of client-side validation is not a vulnerability. It means the server must enforce the schema; that behavior cannot be verified without submitting the form, which the brief forbids. See [limitations](06-limitations.md).

## Newsletter form

The marketing layout injects a modal after 5 seconds and stores `cynbit_newsletter_seen` in `localStorage` to suppress repeat display. Its form calls `subscribeToNewsletter`. The modal code and action name are in the [action extracts](../evidence/assets/extracts/server-actions.txt).

## Client-side data handling

| Check | Result |
|---|---|
| API base URLs / `fetch` to `/api/`, `/graphql`, `/v1` | None found |
| Hardcoded cloud keys, bearer tokens, JWTs | None found |
| `NEXT_PUBLIC_*` or `process.env.*` names in public chunks | None found |
| `localStorage` / `sessionStorage` | `localStorage` only for `cynbit_newsletter_seen`; no auth/session token |
| Next.js Server Action references | Two, listed above |
| Third-party origins referenced | `googletagmanager.com` (GA4 `G-LK6CQWCWX0`), `fonts.googleapis.com`, `vercel.live`; social links to LinkedIn/X/Instagram/Facebook |

`vercel.live` is present in framework code; it is not proof that the production page loads the Vercel toolbar. No third-party script was executed or inspected at runtime.

## Abuse-control observations

The client does not reveal a rate-limit endpoint or a retry policy. That is expected: a server-side limiter would not be visible in the browser. **Hypothesis:** the Server Actions may rely only on framework origin checks. Confirming or refuting this requires an authorised test or access to the action source. No conclusion is drawn here; the recommended control is in [snippets/rate-limit.ts](../snippets/lib/rate-limit.ts).
