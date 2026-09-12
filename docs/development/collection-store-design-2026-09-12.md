# Collection stores: legacy continuity and first RPC design

Status: original design plus a locally implemented first slice, 2026-09-12.
Read the final implementation checkpoint for current behavior. This expands the design horizon of the bounded resident-store
implementation; it does not invalidate that implementation or add release gates.

## Approved direction and existing baseline

The owner wants to recover the power of legacy collection stores, preserving APIs
where possible and at least preserving their philosophy. Applications declare a
collection; consumers use its services independently of the data backend. Keep
Python authoring, reactive SourceNode ownership and ordinary Gramlot RPC.

The approved selection boundary is fetch results normalized by a dedicated server
adapter into JSON-shaped typed rows and metadata, transported with TYTX, and
converted into a Gramlot Bag in JavaScript. MessagePack is a possible later RPC
transport. Arbitrary JSON RPC results must not automatically become Bags.

Currently `js/dom/src/stores/bag-rows.js` implements resident `BagRows`,
`ValuesBagRows` and `AttributesBagRows`. The grid owns its adapter and exposes
`collectionStore()`. Shared Source-declared stores, RPC loading and virtual
collections are not implemented. See [the resident assessment](collection-stores-2026-09-11.md).

## Verified legacy connections

Evidence paths below are relative to the legacy Genropy checkout, not Gramlot.

| Python declaration | Browser class | Loading |
| --- | --- | --- |
| `bagStore` | `ValuesBagRows` by default | Resident Data Bag; optional dataController input |
| `selectionStore` | `Selection` | `app.getSelection` through dataRpc |
| `selectionStore(chunkSize=...)` | `VirtualSelection` | Selection loaded in blocks |
| `rpcStore(rpcmethod=...)` | `RpcBase` | Author-selected RPC method |
| `fsStore` | `FileSystem`, extending `RpcBase` | `app.getFileSystemSelection` |

The Python helpers in `gnrpy/gnr/web/gnrwebstruct/dojo11.py:191–318`
create a node named `<storeCode>_store` and set the owning grid's `store` attribute.
`storepath` is a Data location, not the store's identity. The grid resolves that
SourceNode and reads its `.store`, then subscribes to `updateRows`
(`gnrjs/gnr_d11/js/genro_grid.js:4829`).

`SelectionStore` constructs a reactive dataController starter and a dataRpc node;
reactive RPC parameter references become passive reads so the starter governs
loading. The instance is attached to the RPC node and starter. See
`gnrjs/gnr_d11/js/genro_components.js:6475–6579`.

The shared hierarchy is `_Collection` → `BagRows` → value/attribute row variants.
`Selection` and `RpcBase` extend `AttributesBagRows`; `FileSystem` extends
`RpcBase`; `VirtualSelection` extends `Selection`. Selection also subscribes to
legacy table events. These integrations are not supplied by a plain GnrApp.

Filesystem rows come from server-side storage resolvers, not browser filesystem
access. The flat result stores fields in row attributes, uses the absolute storage
path as `_pkey`, and returns `(result, resultAttributes)`; hierarchical mode returns
the tree. See `gnrpy/gnr/web/gnrwebpage_proxy/apphandler/misc.py:688`.

## Proposed authoring surface

The following is **proposed syntax, not an executable recipe today**:

```python
def main(self, root):
    root.rpcStore(
        storeCode='states', storepath='.states',
        rpcmethod='load_states', _identifier='code', _onStart=True,
    )
    root.grid(store='states', structpath='.states_struct')

@endpoint
def load_states(self):
    rows = self.db.table('invc.state').query(
        columns='$code,$name,$region_code', order_by='$name'
    ).fetch()
    return self.selection_result(rows, identifier='code')
```

`selection_result` is a proposed contrib normalization helper, not an existing
GenropyPage method. The snippet omits the ordinary grid structure declaration and
example-panel wrapper to show the store contract only. The actual example must
show the complete executed Python recipe in the shared live/code panel.

