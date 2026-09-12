# GnrApp database integration under FastAPI

2026-09-12 · Static investigation requested by the owner, not an implementation.

The owner proposes `GnrApp('test_invoice_pg').db` as the first database integration.
This preserves GenroPy's actual database model/API; FastAPI remains the web host.
Gramlot core must not acquire a mandatory GenroPy dependency.

## Verified source facts

Legacy root: `/Users/gporcari/Sviluppo/Genropy/genropy`.

- `gnrpy/gnr/app/gnrapp.py:839` resolves the instance through configured paths.
  `:1034–1050` constructs GnrSqlAppDb, installs package/table mixins, broadcasts
  onDbStarting, builds the database model and calls application initialization
  hooks. Startup is not just creating a connection. No live GnrApp instance was
  created during this investigation because package hooks may execute work.
- `gnrpy/gnr/sql/gnrsql/db.py:372` builds the model; restore runs only when a
  restorepath is provided. This is not an automatic schema upgrade invocation.
- The actual instance file was found at
  `projects/test_invoice/instances/test_invoice_pg/instanceconfig.xml`. Its backend
  is postgres and package declarations include gnrcore:sys, gnrcore:adm and invc.
  Credentials were not displayed. Configured short-name resolution and live DB
  availability were not exercised.
- `gnrsql/env.py:58–71`: currentEnv is keyed by thread identifier, not asyncio
  task. clearCurrentEnv resets the current thread's environment.
- `gnrsql/connections.py:41–103`: connections are lazily cached by thread and
  (store, connectionName). closeConnection rolls back and closes current-thread
  connections; it does not close every worker's connections when called elsewhere.
- `gnrsql/transactions.py:47`: commit runs Genro deferred callbacks/checks and
  commits uncommitted connections matching the current thread/connection name.
  rollback handles the selected connection(s); rollbackAll also addresses pending
  connections and queues. An adapter must choose transaction ownership explicitly.
- `gnrsql/helpers.py:171–225`: tempEnv restores its supplied keys, not an entire
  request context. It does not commit, roll back or close database connections.
- `gnrapp.py:500`: currentPage requires application.site, otherwise it is None.
  Helpers that dereference pageStore or site resources need the legacy web context.
  Base GnrApp onDbCommitted/notifyDbUpdate/notifyDbEvent are no-ops (:1729 onward),
  so database writes alone do not reproduce browser notifications/changeInTable.
- Invoice-row insert/update/delete triggers call invc.invoice.calculateTotals
  (`projects/test_invoice/packages/invc/model/invoice_row.py:100–109`): table logic
  can be retained independently of the old page renderer. Other hooks still need
  their individual dependency audit.
- Legacy gnr.core.gnrbag.Bag is a different class from Gramlot's genro_bag.Bag.
  Gramlot transport snapshots and adapter validation recognize the latter. Direct
  legacy Bag/selection/resolver returns are not established TYTX-compatible values;
  the integration needs an explicit typed conversion/materialization boundary.

## Integration shape to test next (proposal)

Create one GnrApp per serving process at startup and keep it alive for that process.
A specialized page exposes its db service as self.db. Execute the entire synchronous
operation in one worker: initialize request context, invoke the endpoint, materialize
its result, apply the chosen transaction policy, close connections and clear context
in finally. This fits Gramlot's existing worker dispatch for synchronous methods,
but the lifecycle wrapper must be inside that same worker call.

Do not put DB setup and cleanup in separate threadpool calls and assume worker
identity. Do not call this synchronous thread-keyed DB directly across await points
in a shared event-loop thread. Page reuse and per-process DB reuse are separate
questions. Cancellation must not release a worker's resources while its operation
is still running. No global lock on the entire GnrApp is implied by this proposal.

Proposed first verification: instantiate the selected app under controlled startup,
resolve invc.customer metadata, run a bounded read-only query, convert its result to
Gramlot Data and verify isolation/cleanup with two worker requests. No writes,
upgrades, restores, live connection or credentials were used in this source audit.

## Approved placement and invocation policy

Owner decision after the investigation: the integration belongs in
`gramlot.contrib.fastapi_genropy`, above the existing FastAPI adapter. The namespace
is reserved without importing or initializing GenroPy. A Django integration may
be added later as a separate contrib; it is not part of this work.

The author should write ordinary `@endpoint` synchronous methods and access
`self.db`. No `threadpool`, `threaded` or executor parameter is required: the
FastAPI adapter already dispatches synchronous methods to a worker. The integration
must extend that execution boundary to include result materialization and cleanup.
The specialized db property lazily initializes invocation-specific currentEnv,
inspired by GnrWebPage.db, without requiring the legacy web page/store machinery.
Cleanup closes connections and clears context in the same worker, in finally.
Commit remains explicit. Async methods remain on the event loop and must not use
this synchronous thread-keyed DB directly.

Approved responsibility split: FastAPI hosts requests; Gramlot owns pages, Data,
Source and browser services; GnrApp provides the legacy application/database.
The contrib owns the adaptation and legacy-Bag conversion. Its implementation
and live test against test_invoice_pg are still pending; no database was started
when reserving this namespace. Public constructor and configuration details have
not yet been frozen.

Approved page class name: `GenropyPage`, in `gramlot.contrib.fastapi_genropy`.
Application pages inherit from it to use `self.db` with GnrApp's database API.

## Implementation checkpoint — 2026-09-12

The optional adapter is now implemented locally. A host can supply an initialized
GnrApp to `create_genropy_application()` or `mount_genropy()`; construction from
the default `test_invoice_pg` name remains an explicit host startup action. GenroPy
imports remain lazy. `GenropyPage.db` initializes the current worker's environment
on first access, and the same worker executes the method, converts its result,
closes its connections and clears its environment. There is no implicit commit.

Tests use a fake application/database and controlled workers; they cover lazy
acquisition, success/error cleanup, explicit commit, fresh pages, concurrent
isolation, cancellation while a worker is active, async misuse and nested legacy
Bag values/attributes. They do not initialize `test_invoice_pg`, connect to its
PostgreSQL database or verify application-specific table hooks. Legacy lazy
resolvers, selections/query objects and result-attribute tuples remain rejected.

## Later owner correction: selection transport

For the grid selection, the chosen path is query(...).fetch(), adapter-side
normalization to JSON-shaped typed rows/metadata, TYTX transport, and browser-side
Gramlot Bag construction. MessagePack is a possible transport option, still to be
specified and implemented. The legacy-Bag converter remains a separate compatibility
facility; it is not the selected path for database selections. Exact selection
schema and browser conversion API are pending. Legacy SqlQuery.fetch calls
cursor.fetchall(), not executemany, and has its own row post-processing.
