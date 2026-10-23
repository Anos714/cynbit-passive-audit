# SEC-04: Two public Server Actions, abuse controls unverified

| Field | Value |
|---|---|
| Severity | **Info** (would become High if throttling and validation are both absent) |
| Confidence | **Confirmed** (action IDs) / **Hypothesis** (transport, abuse controls) |
| Area | Authentication / input validation / abuse resistance |
| Affected URL | `/contact` (`submitInquiry`), all marketing pages (`subscribeToNewsletter`) |
| Date | 2026-10-22 |
| Evidence | [action extracts](../../evidence/assets/extracts/server-actions.txt), [bundle manifest](../../evidence/assets/MANIFEST.csv), [API surface](../../docs/02-api-surface.md) |

## What I observed

Two Next.js Server Actions are referenced in public JavaScript. Both names and
IDs are readable in the downloaded bundles:

```js
// contact page chunk
createServerReference("40abb1a98c0be9294b518c6ca84ffcc8f63f3a5849",
  callServer, undefined, findSourceMapURL, "submitInquiry");

// marketing layout chunk (newsletter modal)
createServerReference("404e55971a25359df792b3be859e08deff64cc9a32",
  callServer, undefined, findSourceMapURL, "subscribeToNewsletter");
```

The contact form has no `action` attribute, no CSRF token, and no application-level
validation attributes beyond `required` and `type="email"`:

```html
<form class="space-y-6">
  <input name="fullName" required type="text">
  <input name="email" required type="email">
  <input name="company" type="text">
  <input name="industry" type="text">
  <textarea name="message" required rows="5"></textarea>
</form>
```

**Neither action was invoked.** Submitting would write to a live business system,
which is outside the passive scope of this assessment. Everything below is
therefore framed as a question with a recommended answer, not as a confirmed
defect.

## Why it matters

Server Actions are same-origin `POST` requests with a stable, public action ID.
That is by design: the ID is not a secret, and its presence is not a
vulnerability. But it does mean the endpoint is reachable by anything that can
read the bundle, with no page load and no browser required.

Two controls decide whether that matters:

1. **Input validation.** The client constrains length and format only through
   `required`/`type=email`. If the action spreads `Object.fromEntries(formData)`
   into a database call or a mail template, an extra POST field becomes an extra
   column or an extra header. This is the mass-assignment shape, and `FormData`
   makes it easy to introduce by accident.
2. **Abuse.** A public form that writes to a mailbox or CRM is a spam target.
   Without throttling, a script can fill the sales inbox or burn a third-party
   API quota. The cost is operational: real leads get lost in noise.

Next.js 14+ compares `Origin` against `Host` for Server Actions, which blocks the
classic cross-site form post. That is CSRF protection, not abuse protection; a
scripted client sets its own headers and is unaffected.

The newsletter action has the same shape and is reachable from every marketing
page, so a single throttle policy should cover both.

## Root cause

**Strongly inferred:** Server Actions invite putting the mutation inline in the
component file, next to the form. That colocates the handler with the UI and makes
it easy to skip the validation and throttling layers that would normally sit in a
route handler.

## Recommended fix

Three controls, in the order I would ship them:

**1. Strict server-side schema; only known fields are read.**

```ts
// app/actions/submit-inquiry.ts
"use server";

import { z } from "zod";

const Inquiry = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  company: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(5000),
}).strict(); // no pass-through fields

export async function submitInquiry(formData: FormData) {
  // Read known fields explicitly. Do not spread Object.fromEntries(formData):
  // Server Actions also carry framework fields such as $ACTION_ID_*.
  const parsed = Inquiry.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    industry: formData.get("industry") || undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) return { success: false, error: "VALIDATION" };
  // ... send / persist using parsed.data only
}
```

Full schema: [`snippets/lib/inquiry-schema.ts`](../../snippets/lib/inquiry-schema.ts).

**2. Throttle per IP and per email domain.** Five submissions per ten minutes per
IP, plus a per-address cap so one inbox cannot be flooded from many IPs.

```ts
// middleware.ts (excerpt)
const key = `inquiry:${req.ip}`;
// increment in Redis/KV; above the limit return 429 with Retry-After
```

Reference: [`snippets/lib/rate-limit.ts`](../../snippets/lib/rate-limit.ts).

**3. Add a honeypot and a minimum time-on-form check.** Together they stop most
bots without a captcha. Add Turnstile only if abuse continues, since a captcha costs
real conversions.

**Why this order:** validation prevents bad data, throttling prevents volume, the
honeypot prevents the cheap bots. A captcha first would hurt genuine leads before
the cheaper controls are exhausted.

## Verification (requires authorisation)

1. Submit once with a controlled address; confirm only the expected fields arrive.
2. Submit six times in ten minutes from one IP; expect `429` on the sixth.
3. POST an extra field (`role=admin`) and confirm it is rejected, not stored.
4. POST with a foreign `Origin` and confirm the framework rejects it.

Each step is active and must not be run without explicit permission.

## Effort and risk

- **Effort:** 2–4 h for schema + throttle; 1 h for the honeypot
- **Risk:** Low. The main risk is a honeypot that autofill fills, silently blocking
  real users. Hide it with CSS rather than `display:none` alone, and test with a
  password manager.
