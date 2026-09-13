# Relation tree through RPC

Local implementation and verification, 2026-09-13. No commit, tag, deployment or
release is implied. This follows the owner's request to preserve the legacy
relation tree while adapting legacy Bags, as already done for grid selections.

## Wire and browser behavior

`gramlot.resolvers.RpcResolver` is a portable description of a named page endpoint
and its parameters. It travels in a normal Gramlot Bag using the existing Bag
`::RSLV:` representation inside TYTX JSON. It cannot execute in Python.
`gramlot.transport.snapshot` preserves this descriptor without reading its value;
other unadapted node resolvers are rejected without executing them.

The JavaScript counterpart is explicitly registered under the same wire identity.
Decoding constructs an inert resolver. `ServerCallService` binds returned
resolvers to the receiving page's existing RPC service and originating SourceNode.
Reading the node uses that service, including its role-checked endpoint route,
timeout and owner cancellation. Child responses undergo the same binding.
Overlapping reads share one pending call. Successful values have a 300-second
cache by default; failed calls remain retryable.

`storeTree` reads node values statically during rendering. A resolver makes a node
expandable even before its value exists. Opening it awaits the value, displays
loading/error state, and renders the returned Bag. Closing and reopening retries
an error. Detached tree rows cannot publish stale UI updates. A collapsed branch
does not cause RPC during initial rendering or deserialization.

## Genropy boundary

`GenropyPage.relation_tree(table, path=None)` is an inherited `@endpoint`.
A page opts in with `relation_roots = ('invc.customer', ...)`; the default exposes
no table. Each request validates the root and a list of at most 32 relation labels,
then follows actual `RelationTreeResolver` nodes in the model. Ordinary fields
cannot be used as traversal steps. The path is replayed from the root for each
request; no legacy resolver, page instance or open connection is stored remotely.

Only the requested model level is converted. Scalar fields and node attributes
become normal Gramlot Bag values and attributes. Each lazy legacy relation becomes
an `RpcResolver` pointing to this endpoint with the root table and accumulated
path. The original legacy resolver and its `dbroot` never cross the wire.
Captions use the application's Genropy localizer. The contrib's normal worker
lifecycle closes the connection and clears the environment after materialization.
The generic `legacy_to_gramlot` converter still rejects arbitrary lazy resolvers.

Descriptors are untrusted endpoint arguments, not capabilities or executable
Python imports. Root/path validation runs on every expansion. This first endpoint
exposes model metadata reachable from declared roots, including related tables;
it does not reproduce legacy Page column permissions, preference filtering,
relationExplorer grouping or virtual-field enrichment. Applications needing such
policies must override and redecorate the endpoint before exposing it.

Cycles remain navigable as repeated paths, bounded by the 32-step request limit;
this is not cycle elimination. No record query, automatic join, grid-column editor
or general migration of every legacy resolver is included.

## Example and verification

`docs/examples/states-grid/pages/relation-tree.py` uses the normal FastAPI example
shell, bordered live panel, Python CodeMirror source and inspector link. The shared
navigation lists it at `/database/relation-tree/` when Genropy is enabled.

Verified against `GnrApp('test_invoice_pg')` through FastAPI's actual RPC dispatch:

- Customer: 25 nodes, six lazy relations.
- Customer → invoices: 18 nodes, six lazy relations.
- Customer → invoices → rows: 16 nodes, three lazy relations.
- An undeclared root and traversal through an ordinary field are rejected.

Chromium verification passed root loading, both nested expansions, no eager
requests, reopening from cache, visible Python source and no JavaScript errors.
Unit tests cover inert transport, rejection without resolution, service binding,
coalescing, tree loading and error retry. The real-model Python test and browser
scenario are opt-in via `GRAMLOT_TEST_GENROPY_INSTANCE=test_invoice_pg`.

Regression verification: 373 JavaScript tests passed. With the CI test-client
layout prepared, 150 Python tests passed and five optional tests were skipped;
the single sandbox-blocked manual-server test passed when rerun with localhost
binding allowed (both manual CLI tests passed). The optional real Genropy run
passed all four resolver tests. No data writes were performed.

