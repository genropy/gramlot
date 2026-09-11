# Static Bag grid

The Gramlot grid displays a complete, resident `Bag` of records. Each direct
child of the store is one row and its node label is the default stable row key.
`datamode='bag'` (default) reads fields from a row's value Bag, with row-node
attributes as fallback. `datamode='attr'` reads fields directly from the row-node
attributes; no nested record Bag is needed. Both use the same grid renderer.

```python
rows = Bag()
rows.set_item('r001', None, code='C-1001', name='Ada', amount=1250.75)
root.data('rows', rows)
grid = root.quickGrid(value='^rows', datamode='attr')
grid.column('name', name='Customer', width=160)
grid.column('amount', name='Amount', dtype='N', places=2)
```

In JavaScript, `root.data('rows.r001', null, {name:'Ada', amount:1250.75})`
declares a row with attributes. Use `datamode:'attr'` on its grid. Attribute
names are literal field names; Bag-valued records also support Bag field paths.
Explicit identifiers are read using the selected representation. Their uniqueness
and required-value checks are the same in both modes.

Use `quickGrid` when the structure belongs next to the grid declaration:

```python
from decimal import Decimal

from genro_bag import Bag

rows = Bag()
rows.set_item('r001', Bag({
    'code': 'C-1001',
    'name': 'Ada',
    'amount': Decimal('1250.75'),
}))
root.data('rows', rows)
root.data('selected', 'r001')

grid = root.quickGrid(value='^rows', selectedKey='^selected')
grid.column('code', name='Code', dtype='T', width=90)
grid.column('name', name='Customer', dtype='T', width=160)
grid.column('amount', name='Amount', dtype='N', width=120, places=2)
```

The JavaScript authoring form produces the same Source structure:

```javascript
export function build(root) {
    root.data('rows.r001.code', 'C-1001');
    root.data('rows.r001.name', 'Ada');
    root.data('rows.r001.amount', 1250.75);
    root.data('selected', 'r001');

    const grid = root.quickGrid({value: '^rows', selectedKey: '^selected'});
    grid.column('code', {name: 'Code', dtype: 'T', width: 90});
    grid.column('name', {name: 'Customer', dtype: 'T', width: 160});
    grid.column('amount', {name: 'Amount', dtype: 'N', width: 120, places: 2});
}
```

`value` follows the normal binding rules. A `^` binding updates the rendered
rows when records are inserted, changed or removed, and also follows replacement
of the complete store. Column display uses the shared `dtype`, `format`, `mask`,
`locale` and `places` formatting vocabulary. Formatting does not change the
stored value.

`selectedKey` is a two-way binding. Selecting a row writes its Bag label, and
changing the bound value selects that row from outside the grid. Keep row labels
stable across updates. A field such as `code` or `id` is ordinary record data and
may be shown as a column; it does not replace the row key by default. Visible
position is never record identity.

When records already carry a stable identifier, pass its field name explicitly:

```python
grid = root.quickGrid(
    value='^rows', selectedKey='^selected', identifier='customer_id'
)
```

With `identifier`, every row must contain a non-null, unique value for that field,
and `selectedKey` reads and writes that value. Duplicate or missing identifiers
are rejected instead of falling back to the visible position.

`root.grid(store='^rows', structpath='struct')` reads the column structure from
Data, following the legacy `view_0.rows_0.cell_*` layout. `structpath` is reactive
without a `^` prefix; `.struct` resolves relative to the grid's datapath.

```python
struct = Bag()
struct.set_item('view_0.rows_0.cell_code', None,
                field='code', name='Code', width='90px', dtype='T')
struct.set_item('view_0.rows_0.cell_name', None,
                field='name', name='Customer', width=0)
root.data('struct', struct)
root.grid(store='^rows', structpath='struct')
```

The legacy-style declaration is also available:

```python
from gramlot.grid import GridStruct

struct = GridStruct()
r = struct.view().rows()
r.cell('code', name='Code', dtype='T', width='90px')
r.cell('name', name='Customer', dtype='T', width=0)
root.data('struct', struct)
root.grid(store='^rows', structpath='struct')
```

JavaScript exports `GridStruct` from `gramlot-dom`: use `new GridStruct()` and
`r.cell('code', {name:'Code', width:'90px'})`. Helpers create `view_0`, `rows_0`,
`cell_0`, etc., with tag attributes; cells have an empty string value as in the
legacy `cell()` declaration. Both empty and null values are accepted by the
renderer. Transport contains ordinary Bags, with no required authoring classes.
The **Legacy structure declaration** gallery case on the small-grid page shows
both versions with an ordinary `grid`, three records, resizing and Bag reorder.

Cell definitions live in node attributes, not node values. Bag node order determines
column order; labels provide stable column identities even when fields repeat.
Mutating attributes, moving/inserting/removing cells or replacing the structure
updates the existing viewport. `hidden` suppresses a cell without deleting its
structure node. Supported presentation attributes include `name`, `field`, `dtype`,
`format`, `mask`, `places`, `locale`, `headerClasses`, `headerStyles`, `cellClasses`
and `cellStyles`. Additional attributes remain on the Bag for future consumers.

`quickGrid(...).column(...)` now creates the same structure as a Data declaration
under `__grid_structures.grid_N` and sets `structpath`; it does not keep a second
inline column list. Use an explicit structure Bag instead of `column()` when
supplying `structpath` yourself. The former array-based `columns` input remains
compatible for existing callers; the gallery uses explicit structure Bags.

