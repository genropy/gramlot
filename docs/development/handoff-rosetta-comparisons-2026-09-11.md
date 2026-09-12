# Handoff: continue Gramlot Rosetta comparisons

## Owner objective and correction

The owner wants to continue **Rosetta and its cross-framework comparisons**.
The immediately preceding implementation mistakenly expanded Gramlot tutorials.
The owner explicitly corrected that scope: use the new tutorial recipes as reference,
but continue work in Rosetta. The current request is handoff only.

Owner requested: update the navigation tree based on recent Gramlot developments
(and the builder tree), then expand chapters and examples covering widgets such
as dateTextBox, mask/format, dataFormula/dataController, validation, trees and grids.
Maintain comparisons across Gramlot Python, Gramlot JS, React, Vue and NiceGUI.

## Repositories and scope

- Framework: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot`.
- Consumer: `/Users/gporcari/Sviluppo/genro_ng/gramlot-rosetta`.
- Gramlot tutorials: `docs/examples/teaching/` in the framework.
- Rosetta preview has used `http://127.0.0.1:8038/`.
- Tutorial preview most recently served `http://127.0.0.1:8051/` from
  `build/teaching-preview`. Recheck running services before giving links.

Read framework `docs/context/README.md`, decisions and open-work before working;
other tasks have changed framework code concurrently. Both repositories have
existing changes. Do not reset them, broadly overwrite files, or infer that every
working-tree change belongs to this task. No commit or publication is requested.
Rosetta is outside this task's writable root; use the permitted escalation when needed.

## Rosetta: actual completed state

Rosetta still has **six comparative lessons**, not the 24 tutorial lessons:
Hello World, Data binding, Input widgets, Contact box, Repeated contacts,
Contact colors. Inspect `backend/examples.py` for the current authoritative list.

Relevant consumer files:

- `backend/app.py`: navigation/master page, overview, lesson rendering, builder route.
- `backend/examples.py`: lesson labels and descriptions.
- `backend/lesson_notes.py`: per-environment explanations and comparisons.
- `backend/pages_host.py`, `backend/nicegui_host.py`: framework hosts.
- `backend/source_browser.py`: displayed recipe sources.
- `frontends/`: implementations for each environment; inspect current layout.
- `shared/frame.js` and templates: example/code layout, inspector integration.
- `shared/builder/`: the original visual-builder PoC, still present in Rosetta.

Earlier owner requirements remain relevant:

- English interface, lesson descriptions and source documentation.
- Small didactic examples; keep Gramlot compact until extracting a routine has a
  concrete reason. Repeated contact blocks appropriately use a helper with a docline.
- Show actual executed recipe source. Shared boilerplate/styles belong separately,
  not duplicated in every example or hidden only for competitors.
- CodeMirror read-only except the Gramlot JS laboratory.
- Distinguish live input (`live=True` / `live: true`) from focus-out updates.
- Contact-color example changes the title bar background, not the card body.
- Each environment has a brief “How it works”; other platforms have a factual
  “How it compares”, recognizing native bindings and built-in facilities fairly.
- In particular, investigate NiceGUI's real native binding options. Do not compare
  only an unnecessarily verbose recipe and imply NiceGUI lacks the capability.
- Compact navigation, resizable sidebars/example-code split, discreet inspector.

## Visual-builder work and reusable Tree actions

The PoC was copied into Gramlot tutorials at `docs/examples/teaching/builder/` and
linked at `/builder/`. It uses the tutorial build's versioned local runtime.
Rosetta's original remains; later tutorial-only changes are not automatically synced.

PoC features: widget insertion/drag/drop, leaf/cycle rejection, Source mutations
inside live batches, preserved Data on moves, selectable canvas, embedded inspector
right, editable parameters dialog from an outline edit icon, Source-tree edit/delete
and drag actions, resizable left/right sidebars. No duplicate tree below the left
catalogue or JSON panel below the canvas. No persistence or undo.

`js/dom/src/collections/storetree.js` now supports optional JavaScript `rowActions`
with `{id, icon, label}` and emits `tree-action` carrying `{action, path, node}`.
Buttons appear on hover/focus, and do not select/toggle branches. This is a mounted
component property, not yet a declarative Python recipe parameter. Behaviors belong
to the consumer; ordinary trees have no actions by default. Documentation:
`docs/guides/tree-row-actions.md`. Existing component tests passed (11 at that time).

The tutorial builder catalogue was subsequently generated from `HTML5_GRAMMAR` and
`BUILTIN_COMPONENTS`, with HTML and Gramlot-collection branches and nested groups.
It reported 145 entries at implementation time; the registry has grown since, so
recompute counts. Some document/specialized elements and unloaded components are
listed disabled. Acceptance is still a PoC, not complete HTML nesting validation.
The catalogue uses tag names as keys; overlapping HTML/Gramlot names merit review.

