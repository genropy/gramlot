# Grid structure Bag: legacy audit and implementation

The owner requires columns to be controlled by mutations of a Data Bag, including
order, width and cell attributes. The former Source-owned list did not satisfy
this contract. This implementation supersedes that choice.

## Verified legacy behavior

Read from the preserved local Genropy repository, `gnrjs/gnr_d11/js/genro_grid.js`:

- `mixin_setStructpath` (178): resolves the Data Bag, rebuilds structure and retains
  vertical scroll position. `structpath` is dynamically registered (782).
- `structFromBag` (1969): traverses views and their row Bags in node order, skips
  the top-level `info` node and builds cells from node attributes.
- `structFromBag_cell` (1794): starts with the cell label as field fallback, merges
  row presentation defaults and columnset metadata, then cell attributes. This
  legacy method also supports many format/editor options beyond the current grid.
- `setCellWidth` hook (1001): writes width into a cell in `view_0.rows_0`.
- `mixin_deleteColumn` and `mixin_moveColumn` (2130): remove/reinsert structure
  nodes; the structure Bag remains the authoritative order.
- `genro_components.js` quickGrid (3251): defaults datamode to bag, creates a
  structure Bag and assigns a structpath (legacy default `#WORKSPACE.struct`).

The faithful contract is the data structure and mutation flow. This is not a
port of the complete legacy grid implementation or its Dojo renderer.

## Implemented contract

`structpath` resolves in the normal Data namespace, including relative paths,
and is reactive even without `^`. Cell definitions are null-valued nodes under
`view_0.rows_0`, with metadata in attributes. Bag node labels identify cells
through reorder and hiding; field names may repeat. The grid subscribes to the
structure tree while mounted, handles prepopulated nested Bags, resubscribes after
structural changes and releases old subscriptions on replacement/disposal.

Resize commits update only the cell's width. Bag moves, inserts, removals, hidden,
name, field, dtype, formatting and supported presentation attributes update the
mounted viewport. Unknown attributes remain untouched. Column shorthand creates
a Data setter for a structure Bag and an explicit structpath, not an inline list.
Both gallery pages expose `struct` and a button that swaps Customer and Joined by
calling the current Bag API `move(2, 3)`.

Widths accept numbers and px strings; zero uses elastic remaining space. Current
elastic sizing is equal-share with a 24px minimum, not the legacy em/percentage
heuristics. One view/one row is supported; multiple views/rows fail explicitly.
Columnsets, grouping, symbolic #WORKSPACE paths, complete legacy cell grammar and
full editor/formula options remain outside this renderer.

See the maintained [grid guide](../guides/static-grid.md) for authoring examples.


## Legacy declaration follow-up

The Python legacy `gnrpy/gnr/web/gnrwebstruct/gridstruct.py` methods `view` (73),
`rows` (86) and `cell` (144) were checked. `cell` uses empty string content and
stores metadata in attributes. Gramlot now provides this declaration subset via
`gramlot.grid.GridStruct` and the JavaScript `GridStruct` export; it produces the
same nested Bag layout and tag attributes. Python transport strips authoring
subclasses to ordinary Bags. Database-aware fields, permissions and columnsets
are not included. Gallery case 4 demonstrates the ordinary grid with this syntax.
