# Gramlot pages in the legacy Genropy WSGI host

## Owner direction

Pages remain in the normal `webpages/` directory. Inheriting from `GramlotPage`
selects a separate loader and bootstrap before legacy dynamic mixins run.
Applications use official Gramlot Python authoring and Gramlot components only.
The host supplies `.site` and `.db`; pages do not inherit `GnrWebPage`.
The intended service contract uses `@endpoint` and `@source`, not
`@public_method`. Additional host capabilities will be added explicitly as needed.

## Local Hello World slice

The implementation is in `/Users/gporcari/Sviluppo/Genropy/genropy`:

- `gnrpy/gnr/web/gramlotpage.py`: ordinary Gramlot page base and initial HTML response.
- `gnrpy/gnr/web/gnrwsgisite_proxy/gnrresourceloader.py`: recognize the inherited
  marker, verify the actual subclass and return it before legacy composition.
- `gnrpy/gnr/web/gnrwsgisite.py`: dispatch the page separately, preserving cleanup.
- `projects/test_invoice/packages/invc/webpages/gramlot_hello.py`: Python-only
  heading, input, Data binding and host-reference check.

The original legacy `hello_world.py` remains unchanged. Browser resources are a
complete versioned payload under `test_invoice_pg/site/gramlot/_runtime/`, served
by the existing `_site` static handler. Gramlot's shared bootstrap loads the
initial TYTX Source from an embedded data URI; no application JavaScript is used.

Owner correction: the entry point is the complete `test_invoice_pg` application,
with `GramlotPages → Hello World` in its regular menu. The package's `menu.py`
declares a normal webpage with `nonGenroContent=True`, using the legacy tab
manager's existing lifecycle support for documents without a legacy client.
The adapter accepts the menu's `windowTitle`, `_parent_page_id` and
`_calling_page_id` parameters
without treating them as RPC or authentication credentials.

Local application URL: <http://127.0.0.1:8080/>. The previous dedicated WSGI
runner on port 8063 has been stopped. The site's login remains in place.

The dedicated environment is `temp/legacy-hello-poc/venv` in the Gramlot checkout.
It uses the legacy Python 3.12 system packages with isolated overrides for
genro-bag 0.21.1, genro-builders 0.23.2 and genro-tytx 0.15.0, plus an editable
Gramlot installation. The original legacy environment is unchanged. Its older
versions did not preserve the nested Source transport correctly in this test.

Run from the Gramlot checkout:

```sh
gnr web daemon -H localhost -P 40404
temp/legacy-hello-poc/venv/bin/python -c 'from gnr.web.serverwsgi import Server; Server().run()' test_invoice_pg --noreload --nodebug -H 127.0.0.1 -p 8080
```

Start the daemon only if the configured daemon is not already running. Local
runner, verification script and logs are in `temp/legacy-hello-poc/`. This is a
checkout-local experiment, not a released installation procedure. The direct
library invocation uses the standard Genropy server; the checkout's CLI wrapper
currently imports an unavailable `NewServer` name, so it is not used here.

## Verification and limits

The actual site loads the new page without inheriting the legacy page or adding
legacy mixins; the existing Hello World still follows legacy class composition.
GET and HEAD succeed, including menu navigation parameters; POST and method query
calls are rejected. The real menu structure contains the expected branch and
webpage target. Browser rendering
reaches `ready`, and typing into the textbox updates its bound text. The document
loads the shared Gramlot startup module and no Dojo scripts. The page source uses
only Python Gramlot declarations, with no local DOM, event or fetch bypasses.

The first menu attempt revealed `_calling_page_id`, added by the legacy iframe
after menu URL construction. The adapter initially rejected it. The regression
check now covers this full URL shape. After the correction, the authenticated
Chrome session was exercised through `GramlotPages → Hello World`; the actual
iframe rendered and typing `Giovanni` updated its bound text. This supersedes
the earlier direct-URL-only browser verification.

This slice is a public initial-page prototype. It does not implement the RPC
adapter, session/authentication integration, protected pages, page registration,
database request identity or database queries. `.db` availability is checked,
not full legacy database-page semantics. Core Gramlot gains no Genropy dependency.
No commit, release or deployment was performed.
