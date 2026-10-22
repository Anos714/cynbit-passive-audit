# Source-map probe

The homepage references hashed chunks such as
`/_next/static/chunks/webpack-13fd2c27c7c4c378.js`. DevTools requests the matching
`webpack-13fd2c27c7c4c378.js.map` automatically when the Sources panel is opened,
so the same request was issued once.

Result: **`403 Forbidden`**, `content-type: text/plain`, `cache-control: no-store`,
body empty.

Full response headers: [`../headers/source_map.txt`](../headers/source_map.txt).

Source maps are not publicly exposed in production. This is correct and is
recorded as a positive observation in the report, not as a finding. No map was
retrieved.
