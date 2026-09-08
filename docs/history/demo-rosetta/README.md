# Demo Rosetta

**Guida dettagliata in italiano:** [installazione, manuale inglese/italiano e prove](docs/guida-installazione-it.md) · [HTML stampabile](docs/guida-installazione-it.html).

The active comparison is a nine-example gallery in React, Vue, Pages Python
and Pages JS, hosted by FastAPI. One shared **plain HTML frame** owns implementation navigation, example
selection and View source. Each framework renders only the example in its iframe.

Examples progress from Hello World to editable text and visual controls. The
eighth, [Local scope](http://127.0.0.1:8026/pages/local-scope/), groups the full
Font style example in a compact box. Pages uses `datapath="sample"` and relative
bindings; React and Vue use component-local state.
Orders is on standby: its previous code, fixtures, specification and tests are
preserved in [standby/orders](standby/orders/README.md), outside active routes/tests.

## Run

Prerequisites: Python 3.12, uv, Node compatible with Vite 8 and npm.

```sh
git clone https://github.com/genropy/demo-rosetta.git
cd demo-rosetta
./scripts/setup.sh
./scripts/run.sh
```

Open [Pages](http://127.0.0.1:8026/pages/), [React](http://127.0.0.1:8026/react/), or
[Vue](http://127.0.0.1:8026/vue/). View source opens the individual page source first;
the common HTML frame, bootstrap and host adapter are separately inspectable.

Setup fetches the exact public Genro preview commits into `.local/dependencies/`:
Pages `0683f5d`, Builders `25ae619` and DOM JS `d888cef`. DOM's lockfile pins Bag JS
v0.4.0 and TYTX v0.15.0. No pre-existing sibling checkout is required. Re-running
setup preserves the pinned source checkouts and refuses to overwrite local changes.

The FastAPI environment deliberately has **no genro-asgi installed**: Pages and
Builders are loaded from their fetched sources, while this demo supplies the host
adapter. This is still an experimental integration, not a released Pages/FastAPI
adapter distribution. `ROSETTA_PAGES_SOURCE`, `ROSETTA_BUILDERS_SOURCE` and
`ROSETTA_CLIENT_MODULES` remain explicit development overrides.
ROSETTA_WITH_PAGES=0 runs only the other two frontends. ROSETTA_PORT changes the port.

## Verify

With a separate demo server running:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/demo-rosetta-browsers npx playwright install chromium
./scripts/check.sh
.venv/bin/python scripts/measure.py
```

ROSETTA_URL selects another server for browser checks. Active tests cover the shared
HTML frame, isolated Hello World content, mobile layout and literal source display.
The previous order tests are preserved under standby/orders/tests, not run against
Hello World. See [SPEC.md](SPEC.md), [comparison](docs/COMPARISON.md) and
[evolution](docs/EVOLUTION.md). Application code and comparison infrastructure are
measured separately. Readability takes precedence over minimizing line count.

The public repository is [genropy/demo-rosetta](https://github.com/genropy/demo-rosetta).
Historical local provenance remains in the documentation; new installations use
the pinned public dependencies above. Setup does not modify sibling repositories.

Pages JS is available at `/pages-js/`. Its Page tab is a live CodeMirror editor:
edit the JavaScript recipe and press Apply, choose Live for each edit, or Focus out when leaving the editor. Edits are not saved to files. Reload
restores the original recipe. `scripts/setup.sh` builds the local editor bundle;
run `npm run build:editor` after changing editor code. The runtime and editor are
listed separately from the authored recipe in the source browser and inventory.

The example menu includes seven cumulative binding pages plus Local scope and Repeated panels in
each of the four variants. Start with `/pages/editable-text/` or explore the
complete set of controls at `/pages/font-style/`. Switching implementation keeps
the example selected. See SPEC.md for update events and initial values.

Runtime asset URLs include a content-derived revision prefix covering the DOM,
Bag, TYTX, Pages modules and demo bootstrap. Import-map prefix mappings keep
transitive/relative imports in that same revision. Development responses require
cache revalidation. Restart the demo after updating a dependency snapshot so the
revision is recomputed; already open pages keep their current runtime and state.

The pinned DOM preview includes the form runtime previously checked in the local
`forms-client-20260908` snapshot. Both Pages variants select `inputs`, `layout` and `forms` through the
shared Rosetta builder, exposed under Boilerplate. Recipes can use `labledBox`,
`validate_*` and Bag-backed memory forms; this enables the runtime without adding
new comparison examples. These capabilities are experimental local library work,
not a released dependency. Restart the server and reload open pages after switching
snapshots. The browser form integration check covers Python serialization and
native JavaScript, invalid-save blocking, memory save and baseline restore.

The same layout collection now includes `formlet`: fixed columns or responsive
`col_min_width`, spacing, relative scope and shared field/label defaults. The two
form integration tests also check its two-to-one-column responsive behavior.
Wrapping mode and legacy formbuilder/database adapters are not included.

[Repeated panels](http://127.0.0.1:8026/pages/repeated-panels/) repeats the eighth
example six times, using idiomatic composition in each frontend.
