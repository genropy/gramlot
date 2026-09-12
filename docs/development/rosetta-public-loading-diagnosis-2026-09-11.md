# Rosetta public runtime loading diagnosis — 2026-09-11

Read-only investigation of https://rosetta.gramlot.org, prompted by fast local
Gramlot examples and slow public ones. No production configuration or application
code changed.

## Measurements

- Gramlot Python Hello World HTML: 200, about 245 ms, 1,227 bytes.
- Its recipe response: about 163 ms, 50 bytes.
- A static-import crawl from the deployed common/entry.js found 97 modules,
  870,335 uncompressed bytes, across seven discovery waves (1, 3, 27, 31, 14,
  14, 7). This is a regex-based lower-bound inventory, not a browser waterfall;
  dynamic imports, CSS and recipes are not counted.
- Six-worker HTTP crawl took 4.05 seconds. This includes crawler connection
  overhead and discovery barriers; it is NOT a measured browser rendering time.
- React entry bundle: 194,661 bytes; Vue entry bundle: 68,251 bytes. Neither
  returned a static import in the same scan. Their HTML responses were around
  170 ms. The Dockerfile runs Vite builds for both.
- Decimal module: Accept-Encoding negotiation via curl --compressed still
  downloaded all 127,787 bytes, with no Content-Encoding response header.
- Runtime responses advertise Cache-Control: no-cache, must-revalidate.
  A conditional Decimal request returned 304 in about 156 ms: caching saves
  response bodies but still requires a network round trip.
- curl supports HTTP/2; explicitly requesting it still negotiated HTTP/1.1.
- Public Hello World rendered successfully in the in-app browser with no
  captured warning/error. Browser Performance APIs were not accessible through
  the inspection surface, so no browser timing distribution is claimed.

## Attribution

The strongest evidence points to runtime delivery rather than Python recipe
execution. Gramlot Python and JS both import the same unbundled runtime and
builder. The entry waits for its imports before fetching the Python recipe.
Many requests, dependency discovery, HTTP/1.1, revalidation and lack of
compression amplify public-network latency; loopback largely hides these costs.
The tests do not isolate CPU rendering cost or establish a universal load time.
NiceGUI HTML timing alone does not constitute a complete NiceGUI asset comparison.

Rosetta backend/app.py development_cache unconditionally overwrites cache headers
on every response. Gramlot's runtime is served as individual ES modules.
The production Dockerfile builds React/Vue but has no equivalent Gramlot bundle.

## Suggested repair order

1. Produce a production Gramlot ES-module bundle/shared chunks for both authoring
   variants, keeping displayed lesson source and the editable JS laboratory intact.
2. Give runtime assets content-versioned URLs and long-lived immutable caching.
   Do not apply immutable caching to current unversioned URLs. Retain suitable
   revalidation for HTML and dynamic recipe responses.
3. Enable gzip/Brotli for JavaScript and HTTP/2 at the reverse proxy; verify actual
   negotiation and Content-Encoding afterward.
4. Load optional inspector/component facilities only when needed, after measuring
   the simpler production packaging changes.
5. Compare repeated cold/warm browser navigations on the same public network;
   check all five variants and JS laboratory compatibility before deployment.

Production repair and deployment have not been performed by this diagnosis.

## Local repair and verification

Implemented in `/Users/gporcari/Sviluppo/genro_ng/gramlot-rosetta`:

- `scripts/build-gramlot.mjs` builds the installed/private-wheel browser assets
  with esbuild, ESM splitting, minification and preserved function/class names.
  Startup, laboratory, builder and inspector share runtime chunks.
- Generated output is content-versioned. Inspector templates/styles are copied
  beside both entries and shared chunks to preserve relative asset resolution.
- `backend/production_assets.py` integrates bundle URLs with the installed
  adapter; Python recipe execution and source displays remain unchanged.
- Explicit `GRAMLOT_ROSETTA_MODE=production` enables versioned immutable caching
  for successful asset responses and gzip. HTML, recipes and missing assets keep
  revalidation. Development still uses individual adapter modules.
- Setup builds the bundle after dependency installation. Docker builds it from
  the verified wheel, with no framework source modifications or new wheel release.
- Build directories are traversable by the non-root container user. New environment
  names avoid Apple's reserved ROSETTA_ prefix, which broke amd64 emulation.

Verification used the exact published wheel SHA256 recorded above and an amd64
Docker image built locally, running read-only as uid 10001, with only loopback
port 8039 exposed. `deploy/check-container.py` passed health, six routes and
private-path boundaries. Full active Python suite: 89 passed (agent result).

Actual HTTP crawl of the final Docker Python startup graph: **9 JavaScript
requests, 363,207 decoded bytes, 102,933 transferred bytes** with gzip. All
reachable runtime assets returned the intended immutable cache policy. This
excludes HTML, CSS, recipe, source editor and inspector opened later; it is not
a measurement of complete-page browser load time. The separate macOS build had
10 reachable startup modules and approximately 103 KB gzip.

Browser checks through the in-app browser:

- All six lessons render in both Gramlot Python and JS (12 combinations).
- Python and JS live binding works with keyboard input; JS focus-out binding
  commits on Tab while remaining unchanged during editing.
- JS Run applies changes, deliberate errors preserve the previous preview,
  Reset restores Hello World. Floating inspectors open in Python and JS.
- Canvas binding, adding a paragraph, editing its value through the parameter
  dialog and deleting it work; embedded inspector/resources load.
- React, Vue and NiceGUI Hello World render; NiceGUI live binding responds.

An observer warning was seen in local master-page console during navigation and
reproduced with the exact same wheel in unbundled mode. It was not attributed to
bundling and no speculative cross-realm patch was applied. CUA fill() alone did
not trigger these widgets' live/commit behavior; native keyboard events verified
it successfully. Do not report a bundle reactivity regression from that probe.

Local optimized preview: http://127.0.0.1:8039/pages-js/hello-world/
Container: `rosetta-bundle-check`, image `gramlot-rosetta:local-bundle-check`.
Development server was restarted on 8026 to load the updated host/templates.
Temporary unbundled comparison container on 8040 was stopped and removed.
No commit, push, deployment or nginx/HTTP2 change was performed. The public site
still uses its prior assets until a separately authorized deployment.

## Published after owner approval

Owner authorized publication. Rosetta commit `ca88db770a07e3ef47f7577b7119d78c7cfe6f09`
was pushed to main. GitHub Actions run 34642405976 completed verification and
deployment successfully:
https://github.com/genropy/gramlot-rosetta/actions/runs/34642405976

Post-deployment HTTP verification on https://rosetta.gramlot.org confirms the
same 9 startup JavaScript assets, 363,207 decoded bytes and 102,933 transferred
bytes, with gzip and immutable caching. Browser verification confirmed JS Hello
World, Python live binding and floating inspector on the public site. No nginx
or HTTP/2 configuration change was required for this release.