Widths accept numbers or `px` strings (default 140px). Zero means elastic: zero-width
columns share the remaining viewport space, with a 24px minimum. The definition
retains zero until the user explicitly resizes that column.

Drag a header's right edge to resize, or focus its handle and use Left/Right for
10px steps. The drag previews header and body together; release writes `width`
to the original cell node, following its label even after reorder/hiding. Escape
cancels. Unrelated attributes are retained. Changes last for the current Data
lifetime; no server persistence is implied.

This renderer currently supports one view and one row in the structure. Multiple
views/rows are rejected explicitly. Legacy columnsets, grouped headers, editor
declarations, symbolic `#WORKSPACE` paths and database-aware `fieldcell()` are not implemented.

## Resident formulas

A structure cell can calculate a field in every resident record. The result is
stored in the same Bag record or row-node attributes used by the grid:

```python
r.cell('net', formula='quantity * unit_price', calculated=True)
r.cell('vat', formula='net * vat_rate / 100',
       formula_vat_rate='^vat_rate', calculated=True)
r.cell('total', formula='net + vat', calculated=True)
```

`calculated=True` requests the initial complete-store calculation. Without it,
an existing initial value is preserved until a referenced row field changes.
References between formula fields are evaluated in dependency order, even when
the cells were declared in the opposite order. Cycles reject the structure.
Formula cells still calculate when `hidden=True`.

Attributes named `formula_name` add `name` to the expression scope. A `^` value
is reactive and recalculates the formula and its dependents across the store;
an `=` value is read passively when another dependency triggers the formula.
Literal values are passed directly. Row fields, `_currcell` and `_rowNode` are
also present in the expression scope. A failed expression stores null and is
available in `grid.changeManager.errors` for diagnostics.
An ordinary formula with a referenced null input also stores null.

The resident special forms are:

- `formula='#'`: zero-based position in current Bag order;
- `formula='+=amount'`: running amount through the current row;
- `formula='%=amount'`: the row's percentage of the resident amount total.

They recalculate after insert, delete and reorder as well as value changes.
Null/blank aggregate members are ignored, and percentages use null for an empty
or zero total.

Python Decimal values use the configured Decimal backend, without Number coercion,
for the familiar arithmetic grammar:
identifiers, numeric literals, parentheses, unary signs and `+`, `-`, `*`, `/`,
`%`, `**`. Stored results remain Decimal and are not rounded by display `places`
or `format`. General JavaScript expressions remain supported for ordinary values.
When a referenced value is Decimal, expressions outside the bounded grammar store
null rather than falling through to native operators and losing precision.

The **Calculated structure fields** gallery case combines `GridStruct`, chained
Decimal formulas, a reactive VAT parameter and the three special forms. The
5,000-row attribute page stores a reactive calculated field in every off-screen
record while retaining a bounded DOM viewport.

The base style uses 13px text, centered headers, alternating row backgrounds and
right-aligned numeric cells. CSS custom properties `--grid-font`,
`--grid-header-bg`, `--grid-row-bg`, `--grid-stripe-bg`, `--grid-hover-bg` and
`--grid-selected-bg` customize this shared style through the grid host.

Set `frozenColumns=1` to keep the first column visible during horizontal scrolling,
or a larger count for the first N columns. The default is 0. Headers and cells
use the same accumulated width offsets, including during column resizing.
The horizontal scrollbar begins after the frozen region and spans only the
unfrozen viewport. Trackpad horizontal scrolling and Shift+wheel use that same
scroll position; vertical scrolling remains shared by all columns.
The count may be bound to Data and is capped by the available columns when
rendering. Choose a frozen region narrower than the viewport to keep the
remaining columns accessible. The 50-row gallery example freezes `#` and `Code`:

```python
grid = root.quickGrid(value='^rows', frozenColumns=2)
```

The `height` attribute sizes the scrolling grid; `rowHeight` is a fixed pixel
height (default 26). Arrow Up/Down selects adjacent rows.
Arrow navigation starts from the selected row and keeps the viewport still while
the next row is fully visible. Crossing the top or bottom edge scrolls only enough
to reveal it, accounting for the sticky header.
External selection changes the selected key without automatically scrolling to it.
Deleting the selected record clears the selection binding.

Pointer/keyboard selection and deletion reconciliation publish the node topic
`onSelectedRow`. Its payload is `{key, rowNode, row, source}`: `row` is the record
Bag in Bag mode or a shallow attribute snapshot in attr mode; `rowNode` is its
store node, and `source` is `pointer`, `keyboard`, or
`reconcile`. Cleared selections carry null key/row/node. External selection
updates do not echo this topic. The DOM component emits the corresponding
`grid-selected-row` event; mounted Source declarations publish through the normal
application-local topic service.

Identifier values must be nonempty strings or finite numbers. Invalid live row
changes display an error until the store becomes valid again. Store subscriptions
belong to the connected component and are removed on disposal or replacement.

This first slice is read-only and uses a fixed-height viewport over a resident
Bag. Cell editing, sorting, search, filtersets, grouped headers, footers,
column configuration, persistence, paging and remote stores are later work.
The component is designed to accept future store adapters, but the current grid
does not load pages or persist records.

The executable gallery has two pages, each with paired Python/JavaScript examples:
**Grid — 50 rows · Bag** at `/gallery/grid/grid/` (also including a short identity
example), and **Grid — 5,000 rows · attributes** at `/gallery/grid/grid/attributes/`.
The large example stores fields on row-node attributes without nested record Bags.
See [collection store assessment](../development/collection-stores-2026-09-11.md)
for the implemented store API subset and limits.
