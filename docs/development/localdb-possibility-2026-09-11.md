# Declarative local database: future possibility

Status: separate exploratory chapter, not an implementation commitment or a grid
prerequisite. Owner wants a simple syntax and asks to retain the possibility.

Candidate Python authoring:

```python
db = pane.localdb('xxx')
table = db.table('alfa')
table.column('id', dtype='T', primaryKey=True)
table.column('name', dtype='T')
table.column('amount', dtype='N')
```

JavaScript would use the same vocabulary with attribute objects. These APIs are
proposals, not current grammar. Gramlot would own declarative table/column schema,
types, validation and metadata. IndexedDB supplies object stores, keys, indexes
and transactions; it does not enforce SQL-style columns. Schema metadata could
supply form editors and grid fieldcell defaults with page-specific overrides.

Keep schema separate from access/persistence adapters. Future server-provided
schemas could preserve table/column analogies and optionally describe a local
subset. This does not automatically provide data synchronization: replication,
identity, revisions and conflicts require a separate contract. Versioned schema
migration, Decimal/Bag serialization, application database naming and asynchronous
readiness also need design before implementation.

Owner explicitly wants browser persistence for standalone HTML pages as well.
The Chrome file:// proof is recorded in ../examples/standalone-storage/README.md;
it is not a cross-browser guarantee. Safari remains untested.

Evaluate existing libraries before implementing an IndexedDB adapter: Dexie for
compact tables/indexes, transactions and reactive queries; RxDB for explicit
schemas, reactive documents and optional replication. Compare actual type,
migration, dependency size and standalone behavior rather than assuming React
integration implies a React dependency in the storage core.
