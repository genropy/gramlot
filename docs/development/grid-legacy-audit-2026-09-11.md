# Grid and quickGrid legacy audit

Date: 2026-09-11. Read-only investigation requested by the owner. The proposed
Gramlot API below is not implemented or approved yet.

## Verified legacy authoring

```python
def columns(self, struct):
    rows = struct.view().rows()
    rows.cell('article', name='Article', width='20em', edit=True)
    rows.cell('quantity', name='Quantity', dtype='L', edit=True)

# Framed Bag grid:
pane.bagGrid(struct=self.columns, storepath='.items', height='300px')

# Short form:
grid = pane.quickGrid(value='^.items')
grid.column('article', name='Article', width='20em', edit=True)
grid.column('quantity', name='Quantity', dtype='L', edit=True)
grid.tools('addrow,delrow,duprow,export')
```

`includedView`/`newIncludedView` are the grid widgets. `frameGrid` adds a frame
and surrounding controls; `bagGrid` specializes the framed grid for Bag data.
`struct` describes columns separately from the row store, through
`view().rows().cell()`. `fieldcell()` additionally derives metadata from a database
table and is not a server-independent synonym for `cell()`.

`quickGrid` is a composite convenience layer, not a second renderer. It creates a
BagStore, a column Bag/struct and a newIncludedView. Child `column()` declarations
feed the columns Bag. With no columns it infers fields from data; `fields` limits
inference and explicit column attributes can override inferred metadata.

Legacy BagStore supports ValuesBagRows (fields in each row's Bag value) and
AttributesBagRows (fields in row attributes). QuickGrid defaults to Bag mode.
The declaration is `datamode='bag'` or `datamode='attr'` on the grid.
Verified again after the owner's explicit reminder: in
`gnrjs/gnr_d11/js/genro_components.js:3250`, quickGrid defaults `datamode` to
`bag`, then at line 3274 maps it to BagStore
`storeType='ValuesBagRows'` or `storeType='AttributesBagRows'`. A directly
declared BagStore accepts `storeType` and defaults to ValuesBagRows (line 6566).
The underlying included-view implementation instead defaults `datamode` to
`attr` in `genro_grid.js:725`; defaults must not be generalized across wrappers.

ValuesBagRows.rowFromItem (line 7176) first copies row-node attributes, then
overlays fields from the row's value Bag. AttributesBagRows.rowFromItem (line
7248) reads the row-node attributes. Their updateRowNode methods write to the
value Bag and node attributes respectively. Both representations still use an
outer Bag of row nodes; this is row field storage, not Data versus Source.
The first Gramlot alpha implements only Bag-valued rows and does not yet expose
this `datamode` switch. Supporting attribute-backed records remains open work.

The identifier is independent of visible row order. `default_*` supplies new-row
values; `edit=True` or an editor dictionary configures cell editors.

Selection supports selectedId, selectedIndex, selectedLabel, selectedPkeys,
selectedRowData and selected_* field outputs. Multi-selection selected_* values
are unique values joined as text in the inspected implementation. Do not assume
those outputs are typed arrays.

`onSelectedRow` is published on the grid's Source node with idx, selectedId, grid
and selectedPkeys. QuickGrid toolbar commands publish targeted topics, and the
grid subscribes to addrow, delrow, duprow and export. Legacy export invokes a
server action; it is not proof of offline export support.

## Current Gramlot and recommended first slice

### Owner correction: underlying Dojo 1.1 structure

The Genropy layer above wraps Dojo, rather than supplying an independent grid
engine. Verified in `gnrjs/gnr_d11/js/genro_wdg.js:192`: DojoGrid maps to
`dojox.Grid`, VirtualGrid to `dojox.VirtualGrid`. NewIncludedView inherits
IncludedView → VirtualStaticGrid → DojoGrid, with the VirtualGrid widget mapping.
`genro_grid.js` converts the structure Bag using `structFromBag` and passes it to
the widget's `setStructure`.

