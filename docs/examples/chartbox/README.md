# Grid and chartBox

See the [chartBox usage guide](../../guides/chartbox.md) for application authoring.

This Python-authored example shares one resident Data Bag and one selected-key
path between a grid and a D3-backed bar or pie chart. The gear opens an ordinary Gramlot
palette whose controls write directly into the chart structure Bag. There is no
Apply step or duplicate configuration object.

Run with the checkout's optional FastAPI dependencies and prepared assets:

```sh
python scripts/prepare_assets.py
python -m gramlot fastapi serve docs/examples/chartbox --port 8054
```

Open `http://127.0.0.1:8054/page/chart/`. The common example host also mounts it at
`/charts/chart/` and lists it in Applications. The live/source view shows Python.

## Supported contract

chartBox is available for ordinary use with the bounded capabilities below.
The example edits the grid cells directly (`edit=True`). Confirmed writes update
the shared Bag and both chart types; drafts, invalid input and Escape do not.

```python
views.chartBox(store='^rows', structpath='structure', selectedKey='^selection',
               fields='month:Month,revenue:Revenue,cost:Cost')
```

- `store` resolves to the original resident Bag; rows can be Bags or attributes
  (`datamode='attr'`). `identifier` follows the shared BagRows identity contract,
  with node labels as the default. Named remote collection stores are outside
  this first chart slice.
- `structpath` resolves like grid structure paths, including relative paths.
  The structure is an ordinary Bag with scalar entries: `title`, `chartType`, `captionField`,
  `valueField`, `color`, and `showValues`. These are the supported structure fields.
- `fields` supplies optional field choices for the palette. Without it, field
  names are editable text. Field metadata discovery from another widget is not
  implemented.
- Both components bind `selectedKey` to the same Data path. Grid clicks highlight
  bars; bar clicks or Enter/Space select grid rows. Deleting the selected record
  clears selection. No filtering or aggregate-to-record mapping is implied.
- Data changes, insertion, deletion, ordering and root replacement update the
  chart. Structure edits and root replacement also update it. The renderer
  coalesces changes per microtask, preserves the mounted component and detaches
  old Bag subscriptions and resize observers when removed.

`chartType` selects `bar` (the default) or `pie`, including live switching in the
palette without replacing the data or selection. Bars are categorical (one bar per selected numeric field and record), not a statistical frequency histogram. Null values have no bar, zero values remain
selectable, and negative values render below zero. Non-finite/non-numeric values
show a recoverable message. Rendering converts numeric values to JavaScript
numbers; it never writes those conversions back to the original Bag.

Pie charts use one slice per positive record. Zero/null records remain in the
selectable legend; an all-zero/empty dataset shows "No positive values". Negative
values show a recoverable error rather than misleading proportions. Slice colours
are stable by record key; the palette's Bar colour applies only to bars. Hover and
accessible labels include values and percentages. Show values controls the legend
values. Click, Enter and Space share selection with the grid.

Binning/aggregation, multiple axes, zoom, persistence and other chart types
are not part of this initial version. Long labels/dense charts need further
layout work; the current axis rotates labels in narrow viewports.

## Implementation and legacy reference

`ChartAuthoring.chartBox` composes the toolbar, palette and inputs in Python
using Gramlot declarations. `chart` / `gnr-chart` is the reusable browser renderer.
Applications do not construct DOM, wire native events or use ad hoc HTTP calls.
The shared BagRows service supplies record access and observation.

The legacy `resources/common/js_plugins/chartjs/chartjs.js`, particularly
`gnrwdg_configuratorFrame` and `gnrwdg_datasetsTab`, inspired the live field choices
and floating configuration panel. See the September 12 legacy audit. GenroPy's
user-object persistence, Dojo infrastructure and Chart.js option grammar were not
ported.

D3 scale, axis, selection and shape modules are pinned in package-lock.json. Asset
preparation bundles only their used primitives into a local ESM module and preserves all twelve included
packages' license texts and metadata in the browser distribution. No CDN is used.

Verification: chart/grid integration tests cover data and structure replacement,
selection in both directions, deletion, reordering, null/zero/negative values,
attribute rows and numeric identity, invalid-value recovery and disposal. Browser
tests in `tests/browser/chartbox.spec.js` cover the Python recipe, edits, palette
controls, close/reopen and resizing. Use `GRAMLOT_CHART_URL` for another host.

Pie checks additionally cover live type switching, updated proportions, stable
colours after ordering, selection, negative-value recovery and all-zero data.
Existing grid limitation observed during verification: moving the selected Bag
node may clear grid selection during the intermediate removal event. Type switching
itself preserves selection; fixing the grid's move-event handling is separate work.


Bar series now uses the shared `checkBoxText` popup. `datasetFields` stores the
selected field codes in the structure Bag; `datasetOptions` supplies their choices
in Python. Optional `seriesLabels` supplies legend captions. The pie retains its
independent `valueField`. Five browser checks cover checkbox changes, grouped bars,
cell confirmation, shared selection, empty selection and switching chart types.
