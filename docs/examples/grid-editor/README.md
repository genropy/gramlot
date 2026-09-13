# Resident grid editor experiment

Local prototype, 2026-09-13. This is an experiment in hosting ordinary Gramlot
controls inside an editable grid, not a complete GridEditor migration.

Run from the repository after preparing the browser distribution:

```sh
.venv/bin/gramlot fastapi serve docs/examples/grid-editor --port 8079
```

Open http://127.0.0.1:8079/page/index/ . The page is authored in Python; its
source is displayed next to the live example. The dbSelect uses a small Python
endpoint with fictional products, without a database dependency.

## Implemented behavior

- Legacy-shaped `edit=True` / `edit=dict(tag=..., ...)` column declarations.
- Double-click opens an editor; Enter confirms, Tab/Shift-Tab confirms and moves,
  Escape discards the current cell draft. Keyboard navigation selects the destination
  text. Up/Down moves in the same column, except while a choice popup owns the
  arrows. The active-cell border is inset. Uneditable cells retain row activation.
- A stable shadow slot positions an ordinary **light-DOM Source child** above
  the cell. The component and bindings belong to the original Application.
  Row redraws do not destroy the control. Switching cells recreates the control;
  same-type reuse is not implemented.
- A private Data path holds the cell draft. Confirmation writes through the
  collection store. Bag-valued and attribute-backed resident rows are supported.
- Normal FormField parsing and validation are reused. Invalid input stays open;
  asynchronous validation is awaited before confirmation. Validation messages use
  a separate tooltip above the field, preserving the cell height and inset border.
  The cell session retains errors by row key and column ID; rendered cells carry
  `invalidCell` and `aria-invalid` across scroll/recycling. Successful confirmation
  or Escape clears the mark. No second validator,
  browser request mechanism or application-local DOM implementation is added.
- Formulas observe confirmed writes. External changes to the same cell refuse
  an overwrite; Escape and reopen to see the new value. Row replacement/removal
  is checked again before committing.
- Scroll out of view hides the editor and retains its draft; scrolling back
  reveals it. Keyboard movement brings the destination into view.

## Findings and boundaries

The experiment removes the need to replace cell HTML and suppress row redraws.
It does not eliminate the lifecycle coordination between controls, validation,
selection and the viewport. A row editor object is unnecessary for this bounded
cell-only experiment; row-level validation and changeset persistence are separate
work.

A prerequisite defect surfaced in existing populated Bag rows: bag-js does not
recursively attach existing nested values when enabling backrefs. BagRows now
attaches detached row branches before subscribing, so changes reach external
Data bindings as well as the grid. Existing parented branches are preserved.
The shared typed snapshot service now copies and compares Decimal values without
converting them to floating-point numbers.

Not implemented: save/restore of the collection, insertion/deletion UI, autosave,
parent-form coordination, virtual-store editing, row-scoped `#ROW` configuration,
`selected_*` multi-field setters, related captions in the displayed grid, or
configurable legacy lifecycle callbacks. This experiment is for grids outside
forms. Blur alone leaves the session open; use Enter/Tab or another editable
cell to confirm. Live edits of the structure and complex clipping/frozen-column
combinations require further interaction coverage.

The shared dbSelect accepts its visible highlighted suggestion (including a sole
result) on Tab or leaving the field. Blur accepts the choice into the cell draft;
the grid session still follows the confirmation rules above. No-result text
remains invalid. Starting another search hides the previous suggestions so an
exit cannot accidentally accept a stale highlighted result.

For the RPC select, let the initial identity-to-caption lookup complete before
searching. The existing provider refuses busy requests; rapid typing during the
initial lookup can require repeating the search. This provider interaction is
not solved by the cell-host experiment. Decimal `validate_min/max` remain limited
by the existing validator's finite-number contract; the example validates an
integer quantity and uses Decimal parsing without these validators for price.

## Verification

### Widget playground

Two additional Python-authored grids exercise textBoxArea, filteringSelect,
comboBox, remoteSelect, checkBox, dateTextBox, timeTextBox, horizontalSlider,
verticalSlider, colorpicker and passwordbox alongside the original textBox,
numberTextBox and dbSelect. Each column has a first-row Data readout.
Textarea Enter inserts a newline; Ctrl/Cmd+Enter confirms. Its arrows move the
caret. Sliders and native time inputs also retain their arrow behavior. Tab
confirms and navigates for all these editors. Tall editors overlap following
rows rather than changing the virtual row height. Date/time display cells still
use the grid's existing string rendering; this exercise verifies typed editing.

The playground exposed and fixed comboBox confirmation before native change and
timeTextBox conversion between native minute precision and TYTX H seconds.
Four Chromium scenarios and 27 targeted JavaScript tests pass after these fixes.

- 403 JavaScript tests pass, including four new tests for mounted Source editors,
  Bag/attribute confirmation and cancellation, invalid values, external writes,
  deleted rows, and exact Decimal snapshots.
- `tests/browser/grid-editor.spec.js` passes in Chromium against this Python page:
  draft retention through scroll, Tab, numeric validation, Escape, dbSelect RPC
  selection, formula results and external Data readers. Set
  `GRAMLOT_GRID_EDITOR_URL=http://127.0.0.1:8079/page/index/` to run it.
- Python page and endpoint were executed by the FastAPI host during the browser
  test. Application source contains only Python Gramlot declarations and domain
  data; browser behavior resides in reusable framework code.
- Visual inspection includes the open selector popup. No publication or commit.
- Follow-up dbSelect exit behavior: 27 targeted JavaScript tests and three
  Chromium grid scenarios pass, including sole-result Tab acceptance, highlighted
  selection, outside-click acceptance and rejection of unmatched text.
