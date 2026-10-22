# Client bundles — manifest and extracts

The originals are **not committed**. They are minified third-party build output
(React/Next.js runtime, Tailwind CSS), they are reproducible in one `curl` each,
and shipping 916 KB of someone else's compiled code adds noise to the repository
without adding evidence.

What is kept instead:

| Artefact | Purpose |
|---|---|
| [`MANIFEST.csv`](MANIFEST.csv) | Every bundle: decoded size, Brotli size, SHA-256, cache policy |
| [`extracts/server-actions.txt`](extracts/server-actions.txt) | The exact lines that evidence SEC-04 |
| [`../headers/assets/`](../headers/assets/) | One response-header capture per bundle |
| [`../timings/assets.csv`](../timings/assets.csv) | Transfer size and TTFB measured at download time |

## Why this is enough

- The **597,497-byte modern-path total** in PERF-01 is the sum of 15
  `decoded_bytes` values in the manifest. Anyone can add them up.
- The **Server Action references** in SEC-04 are quoted verbatim in the extract.
  The surrounding code is framework boilerplate and proves nothing further.
- The **cache policy** claim is in the header captures, not in the bundle bodies.
- The **absence of secrets** was established by searching the bundles; the search
  patterns are recorded in [`../../notes/raw-observations.md`](../../notes/raw-observations.md).

## Reproducing a bundle

```bash
BASE=https://www.cynbit.in
curl -sS --compressed "$BASE/_next/static/chunks/4bd1b696-100b9d70ed4e49c1.js" \
  -o chunk.js
wc -c chunk.js          # 173025
sha256sum chunk.js      # 5421e13a91a9389517b66179f3b4b5eaa0d95245438066d4d7b19ac30aeb809b
```

The hash will only match while this deployment is live — Next.js content-hashes
chunk filenames, so a redeploy produces new names and new hashes. That is expected
and is why the manifest records the observed deployment rather than a stable URL.

## Caveat

These are third-party files served publicly by the site, not authored here. The
manifest and extracts exist so the report's size and endpoint claims remain
checkable without redistributing the bundles themselves.
