# States grid through a GenroPy database

This Python-authored example runs under the common FastAPI host. It reads
`invc.state` from `GnrApp('test_invoice_pg')`, using `query(...).fetch()` and
`GenropyPage.selection_result`. The RPC collection constructs attribute-backed
Gramlot Bag rows in the browser. It does not transport a legacy Bag.

Use an environment containing the project's declared dependency versions and the
optional legacy GenroPy installation/PostgreSQL driver. GenroPy is not a core
Gramlot dependency. From the repository root:

```sh
python docs/examples/serve.py --genropy-instance test_invoice_pg
```

Open `/database/states/`. The ordinary host without `--genropy-instance` does not
initialize GnrApp or expose this example. `--port` can select a separate preview.
The page has the shared bordered live pane, splitter, dark Python CodeMirror and
inspector control below the live pane. The displayed source is the executed page
file. Reload uses a Gramlot fire binding; no application fetch or DOM code exists.

The endpoint is read-only; query, materialization and connection cleanup run in
one worker. No commit is requested. The instance/model and PostgreSQL service
must already exist. This is a local development example, not an authentication
or deployment configuration.

Verified on 2026-09-12: eight real rows (ACT, NSW, NT, QLD, SA, TAS, VIC, WA),
name ordering, typed RPC delivery, reload and stable selection in Chromium.
The test environment at `/private/tmp/gramlot-genropy-store-env` uses Python
3.12 with legacy system packages and local overrides of genro-bag 0.21.1,
genro-builders 0.23.2 and genro-tytx 0.15.0. The original legacy environment was
not changed. An initial run with its older versions failed Source hydration;
that run is not evidence against the aligned configuration.

See [store design and implementation checkpoint](../../development/collection-store-design-2026-09-12.md).

The opt-in browser regression is `tests/browser/states-grid.spec.js`; set
`GRAMLOT_STATES_URL=http://127.0.0.1:8051/database/states/` when running Playwright
against a prepared local instance. It does not start or populate a database.

## State → localities

The upper grid binds `selectedKey` to `selected_state`. The lower RPC store uses
`state='^selected_state'` to invoke `load_localities`, which queries `invc.postcode`
with `where='$state=:state'`. Localities are `suburb` records, identified by their
row `id`, not by postcode (which is not unique). Results sort by suburb, postcode
and id. An empty selection returns no rows without opening the database.

The example opts into `_lockScreen=True` while loading localities, consistent
with the existing busy-refusal policy. The source contains no manual request or
DOM handling. Chromium verified NSW and VIC each load only their own records,
with reload preserving the selected state. Nine targeted Python tests pass,
including empty-selection behavior, parameter binding and RPC method registration.

## State → customers

A third grid below localities independently observes the same `selected_state`.
Its RPC endpoint reads `invc.customer` with `where='$state=:state'`, selecting only
id, account name, suburb, postcode and state. Identity is the customer id; ordering
is account name then id. No selected state means no query and an empty collection.
Both detail providers opt into the shared lock screen while their requests run.
The existing lock ownership mechanism keeps it active until both complete.
The Python query test covers this endpoint; the opt-in browser regression checks
NSW/VIC filtering for both detail stores and visibility of the third grid.