Pending identity discussion: owner objected to extra `data-design-id` and `_meta`.
The PoC still uses data-design-id, hidden in parameter editors. We confirmed existing
`node_id` / `nodeById`, plus runtime `targetId` / `nodeByTargetId`, but did not migrate.
Do not claim that cleanup is complete. `_meta` is used internally for schema metadata;
owner questioned storing it on every node. No architectural refactor was authorized
or performed in this discussion.

## Tutorial expansion accidentally completed instead of Rosetta

`docs/examples/teaching/manifest.json` now contains 24 lessons and nested groups:
First steps; Widgets; Formatting; Data and logic; Messages and containers;
Validation; Trees; Grids. `build_preview.py` generates nested navigation.
Nine new lessons, all with Python and JavaScript recipes:

- 16-date-input: basic typed date input and displayed pattern.
- 17-text-mask: mask='Hello, %s!' and raw Data comparison.
- 18-date-format: numeric pattern vs localized long date.
- 19-required-validation: required and length constraints.
- 20-tree-selection: hierarchical Bag captions and selected relative path.
- 21-grid-records: child-Bag records, quickGrid and stable row-key selection.
- 22-grid-attributes: datamode='attr' and formatted numeric columns.
- 23-email-validation: explicit email_iswarning=False, making email a hard error.
- 24-number-validation: min/max numeric bounds.

Existing lesson 10 (formula, passive input, inline expression, controller) now uses
live instead of updateOn and has inspector enabled. Existing tutorial lessons 12/13
cover symbolic dates and numeric precision in more depth. These are useful source
material; they are NOT Rosetta comparisons and should not be described as such.

Verification of that expansion:

- `tests/browser/tutorial-chapters.spec.js`: 19 passing browser tests across new
  Python/JS variants, mask/date output, validation feedback/recovery, tree/grid
  selection and nested navigation.
- Two targeted Python tests in `tests/test_teaching_examples.py` passed (preview
  generation and first-five progression). Supplemental inventory expectations updated.
- Full older teaching JS parity checks previously referenced a missing historical
  `gramlot-dom/tests/dom.js` checkout through `tests/lab_loader.mjs`; not resolved here.
- Validation follow-up recorded in `docs/context/open-work.md`: an error message and
  host data-invalid could coexist with inner aria-invalid=false after blur. Do not
  claim this accessibility discrepancy fixed; tests check visible messages/recovery.

## Current framework features to use as evidence

Read the latest guides/code rather than relying on this snapshot:

- `docs/guides/date-expression-parser.md`: symbolic date-entry alpha and limitations.
- `docs/guides/display-formatting.md`: **mask**, not msk; `%s`; typed temporal values,
  named styles and bounded LDML patterns. Formatting does not change Data.
- `docs/guides/number-formatting.md`: numeric format/places/locale and precision.
- `docs/guides/static-grid.md`: resident Bag grid, datamode bag/attr, selectedKey,
  explicit identifiers, quickGrid columns, legacy structpath structure.
- `docs/examples/gallery/cases.py`: executable component and grid cases.
- `js/dom/src/forms/validator.js`: actual rule semantics, including default email warning.
- `js/pages/src/builder.js`: currently includes the grid collection.

Grid work is an alpha. Do not promise cell editing, remote pagination, filtering,
or advanced behaviors merely because another platform supports them.

## Suggested next execution

1. Inspect current Rosetta recipes, source-display pipeline and hosts; check running
   server/package version against current Gramlot. Read repository instructions.
2. Update Rosetta navigation into coherent nested chapters, preserving existing URLs
   and the six working comparisons. Use the improved tree styling/behavior appropriately.
3. Add a small coherent batch of comparative lessons first: basic dates, display mask/
   format, formula and controller. For each, implement and test all five environments,
   displaying complete equivalent recipe code and truthful explanatory comparisons.
4. Continue with validation (required/length, email, numeric limits), tree selection,
   and resident-grid examples with comparable data and semantics.
5. Verify native options in React/Vue/NiceGUI from installed code and primary docs
   when needed. Separate core functionality from third-party component dependencies;
   make Gramlot's built-in conveniences explicit only where evidence supports them.
6. Test behavior in the actual consumer browser, not just recipe syntax or rendering.
   Check source/code correspondence, live/focus-out behavior, validation recovery,
   stable selection and format-vs-Data distinction. Report which chapters are complete.

Do not start by adding more tutorial-only lessons. The corrected deliverable is
**Rosetta with comparisons**.
