# Screenshots

| File | Page | Capture |
|---|---|---|
| [`homepage-1440x1000.png`](homepage-1440x1000.png) | `https://www.cynbit.in/` | Headless Firefox 156, 1440 × 1000, 2026-10-22 |

Command used:

```bash
firefox --headless --no-remote \
  --profile "$(mktemp -d)" \
  --window-size=1440,1000 \
  --screenshot evidence/screenshots/homepage-1440x1000.png \
  https://www.cynbit.in/
```

The first attempt used the default profile and produced no file, because that
profile was already open in a running browser. A throwaway `--profile` fixed it.

`/careers` and `/contact` are not captured here: both fade their content in with
client-side animation after load, and the headless screenshot fires before the
content becomes visible. Header and timing evidence for those routes is in
[`../headers/`](../headers/) and [`../timings/`](../timings/), which is what the
findings actually cite.

These images are context, not proof. Every claim in the report is backed by a
text capture that can be diffed.
