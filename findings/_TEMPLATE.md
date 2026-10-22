# <ID>: <Title>

| Field | Value |
|---|---|
| Severity | **Critical / High / Medium / Low / Info** |
| Confidence | **Confirmed / Strongly inferred / Hypothesis** |
| Area | <security / performance / caching / API> |
| Affected URL | `<URL>` |
| Date | 2026-10-22 |
| Evidence | `evidence/headers/<capture>.txt`, `evidence/raw/<capture>.html` |

## What I observed

Facts only. Quote headers, body lines, sizes, or timings. No adjectives. Link every capture.

```http
<paste exact response lines here>
```

## Why it matters

The concrete consequence for a user or the business. State the precondition. If the impact is theoretical, say so and rate it accordingly.

## Root cause

The design/default that produces it. Label inferred causes:

- **Confirmed:** visible in the response.
- **Strongly inferred:** consistent with several captures and the framework behavior.
- **Hypothesis:** requires source/config access to confirm.

## Recommended fix

Real code or config for the observed stack. Do not recommend a rewrite.

```ts
// minimal, syntactically valid example
```

## Why this approach

The alternative you rejected and why. Include the trade-off, not just the benefit.

## Verification

A command or test that proves the fix worked.

```bash
curl -sSI https://www.cynbit.in/ | grep -i <header>
```

## Effort and risk of change

- **Effort:** <hours/days>
- **Risk:** <Low/Medium/High + what could break>
