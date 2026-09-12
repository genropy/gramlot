# Progressive teaching preview

These lessons use the same source files for execution and display. The
first five are the progressive module-organization sequence. Standalone
validation and a memory-backed form follow separately; ``textBoxArea`` is a
supplemental input example and does not change the five-step sequence.

Build prepared runtime assets and the preview from the repository root:

```sh
python scripts/prepare_assets.py
python docs/examples/teaching/build_preview.py
gramlot manual --directory build/teaching-preview
```

Open the URL printed by the final command. Each lesson shows Python above
JavaScript, with the live example on the left and its code on the right.
Narrow screens stack the example above the code. The Python frame executes the generated TYTX
from `recipe.py`; the JavaScript frame imports and executes `recipe.js`.

Keep each example focused on one concept. Explanations belong in the manifest,
outside the executable recipe. Do not add headings, counters, controller effects,
layout or initialization merely to decorate another concept's example.

Lesson 10 contains four independent examples with three or four recipe statements
each: reactive formula, passive read, inline expression and controller. The preview
extracts the actual `main`/`build` body and displays it once. No executable setup
is omitted from the displayed body. Fields start
empty; entering values triggers the logic. There are 13 Python/JavaScript pairs
across the ten lessons.

Python code is displayed once in CodeMirror with Python highlighting and read-only
state. JavaScript code is editable in CodeMirror. Run rebuilds only that JavaScript
example; Reset restores its original code and fresh Data. Edits are local to
the browser and are lost on reload. Compilation errors are shown without removing
the previous example; a subsequent Run or Reset can recover. CodeMirror uses
the same pinned CDN modules as the existing playground, with an explicit basic
textarea fallback if the CDN is unavailable.

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
