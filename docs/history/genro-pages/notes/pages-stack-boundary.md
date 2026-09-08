# Pages / Stack boundary review

**Version:** 0.1 · **Date:** 2026-09-07
**Status:** 🔴 DA REVISIONARE — boundary proposal, not an approved implementation workflow.

## Authorization and current state

The owner approved protecting the current dependency with `<0.44`, clarifying
Pages/Stack ownership and answering the bridge. This does not authorize moving
code, creating a repository, inventing public hooks or publishing packages.
The registered-startup phase remains open; its naming closure is separate.

Sources: mailbox `2026-09-08_0500_asgi-coord_a_pages_confine-core-spa-e-stratificazione.md`,
`2026-09-08_0410_bridge_a_pages_due-domande-ferme.md`, and the original
`2026-09-06_1830_titolare_a_asgi-ws+asgi-coord+pages+bridge_app-miste-forma-b.md` decision.
The ASGI package name for 0.44 is still a proposal awaiting its owner's gate.

## Intended dependency direction

Arrows below mean "depends on", not execution order.

```text
application
  -> genro-stack
       -> genro-asgi (HTTP, worker orchestration, identity, WSX)
       -> genro-pages (page recipes, document construction, client rendering)
            -> genro-builders / genro-bag / genro-tytx / genro-routes
            -> packaged generic browser assets, including genro-dom-js

future genro-asgi monitor -> genro-pages rendering
                       X-> genro-stack
```

Pages must not import ASGI or Stack, even indirectly. DOM remains usable as a
standalone JS library without Pages, Python, networking or page registration.
The ASGI monitor must be able to consume a rendered document with no SPA worker,
connection, registered page or call back into Stack.

## Measured scope beyond a four-file move

| Existing code | Responsibility | Proposed home / action |
| --- | --- | --- |
| `page_document.py`, `page.py`, recipe/menu builders | Build documents and source Bags | Pages; extract laboratory shell choices from the reusable document |
| `application.py` | ASGI routes, cookies, ownership, page registration, HTTP assets | Stack; extract reusable recipe/menu construction rather than copying it |
| `worker.py` | PageWorker, PageServer, run_sync delegation | Stack |
| `server_configuration.py` | Worker pool config and string entry_module | Stack; string paths must migrate as well as import statements |
| `__main__.py` | Launch server/worker demo | Stack CLI; final invocation/name requires review |
| `demo.py` | Recipes plus DemoApplication subclass | Split; page definitions in Pages, hosting assembly in Stack |
| `hello_world.py` | Original WebpageApplication subclass | Hosting example must migrate or be rewritten; do not leave a transitive ASGI dependency |
| `tests/test_hello_world.py`, `test_page_bootstrap.py`, `test_widget_pages.py`, `test_registered_page.py` | Direct ASGI imports | Split pure rendering tests from hosted integration tests |
| registered server/channel and consumer tests | Hosted startup with WSX | Integration tests in Stack, with Pages-only renderer contracts retained |
| `pyproject.toml`, README, package paths, wheel assets | Installation/runtime ownership | Remove ASGI requirement from Pages only after extraction; declare direct Python and browser dependencies explicitly |
| `js/src/application.js`, `rpc.js`, `bootstrap.js` | Page runtime plus concrete WSX transport | Requires the client boundary decision below |
| inspector, gallery, playground | Development consumers | Remain regression examples, not mandatory core-monitor services |

Four production files import genro_asgi directly. Four test files do too.
There are also transitive dependencies through demo/hello_world, the configured
worker entry-module string, packaging, and browser-side WSX assumptions.
The Python package initializer is already free of ASGI imports.

## Client boundary: recommendation for owner review

Keep the public mental model `genro.rpc`, source-node callback context, and typed
source/data in Pages. Make the concrete registered WSX channel/HTTP host adapter
part of Stack, supplied to the page runtime at construction. A non-SPA monitor
must not call openchannel or request a registered page ID merely to render.

This is a responsibility proposal, not an approved injection API. Current
PageApplication directly constructs RpcService; bootstrap imports it and
unconditionally loads an inspector, so moving Python files alone is insufficient.
Generic source loading, safe document rendering and runtime disposal stay reusable.
Client endpoints, asset manifest and optional tools must be supplied by the host;
the current root-only `/_assets`, `/_wsx`, `/main` and `/inspector` conventions are
prototype assumptions, not a generic hosting contract.

Do not create two copies of RPC/bootstrap code or make Pages import Stack to obtain
its default adapter. Do not use a fake worker or invented page ID for the monitor.

## Bridge construction answer

Current native PageWorker constructs its app/server once inside its constructor,
after SpaWorker initialization. It passes the worker to both PageServer and
DemoApplication. The source-request path creates a fresh page object and builder;
that is independent of the long-lived router lifetime.

For the mixed router, recommend the same lifetime: once per worker after fork,
after the bridge has bound its site/register client. Worker is the sole runtime
context; read the existing site through worker.gnr_site rather than accepting a
second potentially inconsistent site argument. Declarative routing/assets config
is additional configuration, not another lifecycle owner.

The router must never store a current request/identity/page as mutable shared state.
Use the request scope/worker request slot; database work uses worker.run_sync.
The bridge constructs the legacy site/GnrApp/db. No duplicate factory call in Pages
or Stack. WsgiSeam(worker.gnr_site, worker) delegates legacy paths through the same
request slot. The mixed router/hook does not exist yet. Its final public name and
full constructor signature remain to be agreed; no fictitious API is promised.

## Proposed execution order and evidence

1. Keep the current working combination >=0.43.1,<0.44. Await the definitive
   released import paths; do not switch to an unreleased core branch.
2. Settle the client adapter responsibility, pure page-render entry point, demo
   location and dependency graph before writing the extraction workflow.
3. Verify the legacy bootstrap/resource/worker mechanisms relevant to each slice;
   document intentional differences before moving code.
4. Extract pure rendering boundaries with tests that run without ASGI installed
   and without worker/cookie/page registration. Keep generic DOM contracts intact.
5. Create Stack only after owner approval; move host glue and integration tests,
   update entry-module paths, packaging and commands in the same bounded change.
6. Adopt ASGI 0.44 released artifacts in Stack when available, following the
   announced paths. Prefer combining this with the extraction to avoid two moves;
   exact timing is not fixed and must not delay an independently needed migration.
7. Prove clean wheel installs and both consumers: a non-SPA monitor-style host,
   and registered worker startup with cookie, ownership, JSON/MessagePack source,
   disposal and browser gallery/playground. Do not equate this with freeze coverage.

Library consolidation (typed Bag/SourceBag, GUI aliases, generic DOM) remains valid
and independent of the Stack name. Add no Stack, ASGI, cookie or WSX dependency to
those libraries. Their reviewed release artifacts remain the adoption gate.

## TYTX clarification required before decoder consolidation

TYTX spec §2.5 says unknown branch markers leave the hierarchy intact and children
under their parent. The prototype and Bag #63 / Bag JS #4 currently ask for an
error when that parent cannot be decoded. These are not the same contract.
Distinguish a valid row with an unregistered class code from a broken parent path
or compact reference. No silent reparenting is acceptable. The representation of
an unresolved typed branch (and whether it can round-trip its type code) needs
an explicit owner decision; an error must not be presented as specification
compliance without that decision. Keep this part of the issue acceptance pending.