Prefer keeping `rpcStore`, `rpcmethod`, `storeCode`, `storepath` and `_identifier`
from legacy. The grid's new `store` reference should coexist with its existing
direct Data binding; conflicting declarations should raise a useful error.
Preserve `bagStore` for resident collections. Reserve database `selectionStore`
and filesystem convenience declarations for providers that can fulfill their
contract; core must not silently resolve an implicit legacy `app.getSelection`.

The helper materializes and normalizes fetched row objects in the endpoint worker,
before DB cleanup. It preserves SQL row order and typed values. Do not use legacy
`fetchAsBag` or a lossy `fetchAsJson` intermediate.

## Proposed selection result, distinct from the RPC envelope

Inside the existing RPC `result`, propose:

```python
{
    'rows': [
        {'code': 'NSW', 'name': 'New South Wales', 'region_code': '...'},
    ],
    'identifier': 'code',
    'metadata': {'totalrows': 1},
}
```

This is an illustrative shape, not a database observation. Exact names remain
proposals. The explicit RPC-store consumer interprets this result; ordinary
dataRpc continues to receive ordinary data. No payload discriminator is needed
for the initial explicit consumer unless later use cases require one.

The browser validates the complete payload before replacing Data. Missing or
duplicate identities fail without destroying the last valid collection. Null,
zero, dates and decimals retain their typed meaning. Synthetic Bag labels such as
`r_0` are structural labels; the identifier field supplies record identity and
must not be interpreted as a Bag path. Initial rows use `datamode='attr'`, already
supported by Gramlot, keeping a later value-Bag option explicit.

Selection metadata belongs to the collection result. It must remain distinct
from RPC `resultattrs` and diagnostic headers, whose general contract is still
open. A full resident result can report totalrows; a partial result must never
claim its loaded row count is the total. Pagination requires an additional
explicit contract, not a guess based on response length.

## Ownership and loading

Propose an application-scoped registry keyed by storeCode. A declaring SourceNode
owns the instance, requests and subscriptions. Grids borrow the instance, detach
on removal, and do not dispose a shared store. Duplicate codes fail. A removed
owner unregisters the store and prevents pending results from writing detached
Data; a grid must not keep using a disposed instance. Define forward-reference
resolution during Source mounting and actionable missing-store diagnostics.

Keep existing direct-bound grids working with their owned resident adapter.
Extract common ownership interfaces rather than making two copies of BagRows.

Loading reuses dataRpc and its SourceNode lifecycle: `_onStart`, reactive `^`
parameters, passive `=` parameters and `_delay`. Preserve the approved busy
refusal while a request is pending; do not introduce a queue, automatic replay or
`_concurrency`. The loading service must not create a second independent HTTP
or pending-state implementation. Invalid results and errors retain prior data
and expose an error; successful replacement notifies all consumers atomically.
These retention semantics are a proposal, differing from legacy paths that clear
the store on RPC failure.

Retain selection by stable key across reloads when the row still exists. Selection
belongs to each grid, so two grids sharing a store may select different rows.

## Compatibility map and full migration horizon

| Capability | Direction | Readiness |
| --- | --- | --- |
| Row access, identities, updates, subscriptions | Reuse existing BagRows and familiar methods | Implemented subset |
| Source declarations and shared store lookup | Preserve legacy vocabulary with explicit ownership | First experiment |
| RPC loading and typed selection normalization | Compose with Gramlot dataRpc | First experiment |
| Filtering and sorting | Separate resident projections from server query parameters | Design needed |
| Virtual selections and cache | Explicit total, stable ordering, block identity and invalidation | Design needed |
| Local edits, dirty tracking, save/delete | Separate local mutations from persistence endpoints | Audit/design needed |
| Form locks, protection and confirmation dialogs | Optional consumer/service integration | Audit/design needed |
| Live updates | Generic collection changes; Genropy DB events in contrib | Protocol needed |
| Filesystem operations | Generic RPC-backed provider; server authorizes operations | Later provider |

