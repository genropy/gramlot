# Component gallery

The gallery is a separate application surface at `/gallery/`, alongside the
progressive tutorial. It shares the preview shell, runtime packaging, Python
recipe loader, code panel and inspector. Build both with:

```sh
.venv/bin/python docs/examples/serve.py
```

Navigation comes from `js/dom/src/components/builtin-components.json`: collection,
then component. The current version contains 30 components, 31 pages and 65 independent cases.
Grid has separate pages for 50 Bag-valued rows and 5,000 attribute-backed rows.
`cases.py` owns the curated checks. Each entry has a title, an expected behavior
and a Python recipe body. `prepare()` adds the common imports and WebPage wrapper
and emits the exact executable recipe next to its TYTX and frame. Each frame
mounts a separate application, so cases cannot overwrite one another's Data.

To add a case, call `case(componentName, title, expectedBehavior, pythonBody)`.
Use synthetic local data and expose an observable result. Keep examples bounded;
prefer another case over a single large page combining unrelated options. Adding
a catalogue component without cases fails the build instead of silently omitting
it from navigation. Keep generated recipes under build/, not in the maintained
source tree.

## Legacy inspiration

Read-only references under the legacy Genropy checkout:

- `projects/gnrcore/packages/test/webpages/inputfields/numbertextbox.py` uses
  separate `test_*` methods for constraints, patterns, precision and read-only
  behavior, hosted through TestHandlerFull.
- `projects/gnrcore/packages/test/webpages/layout/bordercontainer.py` separates
  regions, nested layouts and resizing scenarios.

The gallery retains independent, described cases and visible state. It does not
claim to port unsupported legacy RPC, currency, formulaBox or layout features.
Current cases cover bindings, null/disabled states, numeric precision/bounds,
symbolic dates, layout composition, stack commands, clipboard, palette, tree
selection, memory forms, resident grid formulas and the editor collection.

## Validation and limitations

`tests/gallery_examples.mjs` hydrates every generated case, requires the advertised
custom element to have mounted, checks lifecycle errors and verifies stack command
write-back. `tests/test_teaching_examples.py` also checks catalogue coverage and
multiple cases per page. This is smoke coverage, not exhaustive behavioral tests
for all advertised manual checks.

Browser spot checks cover Decimal display versus full-precision editing and tree
caption/selection with independent cases. CodeMirror reuses the existing optional
CDN integration and its textarea fallback; Node smoke checks exercise the fallback.
Gallery case bodies are Python-authored and displayed read-only. The grid cases
also provide editable JavaScript recipes so both authoring forms execute in the
same gallery host.


## Install from Chrome

Open `/gallery/` in Chrome and select **Install app** when offered. The tutorial
has its own installation at `/`. Installation opens a standalone window; the
preview server must still be running. Service workers intentionally do not cache
recipes or runtime assets during development. If the server is unavailable, a
recovery page explains how to reconnect.

The shared FastAPI host serves this gallery at http://127.0.0.1:8051/gallery/.
