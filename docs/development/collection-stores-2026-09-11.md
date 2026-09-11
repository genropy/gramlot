# Collection store assessment and first implementation

## Decision for this slice

Introduce a reusable resident-store layer now, without porting the whole legacy
`_Collection`. The current grid needs representation-independent field reads,
identity, updates and subscription ownership. Those responsibilities now live in
`js/dom/src/stores/bag-rows.js`, exported from `gramlot-dom` as `BagRows`,
`ValuesBagRows` and `AttributesBagRows`. The grid's `datamode` selects the
representation; `collectionStore()` returns its connected, grid-owned adapter.
Consumers must not dispose that adapter; independent stores own their disposal.

Legacy evidence is `gnrjs/gnr_d11/js/genro_components.js`: `_Collection` starts
at line 6580; resident read/identity APIs at 6849–6950; `BagRows` at 7089;
`ValuesBagRows` at 7175 and `AttributesBagRows` at 7247. The legacy `_Collection`
constructor depends on Source, parent forms, lock/protection state and topics;
other methods include server deletion, filters, dialogs and linked-grid control.
Porting that object now would introduce responsibilities beyond the resident grid.

## Implemented API

```javascript
import {AttributesBagRows} from 'gramlot-dom';
const store = new AttributesBagRows(rows, {identifier:'id'});
const item = store.itemByIdx(0);       // Original row BagNode, or null
const value = store.getValue(item, 'amount');
store.updateRowNode(item, {amount:null});
store.dispose();
```

Legacy-familiar methods retained: `getData`, `getItems`, `len`, `itemByIdx`,
`rowFromItem`, `rowByIndex`, `keyGetter`, `getKeyFromIdx`, `getIdxFromPkey`,
`rowBagNodeByIdentifier`, `updateRow`, `updateRowNode`. Indices are zero-based;
missing item/row/key lookups return null, missing key-to-index returns -1.
`rowFromItem` returns a shallow object snapshot; Bag fields overlay attributes,
including present null values. No synthetic identifier field is added to it.

The new `getValue(item, field)` reads one field without copying the record.
`subscribe(callback)` returns an unsubscribe function. `replace` and `configure`
validate a new dataset/representation before swapping subscriptions. `dispose`
removes observers. The grid still uses `size`, `rowAt`, `row` and `keys` for its
viewport. These are a bounded API subset, not full legacy compatibility.

`identifier` remains explicit; default identity is the Bag node label. Unlike
some legacy paths, an explicit missing or duplicate key is rejected rather than
silently falling back to the label. Numeric zero is a valid key. `storeType` and
the Source `BagStore(_identifier=...)` declaration have not been introduced.

## Representation and updates

Attribute rows may have a null value. The adapter retains references to original
nodes/attributes and allocates no nested record Bags or per-field BagNodes.
Attribute changes, insertion, deletion and complete replacement update the grid.
Store updates use `setAttr(..., removeNullAttributes=false)` so assigning null
does not remove the field. Bag mode writes through the row's value Bag.
Selection returns a Bag in Bag mode and an attribute snapshot in attr mode;
`rowNode` always supplies the original node. Source/Data store changes can switch
`datamode` and the dataset in one application transaction.

## Transfer-size probe

A local uncompressed TYTX JSON probe used identical records containing six
fields: code, name, date, boolean, Decimal amount and integer quantity.

| Rows | Bag-valued JSON bytes | Attribute JSON bytes | Reduction |
| --- | ---: | ---: | ---: |
| 50 | 13,194 | 7,504 | 43.1% |
| 5,000 | 1,416,419 | 788,079 | 44.4% |

At 5,000 rows this representation has 5,000 row nodes instead of 35,000 row/field
nodes, and avoids 5,000 nested Bags. These are structural counts, not measured
browser heap savings. They do not predict compression ratios, arbitrary datasets
or throughput. Values were `C-{i}`, `Customer {i}`, 2026-09-11, `i % 2 == 0`,
Decimal('125.75'), and `i`; labels were `r{i}`. Sizes count UTF-8 bytes returned
by `gramlot.transport.to_tytx(rows, 'json')`.

## Deferred APIs

Filtering/sorting projections, remote/paged stores, async loading, edit sessions,
change tracking, database deletion, protection/locking and form integration are
separate work. Elastic `width=0` remains a recorded requirement, not part of this
data-representation change. Store notifications still rebuild the resident index;
this slice does not claim optimized bulk-update or large-grid performance.

## Verification

328 JavaScript tests and 7 focused Python/teaching tests passed. Coverage includes
typed/null attribute updates, zero-valued identities, duplicate rejection,
insert/delete, selection payloads, atomic representation/store replacement and
subscription cleanup. Both Python TYTX and JavaScript gallery recipes mounted
in the browser; updating row 12 displayed 9,999.99 in both, and Arrow Down moved
selection from r007 to r008 in the Python example. No commit or publication was
performed for this slice.
