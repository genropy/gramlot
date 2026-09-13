# checkBoxText

A reusable multi-selection control, authored in Python and implemented by the
shared Gramlot input runtime. This version does not change chartBox rendering.

Run the example:

```sh
gramlot fastapi serve docs/examples/checkboxtext --port 8087
```

Open `/page/index/`. The page contains a popup and inline control sharing a
selection, Bag options, external selection/options buttons and readouts of both
the codes and the Data node's `_displayedValue` attribute.

## Python API

```python
pane.checkBoxText(
    value='^.datasetFields',
    values='cost:Cost,revenue:Revenue',
    popup=True,
    cols=1,
    lbl='Datasets',
)
pane.div('^.datasetFields')
pane.div('^.datasetFields?_displayedValue')
```

`value` is a comma-separated string of codes, or `None` when empty. Codes are
trimmed, deduplicated and kept in selection order. Leading zeros remain intact.
`_displayedValue` is a comma-separated string of labels (no added spaces), or
`None`. It is transient display metadata on the value node, not another value
path. Controls sharing that node should use the same label mapping.

`values` accepts comma/newline-separated `code:label` entries, plain entries
where code equals label, or a Bag. Labels may contain colons after the first one.
Codes must be nonempty, unique and comma-free. Commas/newlines in string labels
are delimiters; use a Bag to supply such labels instead.

```python
options = Bag()
options.set_item('cost_option', None, code='cost', caption='Cost')
options.set_item('revenue_option', None, code='revenue', caption='Revenue')
pane.data('.options', options)
pane.checkBoxText(value='^.datasetFields', values='^.options',
                  identifier='code', labelAttribute='caption', popup=True)
```

For a Bag, the top-level node label is the default code and caption. Explicit
`identifier` and `labelAttribute` read fields from a child Bag, or attributes
from a scalar/null row. Both attribute rows and nested Bag rows are supported.
In-place option updates and replacement of the bound options Bag update labels
and checkboxes; subscriptions to the old Bag are removed.

`popup=False` (default) renders checkboxes directly. `cols=1` (default) determines
the number of columns in either mode. `popup=True` uses an inherently readonly
caption field and arrow; readonly presentation does not lock selection.
`disabled=True` or `readonly=True` on the component prevents changes and disables
its checkbox controls and popup trigger. Standard Gramlot `lbl` decoration and
field validation declarations apply.

## Interaction and data lifecycle

- Checkbox changes commit immediately through the ordinary Gramlot change and
  validation lifecycle. The popup stays open for additional choices.
- Click the caption field or arrow, or press Down/Enter/Space on the caption
  field, to open. Focus enters the first checkbox.
- Space toggles the focused checkbox. Tab/Shift-Tab traverses controls. Arrow
  keys, Home and End move focus among options without changing the selection.
- Escape closes a popup and returns focus to its caption field. An outside
  click or leaving the combined control closes it. Reopening restores checks.
- Closing never cancels accepted changes. This is immediate selection, not an
  Apply/Cancel dialog.
- Accepted value and `_displayedValue` are written together. An external value or
  options update also refreshes the derived caption. A rejected value does not
  replace the accepted Data value or its caption.
- Disconnect closes popups and removes Bag and document/window subscriptions.

## Missing options: explicit difference from legacy

If an already selected code disappears, Gramlot preserves it in `value` and
shows that code literally in `_displayedValue`. Known codes still show their
labels and remain checked. Updating other checkboxes preserves unknown codes;
an explicit external value change/clear can remove them. Reintroducing an option
restores its label and checked state. No automatic data loss occurs on an options
refresh, and missing options alone do not create a validation error.

The inspected legacy `alignCheckedValues` returns early when any selected code
is missing, which can leave stale caption and checkbox state. Its option rebuild
also invokes `onCheck`, so behavior can differ between value changes and option
replacement. This implementation intentionally does not reproduce those stale
presentation/rebuild effects. It also preserves selection order instead of
rewriting selection into option order on each checkbox action.

## Framework integration

The normal input collection registers `checkBoxText` / `gnr-checkboxtext`.
The component inherits ControlElement decoration, null presentation and field
state, and reuses ControlTools for the popup. A shared `isLocked` predicate lets
a readonly display field expose an editable popup without weakening other tools.

Two narrow reusable seams were added:

- Catalog `meta.propertyAttributes` passes non-string values as element
  properties and reconciles them without destroying the mounted control. Normal
  Source bindings track replacement; the component owns subscriptions to its
  current Bag options. This version uses `propertyAttributes: ['values']`.
- A widget `mutationAttributes(acceptedValue)` hook supplies derived Data-node
  attributes to the existing mutation writer, after validation. checkBoxText
  returns `_displayedValue`; FormField remains responsible for accepting values.

The component maintains only a DOM projection of the bound value, not a second
selection Bag. Application interactions use Python Source declarations and
short supported Data actions; no application DOM or request bypass is used.

## Scope and limits

No text filter, table/remote lookup, `valuesCb`, hierarchical tree mode, radio
mode, legacy slash-based row/colspan syntax, custom separators or chart multi-series
work is included. These capabilities are not implemented in this version.
The display-metadata contract applies to value-node bindings, not bindings to an
attribute of another node. Native browser popover support supplies top-layer
placement; environments without it fall back to the shared positioned popup.

Legacy references inspected in `/Users/gporcari/Sviluppo/Genropy/genropy`:

- `gnrjs/gnr_d11/js/genro_components.js:5693`: CheckBoxText implementation;
  Bag conversion at 5835, validation/alignment at 5926–5991 and writing at 6062.
- `projects/gnrcore/packages/test/webpages/inputfields/checkboxtext.py`: usage,
  reactive options, external value and caption examples.
- `resources/common/js_plugins/chartjs/chartjs.js:754`: dataset selector using
  popup, `cols=1` and callback-supplied values; callback support is deferred here.

## Verification

`js/dom/tests/checkbox-text.test.js` covers parsing, nested/attribute Bag options,
external values, option replacement, label mutation, orphan retention, validation
and cleanup. `tests/browser/checkbox-text.spec.js` runs against this Python page
using `GRAMLOT_CHECKBOXTEXT_URL=http://127.0.0.1:8087/page/index/` and covers
multi-selection, popup persistence, keyboard/focus, bidirectional sync,
disabled/readonly, replacement, null selection and Source removal cleanup.
Catalog generation is checked by the existing Python component tests. Runtime
assets are rebuilt with `prepare_assets.py` and `build_browser_distribution.py`.
No release or push is part of this work.
