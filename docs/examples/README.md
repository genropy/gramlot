# Gramlot examples: one FastAPI environment

From the repository checkout, with the optional FastAPI dependencies installed:

```sh
.venv/bin/python docs/examples/serve.py
```

This builds the browser assets, tutorial/gallery and Python OpenAPI recipe, then
starts one FastAPI application on localhost:8051. Use `--no-build` to reuse the
existing generated files, or `--port` to choose another port.

| Surface | URL path |
| --- | --- |
| Tutorial | / |
| Component gallery | /gallery/ |
| Visual builder | /builder/ |
| Triangle Data RPC and remote Source | /page/triangle/ |
| Hello page collection | /hello/ |
| Python OpenAPI Explorer | /openapi/ |
| States, localities and customers (optional DB) | /database/states/ |
| Synthetic products and quotations API | /api/products, /api/quote |

All examples use FastAPI as their hosting environment. Static browser recipes
remain static: serving them with FastAPI does not introduce unnecessary RPC calls.
Python methods use the optional Gramlot FastAPI adapter; browser interactions use
the same Gramlot runtime. The ordinary host needs neither GenroPy nor Genro ASGI. The optional database
example uses legacy GenroPy through the dedicated contrib, under the same FastAPI
host and browser runtime.

The OpenAPI fixtures live only in this example host and use synthetic memory data.
They do not establish a database API in Gramlot core. FastAPI remains optional for
installations that only need the independent browser runtime. The manual CLI is
still available for documentation; it is no longer the example hosting instruction.
The IndexedDB file:// probe is a browser diagnostic, not a Gramlot application.

Verification of this host: the FastAPI TestClient checks route composition,
products filtering and quotation validation; six Chromium checks exercised the
triangle RPC/remote lifecycle, busy refusal, tutorial focus-out execution and the
OpenAPI live/source presentation on the same origin. No external database or
GenroPy service participated in these checks.

## One navigation tree, including the database example

All top-level examples have the same Python-authored Gramlot navigation tree:
Tutorial, Components, Applications and Tools. The generated `navigation.json`
provides the lesson/gallery entries; the host adds its application routes. The
current page is highlighted and its branch expanded. The old tutorial/gallery
navigation is hidden by host chrome; functional trees (inspector and builder
widget catalogue) remain inside their applications.

The navigation itself is a Gramlot Source recipe, served in a dedicated frame
with its inspector disabled. It does not use custom application DOM or fetch code.
The host wrapper applies only to top-level HTML pages, never to lesson recipe
frames, runtime assets or RPC responses. Hello pages now use the shared live/code
panel too. The visual builder retains its functional authoring workspace.

To include the real DB example, use a Python environment with compatible Gramlot
and legacy dependencies:

```sh
python docs/examples/serve.py --genropy-instance test_invoice_pg
```

Everything then runs at `http://127.0.0.1:8051/`, including
`/database/states/`. Without that option the tree indicates that DB is not enabled.
See [DB setup](states-grid/README.md). The local previous 8052 preview was stopped;
the unified host now uses 8051. No database dependency was added to Gramlot core.

Verified: host route/recipe tests, rebuilt 24 lessons and 31 gallery pages, and
Chromium comparison of all navigation links on seven example surfaces. The live
DB checks passed on the unified host. These changes are local after the 0.1.3
commit, not a new release.

## Compact presentation audit

After visual owner feedback, navigation uses 15px text, a 1.45 line height,
32px minimum rows and 18px icons; the sidebar starts at 290px wide and can be
resized with the thin Gramlot borderContainer splitter on its right edge.
Dragging was verified in Chromium on the tutorial, database and builder pages.
The navigation iframe is block-level and border-box sized to avoid baseline
overflow and an unnecessary outer scrollbar. Chromium verified no vertical
overflow in the sidebar region. This supersedes the overly dense 12px and 13px
experiments. Page headings, repeated section
headings and panel padding were reduced without changing recipe widget dimensions.

Chromium checked all 24 tutorial and 31 gallery pages (120 live/source panels),
plus six application pages (126 panels over 61 pages total): left bordered live
content, narrow splitter, dark CodeMirror, language above code, example-name
heading, and the small inspector control below the live border. Python editors
are read-only; JavaScript editors are editable without a Run button. A separate
focus-out execution check passed. The visual builder is an authoring workspace,
not one of these recipe panels; its navigation uses the same compact tree.

The comprehensive check is retained in `tests/browser/uniform-all-examples.spec.js`
and requires the generated preview and running host. Set GRAMLOT_STATES_URL to
include the optional DB page. No publication or additional commit accompanied
this presentation cleanup.

The host sidebar uses a 3px splitter area with a 1px visible line. Teaching
CodeMirror views explicitly mount their styles in the document: their light-DOM
content is slotted through a borderContainer, whose shadow root must not receive
those styles. Chromium verified full-module source, aligned gutters, preserved
indentation and sidebar dragging after this correction.
