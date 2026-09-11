# Grid architecture proposal

Status: design proposal, not implemented.

Latest owner scope supersedes the initial delivery sequence: start with a complete
static Bag store, no data paging, IndexedDB or workers. Keep alternative backends
as future extensions. See [static grid plan](static-grid-plan-2026-09-11.md).
Remote/cache details below are exploratory background, not current requirements.

Owner correction: legacy virtual grids were not editable. Virtual editing in
this document is only an optional future architectural possibility, not legacy
parity or an approved delivery requirement. Static-grid editing is the current
reference. SearchOn local filtering must be included in the design. The owner explicitly requests a broad
architecture covering static and virtual stores, editable grids, formulas,
column groups and footers. Delivery may be incremental; these are architectural
requirements rather than features to retrofit after a flat table prototype.

## Legacy findings

See `grid-legacy-audit-2026-09-11.md` for authoring and Dojo adapters.
Additional inspected sources under `/Users/gporcari/Sviluppo/Genropy/genropy/`:

- `gnrjs/gnr_d11/js/genro_wdg.js:845`: GridEditor, widget lifecycle, per-column
  editing, parent-form registration, autosave and remote row controllers.
- `:1172`: save and changesets divided into inserted, updated and deleted rows;
  `:1849`: editor exit waits for RPC/validation before destroying the widget
  and moving to the next editable cell.
- `:2014`: GridChangeManager coordinates formulas, totals and Bag changes.
  `:2126` detects formula dependencies with regular expressions over field names.
  `:2160` evaluates row expressions, formula_* parameters, += progressives,
  %= percentages of totals and # row numbering. Exceptions currently produce
  null; results are written back to the store. Some calculations use display
  format to round numbers. Neither behavior should be inherited accidentally.
- `genro_components.js:6580`: collection abstraction; `:7089` BagRows;
  `:7175` ValuesBagRows; `:7247` AttributesBagRows; `:7366` Selection;
  `:7829` VirtualSelection, with page cache, pending requests and chunk loading.
  `:8092` sends row_start/row_count to a server-side selection.

These are inspected code paths, not exhaustive behavioral verification of legacy.

## One component, distinct responsibilities

The following responsibility names are conceptual, not frozen public classes.

| Responsibility | Owns |
| --- | --- |
| Structure | Column identity, field mapping, dtype, display/editor configuration, groups and footer definitions |
| Collection store | Row identity, query, ordering, range access, notifications and capability reporting |
| Viewport/layout | Visible rows, column geometry, shared header/body/footer tracks and focus anchors |
| Edit session | Drafts, validation, pending edits, baseline, changesets and commit/cancel operations |
| Calculation service | Dependencies, typed expressions, derived cells and aggregate requests |
| Persistence adapter | Saving changes, server validation, revisions, conflicts and assigned identifiers |

quickGrid and explicit struct authoring normalize to the same structure. Python
serializes declarations; JavaScript performs runtime behavior. A callback used
to author a Python struct executes while building, not in the browser.
Component descriptions should generate Python declarations as elsewhere in
Gramlot. Native HTML table/layout remains an implementation choice behind the
component, not the data/editing contract.

## Store contract

Support a resident Bag adapter and a virtual range provider. Both expose stable
row keys, typed row/field access, change subscriptions, query revision and
capabilities. A candidate range operation accepts start, count, query revision
and cancellation signal, returning keyed rows, loading/error information,
known total count or an explicitly unknown count, and the matching revision.
A key lookup must distinguish missing from not loaded. Row index is view position,
never identity. A field mapping and key extractor can support attribute-backed
rows without teaching rendering two Bag representations.

Static/virtual describes data residency. Read-only/editable describes mutation
capability. Persistent/in-memory describes storage. These are independent axes;
virtual DOM rendering is also independent of remote data virtualization.

Sort/filter changes start a new query revision. Cancel obsolete requests and
ignore late responses. Cache by query revision and range; deduplicate concurrent
requests, bound eviction and allow retry without losing edits. A remote provider
owns global sorting/filtering; do not sort just loaded pages and claim global
ordering. Report unsupported capabilities explicitly.

Pending updates live in an overlay keyed by stable identity, outside the page
cache. Eviction cannot discard them. Inserts use temporary stable keys and accept
an explicit key remap on save. Remote inserts/deletes may require query refresh
because their global position is not necessarily known. Provider-specific
transport and SQL metadata remain outside Gramlot core.