Full API compatibility is not claimed. The legacy method-by-method audit must
cover return values, side effects, event topics, filter/index semantics and form
dependencies before implementing each family. Do not equate virtual-cache
uniqueness with whole-collection uniqueness.

## First experimental slice and acceptance

1. Add explicit resident/RPC declarations, registry and grid connection while
   preserving current direct bindings and formulas.
2. Normalize a selection on the server, decode TYTX, validate identities, build
   the browser Bag and publish through the shared store.
3. Demonstrate the states selection through GenropyPage under the common FastAPI
   example host. Core store tests use a backend-independent endpoint fixture.
4. Verify shared consumers, stable selection, reload, error retention, `_delay`,
   busy refusal, Source removal during a request, disposal and code reuse.
5. Verify typed null/zero/date/Decimal values and SQL order, with no legacy Bag on
   this selection path. A live DB result is reported separately from fixture tests.

This is a proposed bounded experiment. The full store migration does not become
an automatic backlog run or a requirement for 0.1.2. No worktree, commit, push,
tag or publication is created by this design document.

## Questions for owner review

- Keep `rpcStore(rpcmethod=...)` exactly, or prefer alignment with dataRpc naming?
- Accept an explicit `selection_result` helper and the proposed rows/identifier/
  metadata shape, or should the contrib normalize a declared result type?
- Keep global-per-application storeCode for compatibility, or scope codes to
  source branches? This affects repeated remote content with identical recipes.
- Approve retaining old data on load failure and attribute-backed rows initially?
- Which family follows the first slice: resident filters/sorting, editing, or
  virtual selections? None is selected automatically here.

## Local experiment checkpoint — after owner approval to proceed

The owner subsequently approved starting the bounded experiment. The following
is now implemented locally, uncommitted, on develop; the proposal above records
its design context, not a claim that the full migration is complete.

- `rpcStore(rpcmethod, storeCode=..., storepath=..., _identifier=...)` and
  `bagStore(...)` Python declarations; `rpcStore` accepts a bound endpoint and
  `_onStart` as an alias for `_on_start`. JavaScript accepts `method` or
  `rpcmethod`, using `_on_start`.
- Application-local registry, unique codes and owned Data paths, Source removal
  cleanup, and grid `store='code'`. Direct `store='^path'` remains supported.
  Initial forward references resolve because declarations prepare before rendering.
  An absent code fails explicitly; no deferred cross-request lookup is implemented.
- Shared consumers borrow one BagRows instance. A grid does not dispose that
  instance when detached. Existing resident adapters and formulas remain in use.
- RPC stores reuse provider delay, pending refusal, cancellation and result hooks.
  `collectionStore().loadData()` triggers the same provider; no second transport.
- The explicit rows/identifier/metadata result is validated before replacement.
  Attribute-backed rows preserve identities/order; invalid results retain prior
  data and set `loadError`. Result hooks may display loading/error state.
- `GenropyPage.selection_result` normalizes named fetched rows within the worker.
  Temporal values are accepted by contrib normalization in addition to Decimal.
- Common FastAPI host optionally mounts the [states example](../examples/states-grid/README.md)
  when supplied a GenroPy application or `--genropy-instance`. Ordinary examples
  do not acquire a legacy dependency.

Verification: 147 Python tests passed, four skipped, three dependency deprecation
warnings; 370 JavaScript tests passed; the live browser check passed. The real database returned eight states/territories. Chromium verified
all eight rendered rows, reload, selected-key retention, collection totalrows,
visible CodeMirror and no page errors. The source was visually reviewed against
the uniform example layout. No application-level networking or DOM workaround.

Still absent: virtual selections, remote filtering/sorting, editing/persistence,
form/protection services, DB event subscriptions and filesystem providers. Store
codes are application-scoped and declaration configuration is fixed for this
slice; repeated independent remote instances need distinct codes. Selection
metadata is still separate from the unresolved general RPC resultattrs protocol.
No new tag, commit, push, release or consumer-repository edit accompanied this work.
