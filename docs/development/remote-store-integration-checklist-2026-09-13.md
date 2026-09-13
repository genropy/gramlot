# Remote content and store integration: required review

Owner direction, 2026-09-13: record the remote/grouplet findings and assess the
integration level of every store type before considering remote content finished.
This is a required investigation, not authorization to port every missing store.
The first remote PoC remains deliberately incomplete.

## Context to retain

- [Remote legacy audit](remote-source-legacy-audit-2026-09-13.md): triggering,
  ownership, visibility, overlapping calls, conditions, cache, inherited context,
  lifecycle, errors and completion semantics.
- [Grouplet audit](grouplet-remote-legacy-2026-09-13.md): resource versus instance,
  dedicated remote content boundary, relative Data, method/ID isolation, form
  readiness and the distinct GroupletForm store load/save lifecycle.
- [Current PoC and exclusions](../examples/triangle-rpc/remote-source.md): actual
  tested behavior must remain distinct from the broader compatibility proposals.
- [Collection-store study](collection-store-design-2026-09-12.md): historical
  hierarchy and design; compare each claim against current code and tests.

## Inventory to assess

| Family | Members to trace | Integration questions |
| --- | --- | --- |
| Resident collections | BagRows, ValuesBagRows, AttributesBagRows; bagStore | Borrowed versus owned Bag, mutation/replacement, identifiers, multiple views |
| RPC collections | RpcBase, rpcStore | Request ownership, result conversion, loading/error state, obsolete replies |
| Database selections | Selection, selectionStore | Backend-independent result contract, refresh, record identity, notifications |
| Paged selections | VirtualSelection | Page/chunk cache, outstanding loads, selection beyond resident rows |
| Filesystem collections | FileSystem, fsStore | Adapter boundary, identifiers, refresh, lazy branches |
| Legacy widget adapters | GnrStoreBag, GnrStoreGrid, GnrStoreQuery | Which semantics are replaced by current adapters, and which remain absent |
| Form stores | Legacy memory, record and selection handlers, plus other handlers found during inventory | load/save/reset, dirty state, autosave completion, locationpath changes |
| Resolver-backed Data | Lazy Bags/RpcResolver used by trees | Distinguish a resolver from a collection store; cache/ownership across remounts |

These are inventory targets, not a claim that all names are implemented in
Gramlot. Expand the inventory if the source audit finds further store handlers.

## Common lifecycle matrix

For each family document existing implementation, verified tests, missing
capabilities, and whether the gap blocks a basic grouplet or only an advanced one.
Trace the complete route: declaration → registration → binding consumer → loading
→ update → replacement → disposal. In particular:

1. Store declared outside a remote and borrowed by its grid/form inside it.
2. Store declared inside the replaced fragment: unregister once, detach watchers,
   cancel/invalidate pending loads; no late resurrection.
3. Two grouplet instances using the same local store name and relative Data path;
   distinguish intended shared Data from accidental registry/ID collisions.
4. Fragment rebuilt with an identical store declaration: does state survive, get
   rebound, or get reset? Check filters, sorting, selection and cached rows.
5. In-flight load during replacement, load failure/retry, and obsolete replies.
6. Dirty edits and pending save while changing resource: await successful save or
   apply an explicit discard/cancel policy; do not silently lose changes.
7. Grid/form coordination through a shared store; record changes and subscriptions.
8. Resident operation without server versus server-required providers; no implicit
   Genropy dependency in core, and explicit optional backend adapters.
9. New store registration versus post-install callback timing: a grouplet callback
   must not claim store readiness merely because Source nodes were inserted.

## Expected output and completion boundary

Produce a factual matrix: implemented / tested with remote / partial / absent.
For each gap give a reproducing test or source evidence and a recommended order.
Prioritize the minimum set needed for two independent grouplet instances and then
GroupletForm. Defer full filesystem, paging, wizard/grid/chunk support explicitly
when they do not block that slice. Do not declare remote finished based solely
on the currently passing fragment replacement example.

## Select-provider variants verified in legacy

`gnrjs/gnr_d11/js/genro_widgets.js:4874,5066,5093,5133,5380` defines a shared
DynamicBaseCombo/GnrStoreQuery pipeline with three providers: dbSelect uses
app.dbSelect by default, RemoteSelect uses an arbitrary remote method, and
CallBackSelect uses LocalBaseCombo with GnrBagCbResolver. The latter accepts a
JavaScript callback(kw) returning {headers, data}; the wrapper converts records
into Bag nodes with row attributes. The lower-level method variant returns the
resolver result directly. kw_* supplies extra parameters.

The test page `projects/gnrcore/packages/test/webpages/inputfields/dbselect.py`,
test_2_clientmethod, explicitly implements both kw._querystring search and kw._id
identity lookup. Its rows contain _pkey, caption and auxiliary fields, and headers
use field:label pairs. This callback path consumes the return synchronously;
Promise support must not be inferred. All three selectors share identity versus
caption, selected_* projection and query-store behavior. Include these provider
variants in the store integration audit; do not equate select storage with grid
collection storage or assume dbSelect requires a DB in the generic core.