## SearchOn and static filtering

Verified legacy chain: toolbar slot_searchOn creates SearchBox; it publishes
<searchId>_changedValue with text and selected field; enableSearchBox calls
applyFilter; the collection compiles a predicate and builds _filtered, an index
projection over existing rows. The original Bag remains intact. Clearing search
removes its predicate; other active filters may still apply. Filtered totals and
visible counts update.

SearchBox supports a field-selection menu, explicit caption:field entries,
field1+field2 combined search and automatically inferred fields. Text matching
uses case-insensitive regular expressions, while typed numeric/date searches
parse comparison operators and localized values. Filter sets compose OR within
each selected group and AND across groups, then AND with SearchOn. Additional
include/exclude lists also participate. This is distinct from a server query.

For Gramlot, separate search input/parser, typed filter description and store
projection. Preserve raw typed rows and stable identities while filtering. Define
invalid search handling, literal versus regex mode, and behavior when editing
makes the current row fail the filter. Do not silently apply static filtering
only to loaded pages of a virtual store.

Evidence: genro_components.js:1965 (SearchBox), :6378 (slot), :6979 (predicate),
:7018 (projection); genro_grid.js:1046 (subscription), :1354 (automatic fields),
:2716 (applyFilter); genro_wdg.js:1960 (GridFilterManager).

### Filterset button groups

Verified `resources/common/gnrcomponents/framegrid.py:155` builds the filterset
control from a named hook (`filterset_<name>`) or `filterlistCb`. Each option is
stored as Bag-node attributes (code, caption, cb, cb_* and isDefault) under
`.grid.filterset.<name>.data`; selected codes live in `.current`.
`multiButton(items='^.data', value='^.current')` is the normal presentation,
with multivalue and mandatory options. The same model can instead be rendered
as popup checkBoxText or filteringSelect. Thus button layout is not filter logic.
A group with no active predicates contributes no constraint; selected predicates
are ORed within a group, and active groups are ANDed, together with SearchOn.

Gramlot should preserve this split: reusable choice controls bound to filter
state, and a composable filter model evaluated by the store. Explicitly define
an All option as no constraint. UI labels, single/multiple selection and default
choices belong to the control/model; predicates and typed parameters belong to
the filtering contract. Legacy callbacks are JavaScript expressions evaluated
locally, not portable server query descriptions. New remote adapters must not
assume those callbacks translate automatically to a server query.

## Selection, groups and footers

Selection is stored by key and works in both directions. Focus is a key/column
pair, not a DOM cell reference. Virtual providers need locate-by-key or an
explicit inability to scroll to an unloaded selection. Distinguish explicit
selected keys from a future query-wide selection with exclusions.

Header groups, column headings, body cells and footer rows share one column
order/visibility/width model. Group spans derive from that model. Define behavior
for noncontiguous groups on reorder (split runs or constrain movement), rather
than silently creating a span over unrelated columns. Column and group IDs must
remain stable across structure updates.

Footer values may be literal, bound, calculated or aggregate results. Define
aggregate scope explicitly: all matching rows, filtered rows, selected rows or
loaded rows. Carry completeness/pending/error metadata. A loaded-page subtotal
must never appear as a complete remote total. Provider aggregates must identify
the query revision and whether local pending edits are included. Only adjust
server aggregates locally when the aggregate and filter semantics permit it.

## Live structure editing and configurator

Owner requirement: preserve interactive column reorder and the grid configuration
palette. Legacy `genro_grid.js:2134` moves the column node in the structure Bag;
`:1002` writes resized widths back to it. These are model changes, not merely
DOM rearrangements. `resources/common/th/th_viewconfigurator.js:345` constructs
an independent palette with column, columnset and structure editors, using grids
to edit the grid configuration. It supports configuration copying and saving.
Saved named views use adm.userobject; resource and temporary structures are also
supported. External field drops may obtain database metadata through server calls.

For Gramlot, the reactive structure is the canonical live configuration. Reorder,
resize, visibility and palette edits must use the same structure mutation path.
Maintain stable column identity distinct from position and field binding; reconcile
active editor/focus, groups and footer alignment when structure changes. Validate
changes atomically and support restoring the authored base view. A named saved
view is a configuration preset, distinct from a historical Dojo layout view.

