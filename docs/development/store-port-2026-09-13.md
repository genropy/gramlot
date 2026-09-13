# Store migration and filesystem tree

Owner authorization: expand the migration to all legacy store families and add
FileSystemTree backed by a directory resolver. This supersedes the earlier
review-only boundary. No release is authorized. The full migration is not complete.

## Evidence and remaining scope

Legacy `genro_components.js` defines _Collection (6580), BagRows (7089),
ValuesBagRows (7175), AttributesBagRows (7247), RpcBase (7302), FileSystem (7353),
Selection (7366), VirtualSelection (7829). `genro_frm.js` defines form-store Base
(2541), SubForm (3093), Item (3128), Collection (3241), Hierarchical (3415, an empty
subclass). `gnrstores.js` contains widget adapters, not additional DB backends.

| Family | Local implementation | Remaining port |
| --- | --- | --- |
| Resident collections | Bag/value/attribute rows, shared stores, edits, filter/sort projections | Legacy expression filters and mutation conveniences |
| RPC / Selection | Explicit endpoint, typed rows, reload/error retention, selectionStore | Generic change events and persistence operations |
| VirtualSelection | chunkSize, loadPage, offset/limit, totalrows validation | Multi-page cache, virtual viewport and unloaded selection |
| FileSystem | Read-only fsStore and lazy fileSystemTree | Write/delete providers, non-local storage |
| Form memory / Item | Snapshots, load/save replacement, changed-location guard | Automatic location-change policies |
| Form Collection | Stable-key load and replacement of an existing shared row | Insert/delete/navigation and unloaded rows |
| Form SubForm | Explicit subset merge into an external parent Bag | Nested form ownership and parent save coordination |
| Form Hierarchical | Location-based Item behavior, matching the empty legacy specialization | Navigation integration |
| Form record RPC | Explicit load/save, typed Bags and cancellation | Generated keys, optimistic versions and normalized saved records |
| Widget adapters | Existing select providers, Bag trees, collection grids | Full legacy adapter API compatibility |

Next priorities within the authorized scope: virtual cache/viewport, collection
persistence/navigation, then remote/grouplet lifetime tests for each family.
New family entry points are not evidence of complete legacy behavior.

## Authoring contracts

```python
root.selectionStore(self.rows, storeCode='rows', storepath='rows',
                    _identifier='id', chunkSize=50, _onStart=True)
root.grid(store='rows', structpath='structure')
root.fsStore(root='examples', storeCode='files', storepath='files', _onStart=True)
root.fileSystemTree('examples')
form = root.form(formId='editor', datapath='draft')
form.formStore('item', storepath='original')
```

selectionStore requires an explicit endpoint. Paged requests add `_offset` and
`_limit`; results require `metadata.totalrows`. The grid displays the loaded page,
not yet the full virtual collection. `collectionStore().loadPage(index)` uses
the shared RPC provider with busy refusal. Resident JS APIs `filter(predicate)`,
`resetFilter()` and `sort(field, descending)` project without changing the Bag;
sort(null) restores source order. Server sorting/filtering belongs to the provider.

form.formStore configures an existing form; initialization does not auto-load:

- memory: detached in-memory persistence.
- item / hierarchical: storepath points to a separate original Bag. Load before
  save; changing location requires a new load. Use a distinct editor datapath.
- subform: storepath plus storeFields list; save merges only those fields.
  Nested form widgets remain unsupported.
- collection: storeCode and storeKey (e.g. `'=selected_key'`). Loads an existing
  row, replaces fields on save, refuses identity changes.
- record: loadmethod, savemethod and storeKey. Load receives key and returns
  `{data: Bag}`; save receives key and detached data Bag. Endpoints own access,
  transactions and version checks. Current FormController does not apply a
  canonicalized server record after save. Existing dirty/validation, exclusion,
  snapshot and cancellation policies remain active.

## Directory resolver

Combine `gramlot.filesystem.FileSystemPageMixin` with WebPage and declare
`filesystem_roots={'examples': Path(...)}`. The mixin is independent of server
adapters and databases. Its directory_tree endpoint returns a normal Bag with
RpcResolver descriptors for directories; directory_selection returns flat rows.
No legacy Bag conversion is needed. Names containing dots remain attributes;
stable encoded Bag labels avoid interpreting file names as Bag paths.

Rows contain path, caption, is_directory, size in bytes and modified in Unix
seconds. Directory size is metadata, not recursive content size. Root names are
allowlisted, absolute/traversal paths rejected and symlinks excluded. Contents,
deletion and writes are not exposed. Configure application-controlled roots:
this is not a sandbox against an adversarial local process concurrently replacing
directories. Override and redecorate endpoints for application access policies.

Example `/page/filesystem-tree/` shows complete Python next to the live tree.
Directory RPC occurs only when expanded. Reconciliation now handles subclasses
of storeTree, avoiding another tag-specific special case for typed Bag updates.

## Verification

Tests cover traversal/symlinks, lazy descriptors and file names, Python
declarations, form adapters, page bounds/error retention and resident projections.
Form transport tests pass with GRAMLOT_CLIENT_MODULES pointing to the current
dependencies (their default still references the obsolete split checkout).
Browser checks exercise root load, expanding pages/, and filesystem-tree.py with
no page errors. Full virtual and remote/grouplet integration remains unverified.
