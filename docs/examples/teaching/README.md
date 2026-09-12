# Progressive teaching preview

These lessons use the same source files for execution and display. The
first five are the progressive module-organization sequence. Standalone
validation and a memory-backed form follow separately; ``textBoxArea`` is a
supplemental input example and does not change the five-step sequence.

Build prepared runtime assets and the preview from the repository root:

```sh
.venv/bin/python docs/examples/serve.py
```

Open http://127.0.0.1:8051/. The common FastAPI host serves all examples.
Each example shows its bordered live panel on the left and its complete Python
source in read-only CodeMirror on the right, separated by a thin splitter.
The Python frame executes TYTX generated from the same `recipe.py` displayed in
full: imports, class, setup and all methods are retained. FastAPI page examples
likewise show the entire page module, including `@endpoint` and `@source` methods.

JavaScript variants are no longer repeated beneath the Python examples.
Interactive JavaScript authoring belongs in the playground. Existing JavaScript
recipe files remain available in the repository.

Keep each example focused on one concept. Explanations belong in the manifest,
outside the executable recipe. Do not add headings, counters, controller effects,
layout or initialization merely to decorate another concept's example.

The header's Show null values preference enables null background decoration and
is saved in the browser; it defaults off. Toggling it updates all example frames
without changing their Data. Shared numberTextBox controls align values right.
Runtime assets use a content-versioned path so rebuilding the preview does not
reuse stale modules from the browser cache.

Shared concepts are documented in
[`labled-box.rst`](../../source/reference/labled-box.rst) and
[`formlet.rst`](../../source/reference/formlet.rst). The existing widget
catalogue remains the inventory for all eleven inputs; this directory adds a
learning sequence and does not replace that catalogue. The new multiline input
is documented in
[`textbox-area.rst`](../../source/reference/textbox-area.rst).
Reusable field rules and the ``validate()`` authoring shorthand are documented
in [`validation.rst`](../../source/reference/validation.rst).

## Visual Source builder PoC

The tutorial navigation links to `/builder/`, a standalone interactive playground
maintained in `builder/`. It uses the same locally prepared, versioned Gramlot
runtime as the lessons; no Rosetta server or external runtime is needed.
Drag catalogue widgets onto containers, edit through the hover pencil, or use the
Source inspector's tree actions and drag/drop. Both sidebars are resizable.
Changes live in the browser session and reset on reload. Container acceptance is
limited to the prototype catalogue; persistence and undo are not implemented.
The imported PoC still uses its internal `data-design-id` bookkeeping; migration
to Gramlot node identity is a separate pending change.

Browser regression checks are retained in `tests/browser/visual-builder.spec.js`.
With Playwright and its Chromium browser installed, run:

```sh
GRAMLOT_TUTORIAL_URL=http://127.0.0.1:8051 playwright test --config tests/browser/playwright.config.mjs
```

The builder catalogue is generated from `HTML5_GRAMMAR` and `BUILTIN_COMPONENTS`.
HTML is grouped into nested sections (text, forms, media, tables, etc.); Gramlot
widgets are grouped by registered collection. Document-level/specialized elements
and collections not loaded in the playground are listed but disabled with a reason.
This inventories the current grammar, not every possible browser extension.

## Expanded chapter navigation

The manifest now contains 24 lessons, grouped into nested chapters: First steps,
Widgets, Formatting, Data and logic, Messages and containers, Validation, Trees,
and Grids. Nine new lessons (16–24) have Python and JavaScript recipes and an
inspector. Existing local-logic examples now use `live` instead of `updateOn`.

New cases separate basic date entry, text masks, date patterns, required/length
rules, email rules, numeric limits, Bag-tree selection, Bag-record grids and
attribute-record grids. `mask` is the supported spelling; `%s` wraps formatted
text without changing Data. Email explicitly sets `email_iswarning=False` to
turn the built-in warning into an error. Grid examples cover resident display and
selection, not cell editing, filtering or server pagination.

Checks: `tests/browser/tutorial-chapters.spec.js` covers both languages, display,
validation feedback/recovery, tree selection, grid selection and nested navigation.

## Uniform example presentation

Every tutorial and gallery case has its example name above a bordered live panel
on the left, a draggable splitter, and a dark CodeMirror editor on the right
using a 12px code font. The language label belongs above the editor. A subtle
magnifier and “Open inspector” control sit immediately below the live border.
All cases expose inspection. Python is read-only; JavaScript executes whenever
focus leaves its editor, including the basic textarea fallback. No Run step is
required. Reset remains available.