The configurator should be a separate consumer of the public grid/structure API,
not required for rendering. Separate configuration persistence from row-data
persistence: local/standalone and server adapters can save the same versioned
configuration with different policies. Do not assume legacy adm.userobject exists
in Gramlot. Preserve declaration provenance and handle obsolete fields on reload.
Start with explicit descriptors for configurable properties; formulas/editors need
validation, and remote field catalogs belong to optional provider integrations.

## Editing contract

Reuse Gramlot controls, validation and formatting through a cell editor adapter.
Keep the text draft separate from typed data, and distinguish confirming a cell
from saving changes to a backend. Candidate lifecycle:

idle → editing → validating → applied locally → saving → saved/conflict/error.

Escape cancels the current draft. Enter/Tab confirm and navigate only after the
relevant validation completes; invalid input stays available for correction.
Focus moving into an editor-owned popup is not editor exit. Async validation
and remote calculations carry edit revisions so stale responses cannot overwrite
new input. Closing, scrolling or recycling a row must follow an explicit editor
policy (pin editor, confirm or cancel), never silently discard the draft.

Keep typed baseline and pending changes for inserted/updated/deleted rows.
Changesets use stable keys and base revisions. Save acknowledgements apply to
exact submitted revisions; newer edits made during save remain dirty. Define
partial success per row, server-assigned keys, conflicts and retry. Parent forms
can coordinate the edit session without requiring every grid to belong to a form.
Autosave is a policy over the same session, not an alternate save implementation.

## Formulas and aggregates

Preserve familiar row expressions such as formula='quantity * price' and
formula_* parameters, but normalize dependencies explicitly. Reuse or extend
Gramlot's existing expression facilities after checking their actual contract;
do not add another unrelated evaluator. For a bounded expression grammar use
parsed references; arbitrary author callbacks require declared dependencies.
Build a dependency graph, detect cycles and recalculate in dependency order,
batching notifications so formula writes do not recursively trigger themselves.

Define null/blank behavior, division by zero, missing/loading inputs, errors and
numeric promotion. Decimal arithmetic must preserve decimal semantics; format
and places affect presentation, not calculation precision. Calculation errors
are explicit states, not silent nulls.

Separate row-local expressions, collection aggregates and ordered/window
calculations (progressives, ranks and percentage-of-total). Row-local formulas
can run on loaded rows; global/window expressions need complete data or a
provider result with query/order semantics. Legacy +=, %= and # can later map
to these categories, but need explicit ordering and completeness contracts.

Derived values need a policy: view-only or materialized into row data. A computed
result must not become a user edit or a saved field by accident. Define formula
fields' editability, allowed overrides and persistence inclusion explicitly.
Remote row controllers are async calculation/validation adapters, with declared
inputs and outputs and revision checks, not arbitrary callbacks buried in cells.

## Events and commands

Use the existing genro coordinator and node-scoped publish/subscribe. Preserve
familiar selection topics where useful, with stable row keys, field/column,
origin and revision in payloads. Route add/delete/duplicate/save through edit
session operations. Bag/store subscriptions carry data changes; topics announce
semantic actions. Avoid duplicate event paths and feedback loops.

## Delivery and contract checks

1. Specify store, structure and edit/calculation contracts; implement resident
   and deterministic fake virtual providers to exercise the same interface.
2. Read-only grid and quickGrid with groups, footer layout, bidirectional stable
   selection and local/remote query behavior.
3. Reusable cell editing, validation, overlay and changesets; in-memory save
   adapter plus simulated delayed/failed/conflicting saves.
4. Row formulas, parameters and dependency checks; then aggregates and ordered
   calculations with explicit completeness semantics.
5. Real transport adapters, performance work, richer tools and provider features.

Required cases include: sorting after selection; store replacement; hidden or
resized grouped columns; footer alignment; out-of-order fetches; unknown counts;
page eviction with edits; async validation after Escape; editing during save;
partial save failures; assigned-key remapping; external changes to dirty rows;
formula chains/cycles; Decimal precision; incomplete remote totals; and disposal
with requests/editors/subscriptions active. Cover Python→JS declaration parity,
keyboard navigation and browser focus/popup behavior, not only DOM snapshots.

Before implementation, settle the public store binding/key spelling, derived
value policy and default aggregate scope. The architecture above recommends
explicit semantics while leaving naming choices open for owner discussion.