The underlying source is `dojo_libs/dojo_11/dojo_src/dojox/grid/`, especially
`Grid.js`, `VirtualGrid.js` and `_grid/layout.js`. Its layout is an array of views,
each containing rows/cells. Thus `struct.view().rows().cell()` mirrors Dojo's
layout hierarchy: these rows are layout subrows, not records in the data store.
Views/subrows and cell spans must be considered when deciding how much of this
grammar Gramlot preserves. A flat column model is only a first-slice subset,
not a full representation of the legacy structure.

No grid/quickGrid component is registered in the current built-in catalogue.
Native HTML table elements exist, but are not a reactive data grid. StoreTree
provides an existing Bag-driven component reference, not a complete reusable
store interface.

Recommend one Gramlot grid component and one column model, with quickGrid as an
authoring convenience. Preserve quickGrid(value=...), column(field, name, width,
dtype, edit) and the explicit struct.view().rows().cell() authoring shape by
normalizing both into that column model. Do not reproduce a separate Dojo engine.
Use a Bag adapter shared where appropriate with tree: subscription ownership,
store replacement, stable identity and typed read/write belong outside rendering.
Begin with Bag-valued rows; evaluate attribute rows as an explicit adapter mode.

First usable scope: typed cells and shared format/mask/locale/places; reactive
row updates; stable single selection with write-back and external selection;
local sorting; explicit editable columns using existing Gramlot controls;
add/remove rows with toolbar commands through node-scoped publish/subscribe.
Add gallery cases for empty/null data, replacement, sorting while selected,
external updates, editing invalid values and component disposal. Avoid promising
virtualization, database metadata, remote selection stores or advanced grouped
headers in the first slice. Settle identifier spelling/defaults and the shared
store contract before implementation. The syntax above is legacy evidence,
not executable Gramlot code today.

## Source evidence

### Owner correction: column groups and footers

Genropy simplified the multi-view Dojo model but added column groups and footers
through its own extended layout. In `genro_grid.js:220`, `_extendedLayout`
replaces the original Source node with a BorderContainer: group headers above,
the Dojo grid in the center and footers below. These are separate tables, not
native Dojo views. `:281` measures Dojo header cells to synchronize widths;
`:316` constructs a hidden sizing header; `:474` builds the extra regions and
synchronizes horizontal scrolling. This is substantial adapter machinery.

Python `rows.columnset(code, name)` stores group metadata in
`struct.info.columnsets`; child cells still go into `view_0.rows_0` and carry a
`columnset` attribute (`gridstruct.py:94,161`). Group spans are calculated from
adjacent visible columns (`genro_grid.js:439`). Footer rows may be explicit child
declarations or generated from column `totalize` and `footer_*` attributes.
Totals bind to store-produced data, including filtered totals, rather than being
only static footer labels (`:337,416`).

Design implication: do not reintroduce Dojo's full view model merely for these
features. Column groups and footers should be first-class in Gramlot's structure,
sharing column order, visibility and width with the body. A minimal first render
may be flat, but the architecture should account for these requirements from
the beginning. Aggregation scope (all/filtered/selected rows) still needs an
explicit Gramlot contract; the historical implementation is evidence, not an
approved new API.

Paths below are relative to `/Users/gporcari/Sviluppo/Genropy/genropy/`:

- `gnrpy/gnr/web/gnrwebstruct/base.py:432`: quickgrid and its child declarations.
- `gnrpy/gnr/web/gnrwebstruct/dojo11.py:231`: bagStore;
  `:618`: includedView; `:644`: gridStruct.
- `gnrpy/gnr/web/gnrwebstruct/gridstruct.py:73`: view/rows;
  `:144`: cell; `:247`: database-dependent fieldcell.
- `resources/common/gnrcomponents/framegrid.py:412`: frameGrid;
  `:468`: bagGrid.
- `gnrjs/gnr_d11/js/genro_components.js:3197`: QuickGrid composition;
  `:3356`: targeted toolbar publishing; `:3449`: column normalization.
- `gnrjs/gnr_d11/js/genro_grid.js:1468`: selection write-back and onSelectedRow.
- `projects/gnrcore/packages/test/webpages/components/Grid/quickgrid.py`:
  column, edit, tools, automatic fields and selected field examples.
- `projects/gnrcore/packages/test/webpages/components/Grid/bag_grid.py:10`:
  explicit structure and Bag grid examples.
