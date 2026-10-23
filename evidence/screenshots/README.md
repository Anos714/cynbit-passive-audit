# Screenshots

| File | What it shows | Capture |
|---|---|---|
| [`home-response-headers.png`](home-response-headers.png) | Firefox DevTools → Network → Headers for `https://www.cynbit.in/`. `strict-transport-security: max-age=63072000` is present; `content-security-policy`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, and `x-frame-options` are absent. | 1920 × 1077, 2026-10-22 21:02 IST |
| [`careers-response-headers.png`](careers-response-headers.png) | Same view for `https://www.cynbit.in/careers`. `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, `x-vercel-cache: MISS`, `age: 0`, `x-powered-by: Next.js`. A `Referrer-Policy` value appears only in the `103 Early Hints` block, not in the final response. | 1920 × 1080, 2026-10-22 21:04 IST |
| [`homepage-1440x1000.png`](homepage-1440x1000.png) | Rendered homepage, for context only. | Headless Firefox 156, 1440 × 1000, 2026-10-22 |

The two DevTools captures were taken after the 13:04–13:23 UTC measurement
window closed. Security and cache headers match the text captures in
[`../headers/`](../headers/); the homepage `age` is larger because the
screenshot was taken later. These images make the headers visible without a
terminal.

Command for the rendered page:

```bash
firefox --headless --no-remote \
  --profile "$(mktemp -d)" \
  --window-size=1440,1000 \
  --screenshot evidence/screenshots/homepage-1440x1000.png \
  https://www.cynbit.in/
```

The first headless attempt used the default profile and produced no file,
because that profile was already open in a running browser. A throwaway
`--profile` fixed it.

`/careers` and `/contact` fade their content in with client-side animation after
load, so the headless screenshot fires before the content is visible. The
DevTools captures above cover `/careers`; header and timing evidence is in
[`../headers/`](../headers/) and [`../timings/`](../timings/).

These images are context, not proof. Every claim in the report is backed by a
text capture that can be diffed.