## Compact dtype presentation

The customer example uses `pane.relationTree('invc.customer')`. This registered
component specializes `storeTree` with dtype and relation-direction presentation.
Neutral type badges are 18 × 14 pixels;
ascending relations use green with white type symbols, descending relations blue.
The contrib derives a relation's dtype from its joining foreign-key column,
including many-side branches that lack dtype in the original resolver metadata.
Direction and dtype remain available as text in the badge tooltip. The chevron
remains separate. Only this example uses 20-pixel rows with zero vertical padding;
ordinary trees and the inspector keep their existing presentation.

The Python authoring declaration emits a standard `dataRpc` and the registered
`relationTree` component, with a unique Data store path per declaration.
`rpcmethod='relation_tree'` selects the provider and `storepath` can name the store
explicitly. Other keyword arguments configure the tree, including `selectedPath`.
The component reuses storeTree's lazy expansion and store reconciliation.
`GenropyPage.relation_roots` still explicitly controls which roots may be exposed;
creating the widget does not grant database access.

## Virtual columns and attribute inspection

The endpoint now appends the current table's model virtual columns at every
expanded level. The earlier node counts above predate this enrichment.
`column_kind` distinguishes `alias` (`relation_path`), `composite` (`composed_of`,
checked before its generated SQL formula), `python` (`py_method`), `formula`
(`sql_formula`, `select` or `exists`), and otherwise `virtual`. The actual dtype
is retained. Small separate markers distinguish these kinds without reusing the
relation-direction colors. No SQL formula or Python column method is evaluated.

The relationTree component shows a circled information button on row hover or
keyboard focus. Hovering/focusing it opens an attribute table, including nested
metadata; clicking also opens it for touch. Escape dismisses it. Content is
inserted as text, not HTML. Inspecting attributes never reads the node value or
triggers an expansion RPC. Browser verification passed on customer's Full Address
formula; the real price_year model also verified composite metadata with dtype JS.

## Legacy group filtering and example model groups

Verified against `erpy/packages/erpy_base/model/anagrafica.py` in the separate
`genropy_projects` checkout and legacy `SqlTable.relationExplorer`:

- `omit` excludes a node by the first character of its group code. The default
  for this component is `_`; callers may use `omit='_*'` or `omit=''`.
  Prefixes `_` and `*` are stripped from retained group codes.
- `subgroup_...` attributes supply values for percent substitutions in group codes.
- `dosort=True` sorts dot-separated group segments and turns declared `group_...`
  table metadata into nested Bags. A final numeric segment orders fields without
  creating a numeric folder. Numeric root groups such as `001` keep fields at root.
- Relations use `one_group` or `many_group`, separately from their key column's group.
- Visual groups never enter the RPC model path. Each field retains `fieldpath`;
  opening a group is local and opening a relation calls the existing resolver.
- Group filtering is presentation, not authorization or the full legacy encrypted
  field/preference/permission filtering policy.

Owner-authorized local changes in the separate Genropy repository add group
metadata to `projects/test_invoice/packages/invc/model/customer.py`: Address,
Contacts, Billing, Invoice activity, Other and Relations. Existing System and
Subtables definitions are retained. The customer relation definitions in
`invoice.py` and `invoice_row.py` supply `many_group` for the inverse branches.
Only metadata was edited; no schema update, record write, commit or deployment
was performed. Preserve these three local model edits along with the framework
work. ERP itself was read only.

The alias/formula/composite marker now follows the caption, keeping field names
aligned. Real-model verification passed (six Python tests), as did eighteen tree
tests and the browser checks for grouping, omission, alignment, and relation RPC
paths inside groups.
# Subtable visibility correction

Owner decision: subtable formulas represent record subsets, not field groups.
The relation tree omits the generated `subtable_<name>` virtual columns using
the current table model's declared subtables. Their definitions remain intact
in the legacy model; no empty Subtables group is created. Ordinary formula
columns remain visible. A possible extra subtable icon is not yet specified.
Verified with the real `test_invoice_pg` RPC integration (six focused tests pass).

## Optional descending relation groups

