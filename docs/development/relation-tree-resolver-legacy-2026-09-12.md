# Legacy relation tree and explorer

Source investigation, 2026-09-12, resumed after the first RPC-backed grid example.
This is verified source behavior and a design interpretation, not a new Gramlot
implementation or authorization to migrate the full explorer.

Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`.
The owner specifically identified
`gnrpy/gnr/sql/gnrsqlmodel/resolvers.py` and `RelationTreeResolver`.

## Three distinct layers

1. **Model traversal:** `RelationTreeResolver` exposes physical fields and lazy
   relation branches from the already-built database model. It does not fetch
   records, populate a grid selection, or introspect SQL schema on every expansion.
2. **Explorer metadata:** `SqlTable.relationExplorer` turns that model into a
   field chooser with paths, captions, groups, relation direction and filtering.
3. **Browser expansion:** the legacy Page's `relationExplorer` endpoint and
   `dbRelationExplorerFull` convert relation branches into remote-resolver recipes.

These layers explain how an application could explore fields several joins away
without the browser knowing the database implementation or fetching all records.
A collection of records and a catalogue of selectable fields are separate objects.

## RelationTreeResolver

`gnrpy/gnr/sql/gnrsqlmodel/resolvers.py:38–218`:

- Parameters: `main_tbl`, `tbl_name`, `pkg_name`, `path`, `parentpath`, with
  `cacheTime=0` and `readOnly=True` by default. `setDbroot` attaches the database.
- `load()` checks that the target package is loaded, resolves the root model table,
  and calls `_fields` for one table. An unloaded package produces a warning and None.
- Physical columns become null-valued Bag nodes with their column attributes,
  plus `prfx`, `table` and `pkg`.
- Many-to-one relations (`mode='O'`) produce an additional relation-labelled node
  carrying the foreign-key column attributes and a `joiner` dictionary. Its value
  is another RelationTreeResolver, targeting the one-side table.
- Virtual columns participate here when they have a corresponding one-side
  relation; ordinary virtual fields are added later by relationExplorer.
- One-to-many relations (`mode='M'`) also become lazy relation-labelled branches,
  targeting the many-side table and carrying the joiner.
- Breadcrumbs accumulate `*O`, `*M` or `*m` and table identifiers. The M/m choice
  uses the inspected table's single-column/`_id` heuristic; it should not be
  promoted into a general cardinality contract.

Opening a branch creates that table's fields and further lazy branches. It does
not eagerly walk the entire relation graph.

### Cache and misleading comments

`DbTableObj.newRelationResolver` configures the root and attaches dbroot
(`gnrsqlmodel/table.py:83`). Its `relations` property (`:277`) caches the expanded
root in `db.currentEnv['_relations'][table_fullname]`, creating the resolver with
`cacheTime=-1`. Thus this cache follows the current thread environment; our contrib
cleanup of currentEnv also clears this cache between invocations.

The base BagResolver uses zero for loading on every call, negative cacheTime for
an effectively indefinite instance cache, and positive values as seconds
(`gnr/core/gnrbag.py:2678–2725`).

The resolver's docstrings claim double-checked locking and describe `path` as cycle
protection. The inspected implementation has neither a lock nor a visited-path
rejection in `_fields`. Do not repeat those comments as verified behavior.
Lazy expansion bounds each individual operation; it is not by itself cycle
elimination. The explorer adds a separate relationStack mechanism below.

`resolverSerialize` prepares `_serialized_app_handler='maindb'` and delegates to
BagResolver. In the inspected base method, the provided args/kwargs are ignored
in favor of `_initArgs/_initKwargs`; therefore the claimed marker substitution is
not established by this code. This Python serialization path is not a portable
browser resolver contract in any event.

## SqlTable.relationExplorer

`gnrpy/gnr/sql/gnrsqltable/utils.py:456–642`; `db.relationExplorer` is a facade in
`gnrpy/gnr/sql/gnrsql/query.py:378`.

For each model node it derives a `fieldpath` by appending its label to the parent
path. For relations it flattens `joiner` into attributes, obtains a relation name,
and assigns `dtype='RO'` for the one-side or `dtype='RM'` for the many-side.
RO nodes also retain foreign-key attributes as `fkey`. This dtype describes the
explorer node; it is not the data type of a fetched scalar value.

It adds ordinary virtual columns and table aliases. It handles groups, optional
sorting/group containers, omit prefixes, encrypted-field rules, application
preferences and optional column permission results. These are behavior owned by
the database/application integration, not implicit browser permissions.

A directional relation key is hashed and compared with `relationStack` to omit
already-traversed edges. This is an edge-based traversal check, not a guarantee
that every table occurs only once. Python hash values must not be treated as
stable portable identifiers across processes.

With `pyresolver=True`, relation nodes receive a BagCbResolver for the target
table's relationExplorer. The inspected closure forwards the incoming stack and
kwargs but does not explicitly forward the newly computed node stack or
checkPermissions. Consequently identical cycle/permission propagation across
Python and browser expansion paths is not verified; do not promise parity.

## Legacy Page and browser

`gnrpy/gnr/web/gnrwebpage.py:2783–2880`:

- The public `relationExplorer` resolves permission parameters and optional
  user-configured item trees (`item_type`, `_RAW_`, `_NO_`).
- `dbRelationExplorerFull` converts `name_long` to `caption`, supplies translated
  `fullcaption`, and replaces relation values with a JavaScript remote-resolver
  expression marked `_T='JS'`.
- That expression calls `genro.rpc.remoteResolver('relationExplorer', ...)` with
  the target table, accumulated field/caption path, omit, current-record path,
  relationStack and a permission-check flag.
- Additional branches support subfields/templates and record-dependent Bag-field
  exploration. They are more than ordinary SQL relationships.

The model resolver itself does not perform browser networking. The Page layer
creates the browser-facing lazy service contract.

## Implications for Gramlot — proposals

The existing states grid proves record loading only. A future field chooser could
use a separate metadata service: expand a table/field path, receive a finite list
of fields and relation descriptors, and request children only when expanded.

Keep the reusable tree/store interaction and typed transport in Gramlot. Keep
GenroPy model traversal, path semantics, column permissions and relation metadata
in `gramlot.contrib.fastapi_genropy`; another backend can implement a different
provider. A plain GnrApp does not supply every legacy Page policy automatically.

Do not send a live legacy resolver through our current Bag normalizer, which
explicitly rejects lazy resolvers. Materialize only the requested level and return
plain typed descriptors with a logical expansion method and parameters. Prefer
that data contract to executing server-generated JS expressions. No such endpoint
or descriptor format is implemented yet.

For grid configuration, the useful bridge is `fieldpath`: choosing a field can
supply a column definition and, when supported by its backend, a query column
expression. Expanding a many-side relation does not decide how to aggregate or
flatten its records; that remains a query/selection decision.

Before implementation, settle the descriptor shape, relation identity/cycle
limits, permission propagation, metadata caching and how a field selection edits
the grid structure. Do not silently include automatic joins, editable related
records, a query builder or all legacy subfield features in this first store slice.