Descending relations appear directly at their table level by default. Set
`pane.relationTree('invc.customer', groupDescending=True)` to honor their
model groups. The option propagates through lazy RPC expansion. Group metadata,
ordering and omission rules are preserved in both modes. Group captions use
normal-weight, left-aligned gray text with a small diamond and no background;
virtual column captions use italics; formula captions additionally use orange,
while aliases retain their normal caption color. This replaces the earlier semibold and
rounded-background trials following owner feedback, without increasing row height.

The boolean dtype badge uses `◉` instead of a check mark, to avoid suggesting
that the field's value is checked. It remains a static type indicator.

Field groups do not add indentation to their children. They provide collapsible
section headings, while expanded relations retain their normal indentation.

## Dtype labels replace symbol trials

Owner decision: badges now display the literal dtype code (A, B, N, DH, etc.),
with an expanded English type name in the tooltip. This supersedes all earlier
boolean, numeric and datetime icon trials. Relation colors remain unchanged.

## Potential subquery cost

A small subdued turtle immediately after the caption marks `subquery_paths`.
The optional Genropy adapter derives these hints from subquery/select/exists
metadata, select_* definitions, SELECT in formula SQL, and recursive formula
or alias dependencies. Traversal is cycle-safe and bounded to 32 steps. Quoted
SQL literals and comments are ignored. This is static best-effort detection,
not a full SQL parser or a measured performance classification; dynamic SQL,
functions and runtime Python costs are not covered. Tooltips explain the paths.
Real customer integration verifies direct and indirect hints and unmarked
simple formulas/aliases. Alias and formula kind icons are no longer displayed.

The subquery hint now uses a small unfilled SVG shell outline instead of the
full turtle emoji. Python columns use a snake immediately after the caption,
replacing the Py marker. Both remain secondary to the dtype badge.

Latest icon choice: a small subdued snail replaces the subquery shell. Composite
columns use chain links after the caption. Python columns use the blue/yellow
Python logo from python.org/community/logos/, superseding the snake emoji.

## Favorite fields

The relationTree component receives the root table from the Python declaration.
Field rows show a heart before the info control on hover or keyboard focus.
Clicking toggles the field without selecting it or resolving any lazy branches.
A collapsible Preferiti branch precedes a separate root named after the table.
Favorites use a heart heading and indented children with a hover trash control
for removal. Model rows keep the hover heart toggle. Favorites retain dtype,
styling and attribute inspection. Ordinary field groups remain unindented.
Preferences live in browser localStorage under
`gramlot.relationTree.favorites.v1:<table>` (therefore also scoped by origin).
They retain the full logical field path, original selection path and a metadata
snapshot, so a favorite from a closed relation is visible after reopening the
page without eager RPC. Snapshots are not live model validation; schema changes
can leave obsolete favorites, removable using the same heart. Unavailable
storage falls back to memory. Record values are never persisted.
Verified: 19 tree tests, including persistence, table isolation, removal and
unchanged selection; Python authoring carries the table attribute.

## Internal and human names

The toolbar toggles Internal names. Fields/relations display node names when on
and captions when off; the root uses the table name or translated table caption.
Favorites display the full logical field path or the concatenated human path,
including @ relation prefixes. The adapter supplies fullcaption independently
of visual groups. Existing favorites refresh their metadata when their model
branch is loaded; older snapshots lacking fullcaption retain the technical path
until then. Switching display mode does not alter selection paths or resolve
unopened branches.

## Consolidated UI choices

Current rendering supersedes the icon experiments above: literal dtype badges;
green ascending and blue descending relations, both prefixed @; italic virtual
columns with orange formulas; gray unfilled turtle, chain and Python marks.
Groups have gray left-aligned captions and unindented children. The table is a
separate root below Favorites, whose children are indented. Empty Favorites is
hidden and its first appearance is collapsed. Adding the first favorite thus
inserts its heading; it does not automatically expand the branch. Selected
hearts remain visible; favorites use a small outlined trash control on hover.
The toolbar switches technical versus human names, including full favorite
paths. Local metadata snapshots are refreshed when the corresponding branches
are rendered; this is not schema migration or server-side preference storage.
