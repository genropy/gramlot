# Page, Builder and data: coordinated contract review

Version: 0.2 · Last updated: 2026-09-07
Status: 🔴 DA REVISIONARE — evidence and proposal; no implementation approval implied.

## Owner clarification and resumed scope — 2026-09-07

This clarification supersedes earlier proposals below that require page-specific
runtime class composition or persistent instance attributes. Those sections remain
historical analysis, not the current implementation direction.

- In the new Pages model, a path identifies a stable routing class. Bootstrap
  kwargs and remote recipe construction do not change its class or exposed methods.
  Legacy dynamic mixin behavior remains the bridge's responsibility.
- Page methods must obtain page state through `self.store`, backed by the host's
  register for the request's page_id, rather than attributes retained on `self`.
  The exact context/store adapter and instance caching policy are not settled.
- Existing SPA primitives include a row RLock, optional sequential per-page call
  locking, and request ContextVar propagation to pool threads. These are different
  guarantees; they do not authorize mutable per-request fields on a shared instance.
- Multiple route decorators are excluded by the owner convention; use aliases.
- Opaque application payload forwarding is tracked in genro-asgi #72:
  https://github.com/genropy/genro-asgi/issues/72 . No protocol change landed here.
- The owner parked resolver/context/store dispatch design and resumed the coordinated
  Builders review: borrowed data, GUI `data()` naming, recipe-only construction,
  SourceBag serialization and downstream data-provider declarations.
- Registered-page-startup is now completed and archived. References below saying
  that phase 2 remains open describe the earlier review snapshot.

## Purpose and scope

The owner wants one coherent Builders update, coordinating existing issues with
page routing, externally owned data and a resident page instance reconstructed
after unfreeze. This review does not close registered-startup phase 2, modify its
contract, change dependencies, publish issue comments or implement these APIs.

Two hosting scenarios must share page authoring:

1. A small native ASGI application (for example a monitor) consumes Pages without
   requiring SPA registries, dedicated workers, database or legacy packages.
2. A SPA-hosted application uses worker-local page instances, registered state,
   user stickiness, thread execution of blocking operations and freeze/adoption.

Lightweight does not mean a different widget library or a different recipe
language. Persistence, synchronization and hosting services are capabilities
of the host. A monitor still needs authorization appropriate to its operations.

## Evidence snapshot

| Repository | Inspected revision / context |
| --- | --- |
| Pages | `8ff487d`, `codex/hello-world`; tracked tree clean |
| Builders | `c6e4684`, `refactor/37-datastore-root`; unrelated untracked documents preserved |
| Bag Python | `1b13b1e`, `main`; unrelated untracked documents preserved |
| Routes | `0051b86`, `main` |
| ASGI | `2330151`, `wf/core-spa-boundary`; installed Pages environment uses published 0.43.1 |
| Genropy ASGI bridge | `47df4ae`, `chore/pin-0.43.1` |
| DOM JS | experimental `codex/python-js-alignment`, including `718acbe` |

GitHub issues and comments were read live, not inferred from local drafts.
The experimental Builders worktree contains uncommitted XS/GUI alias changes;
these are candidates, not upstream released contracts. The canonical Builders
branch name indicates work on #37, but its inspected tracked code remains at the
revision above. Do not overwrite another session's work.

## Findings in the current code

### 1. Pages currently bypasses the builder's creation lifecycle

`src/genro_pages/page.py:WebPage` is a plain class with `main(root)` and client
metadata. `application.py:get_main` creates a builder and calls
`page_class().main(builder.source)` directly, then serializes the SourceBag.
The instance is not retained. `index` registers page identity separately.

This bypass is consequential: `BuilderBase.create()` calls `setup(data)`,
`main(source)`, then executes all data elements once in document order.
`dataFormula` and `dataController` resolve named Python static methods through
`data_logic`. They are not browser JavaScript and are not a subscription engine.

Calling ordinary `create()` on a future browser recipe builder would therefore
change behavior: setters would write Python data and formulas/controllers would
try to execute in Python. A page-owned builder needs an explicit recipe-only
construction contract. Do not silently change every generic builder's `create()`.

### 2. Externally owned data is partly supported already

`BuilderBase.__init__(name=None)` creates a new Bag, enables backreferences and
stores it in `builder.data`. No owner/parent or constructor data argument exists.
Nevertheless, assigning an external Bag to `builder.data` works today.
`SourceBagNode.data` returns it; relative-data helpers resolve through the builder.
`get_subbuilder()` shares the host's data with HTML/SVG/etc. and reassigns it on
cache hits.

The minimum generic extension is to formalize borrowed versus owned data,
including construction, subbuilders and replacement. An optional constructor
input is a candidate, not a ratified signature. Use `is None` semantics: an empty
external Bag must not be replaced because it is falsey. Do not reparent a borrowed
Bag or detach its owner's subscriptions on builder disposal.

A general implicit proxy from Builder to every attribute of its parent is not
needed. Pages can hold a semantic `page` reference in its own builder subclass.
Add an owner facility to generic Builders only if it provides a concrete reusable
operation beyond storing that reference. Keep routing-parent relationships,
source-tree parents and page ownership distinct.

### 3. `data()` is a real namespace collision

On a generic source node, `.data` is the Bag property. In HTML, `data` is also an
element; the dialect-prefixed escape (`html_data`) exists for names shadowed by
Bag/node APIs. Root SourceBag and nested SourceBagNode dispatch are not identical.

The experimental GUI option `data_recipe_alias=True` maps the recipe spelling
`data(...)` to the existing `dataSetter` node and redirects internal relative-data
access to the actual builder datastore. The option is not a released API.

Recommendation for this update:
- `page.data` and `builder.data`: the actual Python data Bag.
- GUI `root.data(...)` / `pane.data(...)`: recipe declaration.
- Generic builder/node semantics remain compatible.
- Keep `dataSetter` accepted; initially keep the wire tag unchanged as well.
- Test both root and nested dispatch and the native HTML `data` element.

A universal rename of the node's datastore property could remove the collision,
but is a breaking change for non-GUI consumers. It needs a separately explicit
owner decision; the existing #42 requests compatibility. Do not create a callable
Bag proxy that unpredictably alternates between storage and recipe construction.

### 4. Python data and client initialization are related, not identical

Legacy `GnrDomSrc.data()` builds a source node with `path` and value, converting
dicts to Bags. Only explicit `serverpath` / `_serverpath` also calls
`page.addToContext`. It does not automatically make every client datum persistent
server state. Legacy `dataFormula` stores `formula`, `dataController` stores
`script`, while current generic Builders uses `destination` / `func`.

Recommendation: keep `data()` as a client-data declaration by default. Access to
`page.data` is server state; selected synchronization must be explicit. Otherwise
client-only grids and presentation state would be duplicated on the server,
contrary to the owner's stated goal. No final synchronization spelling is proposed.

Three operations need distinct contracts even if convenient authoring combines
some of them later: initialize server state once; declare client initial values;
select a branch for synchronization. A remote fragment or source rebuild must
not reset a record edited since first load. `None`, absent values and defaults
must be distinguished. Restored state wins over initial defaults.

When including data in source/envelopes, do not attach the live registered Bag
under a second parent. Use a detached serialization view/snapshot whose branch
classes survive TYTX. Test identity and backreferences; a blanket shallow dict
copy does not establish this contract. Do not serialize the entire server store
as the client payload: publication must select the intended data.

### 5. RoutingClass is the appropriate existing primitive

Routes has `RoutingClass`, a lazy `route` Router, declared factory/instance
branches, metadata and normal signature binding. It has no ASGI dependency and
is a plausible base for WebPage. `@route()` exposes a method but does not inject
a builder. Calling a routed `main(root)` without supplying root fails signature
binding, as verified.

Lazy routing caches one instance per declared branch. A branch per page TYPE or
URL is not a resident instance per browser PAGE ID. Reusing it blindly would
share mutable page state among users. Hosting must first resolve/authorize the
page identity and then address its instance. The same method must have the same
permission checks over HTTP and WSK. A decorator is exposure, not complete auth.

Two viable authoring choices need the owner's decision:
- Keep `main(root)` as recipe; expose a separate method under route name `main`
  that creates the builder and invokes the recipe. Existing `@route(name=...)`
  supports the routing part without a new Routes feature.
- Let authors decorate the recipe `main(root)` itself. Pages must adapt the
  callable before external argument binding, supply an internal root and return
  the built source. This is new behavior, not plain `@route()` today.

Prefer the first for the smallest initial change, unless the second's authoring
benefit justifies the adapter. No recursive `page.main -> builder.main ->
page.main` loop. Ordinary helper methods remain `self.build_form(pane)`; source
syntax like `pane.my_component()` needs explicit component/container registration,
not automatic exposure of arbitrary page attributes.

`RoutingClass.ctx` is stored on the instance and follows parent lookup. It is
not inherently task-local. Do not overwrite it with concurrent request contexts.
Resident page methods must obtain the current request/identity/transaction from
a call-specific context supplied by the host. Never cache authorization on the
resident instance across login or role changes.

### 6. Resident page objects fit the core, with a snapshot caveat

The core registry already creates a page `store` Bag. Its separate `data` field
is passed through as metadata; do not assume it is the canonical mutable store.
The proposed page data should map deliberately onto `store` or a documented
subtree, not create a second unrelated Bag merely because the field is named data.

Existing extension points:
- `SpaWorker.build_registry()` supplies the consumer registry.
- `RegisterRegistry.page_row_class` selects a row subclass.
- `PageRow.fields_left_behind` excludes runtime fields from parcels.
- `new_store()` supplies the data type.
- `subscribe_page_store(page)` attaches consumer observation after row creation.
- `detach_page(page)` runs on dropped rows AND copied parcel fields.
- Adoption recreates rows through the normal registry methods, with restored store.

A nonserialized field on the consumer PageRow is a plausible home for the resident
page instance. This is a proposal, not a core field that already exists. Lazy
activation after ownership checks is preferable to constructing heavy pages
inside registry birth under dispatch locks. Page identity survives; Python object
identity does not. Close/drop/freeze release subscriptions and scheduled work.
Freeze failure must leave the live page usable. Login may relocate the connection;
it must not leave a resident object with stale user/DB context.

**Confirmed hazard:** `_get_user_parcels()` uses `copy.deepcopy` before
`_detach_parcel_capture()` calls registry detach on the COPY. A Bag subscribed to
a bound method can lead the deepcopy through the owning page and its resources.
A minimal owner containing `threading.RLock` reproduces
`TypeError: cannot pickle '_thread.RLock' object` before post-copy detach can run.
Excluding `page_instance` from row fields does not remove that second reference.

There is also a comment/code discrepancy: some detach docstrings describe the
operation as before copying; the actual worker order is copy, then detach. The
bridge's closure callbacks behave differently from bound methods: functions are
not deep-copied into fresh closure environments. Do not transfer that technique
blindly to a new persistent page object.

Require a coordinated state-snapshot contract that does not traverse runtime
subscribers (and does not mutate the live Bag), or another verified consumer
adapter achieving that property. `Bag.deepcopy()` is not an automatic substitute:
it has different copy semantics, including referenced non-Bag values. This point
belongs to ASGI/Bag integration, not a new Builder subscription engine. No full
freeze/unfreeze browser test was performed for this review.

### 7. Subscriptions exist; stable replacement is the open root issue

Python Bag already has `subscribe`, `unsubscribe` and descendant propagation.
The probe confirms them. Removing a Builder reactive engine did not remove Bag
observation. Correct the earlier conversational impression that all observation
might be missing.

#37 concerns a stable observation boundary when the WHOLE public data subtree is
replaced. A Bag without a `main` wrapper is not flat key/value storage: it can
contain a nested tree. "Flat" in Builders refers to the absence of an artificial
builder-name prefix in addresses.

The page or generic data owner should own the stable data root. Builder borrowing
that data must not insert a private wrapper and reparent it. Preserve authored
paths whether a wrapper exists or not. Options requiring decision: stable wrapper
with a replaceable content branch; or stable public Bag identity with explicit
content-replacement events. Do not close #37 merely by moving `.data` to Page.
The owner must specify who observes replacement and how stale references are
avoided across existing builders, cached subbuilders and subscriptions.

### 8. JavaScript stays reactive, without duplicating business rules

DOM JS already owns an Application/BuilderHandler/data relationship. Builders
have `dataSetter`, `dataFormula`, `dataController`, function-name resolution and
startup/reactive behavior that differs intentionally from Python's single pass.
The client provider execution contract must remain explicit. Legacy JS expression
strings are not automatically compatible with the current `func` names.

A new Pages grammar can declare dataRpc using `@element(_meta={"data_element":
True})` now; the generic engine leaves unknown kinds unexecuted. This was both the
resolution of #38 and an independently reproduced behavior. That does not mean
DOM has a dataRpc executor: it still needs dependency triggering, callback context,
request correlation, result application, pending/error states and stale-response
handling through `genro.rpc`.

Keep local presentation reactions and source bindings in JS. Server business
validation subscribes to server data under Page ownership; it does not require
transpiling Python into JS (#19). Synchronization revisions, validation completion
and save ordering remain separate required work. Having data already on the
server is not proof that all calculations/validation for that revision finished.

## Recorded authoring requirement: callable or page-relative RPC route

Recorded with the owner on 2026-09-07. This authoring requirement is accepted;
Genro Routes support and the implementation mechanism still need verification.
It does not approve the remaining architecture proposals in this document.

Preserve the convenience of supplying a bound Python method to dataRpc, and
also accept an explicit route path relative to the page's routing base:

```python
# Intended authoring contract; not a claim of an implemented Pages API.
pane.dataRpc(".result", self.calculate, value="^.value")
pane.dataRpc(".result", "calculate", value="^.value")
```

Both forms should emit the same serializable route reference. The callable is
resolved on the server to its exposed route; the Python callable itself is not
sent to the browser. The destination data path (`.result`) and the relative RPC
route (`calculate`) are different namespaces.

Resolution is relative to an explicit page routing base, not implicitly to the
browser document URL. For a page mounted at `/monitor/`, the relative route
`calculate` addresses `/monitor/calculate`. A demo selector such as
`/?page=monitor` does not by itself establish that routing base. The reference
must remain usable by both HTTP and WebSocket RPC, independently of transport
selection and its configurable default.

Prefer the callable in Python recipes: route aliases and mount locations should
be resolved from routing metadata rather than duplicating method names or URLs.
Supplying a callable must not implicitly expose a private method or bypass the
route's authorization rules.

Legacy evidence, inspected in the local Genropy checkout:
- `gnrwebstruct/dojo11.py:dataRpc` accepts a callable, including the shorthand
  without a result path.
- `test/webpages/datastore/datarpc.py:test_2_simplesum` passes `self.simplesum`,
  declared with `@public_method`.
- The XML attribute serializer and `gnrlang.serializedFuncName` turn bound
  methods into public names, including proxy/component qualification.
- `gnrwebpage.getPublicMethod` resolves the received name and applies the
  relevant public-method checks; the RPC proxy calls the resulting handler.
- `test15/webpages/ws/testcomunication.py` uses the same callable authoring
  with `httpMethod='WSK'`.

Next verification in Genro Routes: reverse resolution from a bound callable to
its declared route, aliases, mounted objects and lazy routes; how the page base
is supplied to the client; and explicit rejection of unresolved/unexposed
callables. These checks precede the coordinated Builders update.

## Proposed responsibility map

```text
Light ASGI host                         SPA host / integration layer
  local lifetime policy                  page register item
  existing app services                    store -> persistent page state
          |                                runtime instance [not frozen]
          +---------------------+-------------------+
                                |
                          WebPage (RoutingClass proposed)
                            data -> owner-provided Bag
                            route methods / business subscriptions
                            recipe helper methods
                                |
                     per-construction page builder
                       page -> WebPage
                       data -> same server Bag
                       source -> detached recipe tree
                                |
                       typed source + selected initial data
                                |
                     browser genro / source / rooted data
                       local reactions; genro.rpc; explicit sync branches
```

A parent reference is not a serialization edge. Each concurrent recipe/remote
construction has a distinct builder and source. Multiple browser pages have
separate state even when they use the same Python page class. Root/iframe page
identity and physical WebSocket ownership remain separate; this design must not
require a socket on every frame.

Per-page sequential WSK dispatch exists in the inspected core, but it must not
be assumed to serialize every HTTP call or background callback. Row locks and
call scheduling have different scopes; do not hold a thread RLock across an
`await`. Business mutation execution must have one documented policy before
subscribers and ordinary routes can concurrently update the same data.

## Issue disposition and one coordinated update

| Issue | Current status | Role in this update |
| --- | --- | --- |
| [#37](https://github.com/genropy/genro-builders/issues/37) | Open | Decide data owner, stable root and replacement together; retain acceptance cases |
| [#38](https://github.com/genropy/genro-builders/issues/38) | Closed, downstream extension | Implement Pages dialect/provider contract; do not reopen as mandatory generic RPC |
| [#41](https://github.com/genropy/genro-builders/issues/41) | Open | XS and detached source/data preservation; generic serialization requirement remains |
| [#42](https://github.com/genropy/genro-builders/issues/42) | Open | Settle GUI spelling and generic compatibility with the ownership change |
| [#39](https://github.com/genropy/genro-builders/issues/39) | Closed | Preserve released grammar fix; no new workaround |
| [#40](https://github.com/genropy/genro-builders/issues/40) | Open | Child ordering is independent; do not make it a prerequisite for page ownership |
| [#19](https://github.com/genropy/genro-builders/issues/19) | Open, older proposal | Python-to-JS transpilation is not required by this design |
| [#4](https://github.com/genropy/genro-builders/issues/4), [#28](https://github.com/genropy/genro-builders/issues/28) | Closed, historical | Old reactive app pattern exists in history; static refactor superseded it |

Proposed single Builders contract/release batch: borrowed-data lifecycle,
compatible GUI dispatch extension, detached SourceBag serialization and explicit
recipe-only construction support if the Pages subclass cannot cleanly provide it
through existing APIs. Test all together; keep implementation commits reviewable.
Do not equate one coordinated update with moving Page, RPC or freeze into Builder.
Parent delegation and recipe orchestration can initially live in the Pages
builder subclass; require evidence before expanding generic APIs for them.

Related fixes in Bag and host lifecycle need their own repositories and released
artifacts. Existing published issue texts remain unchanged until the owner approves
an updated handoff. Upstream consolidation is not authorized by this analysis alone.

## Acceptance matrix for the coordinated change

1. Generic HTML/XML/CSS builders preserve create/setup/compute/render behavior.
2. A page recipe builds source without executing Python or JS data providers.
3. Borrowed Bag identity survives empty data, nested nodes, SVG subbuilders and
   detached components; builder disposal does not dispose the owner data.
4. Two pages and two concurrent fragments never share unintended state/source.
5. `data`, `dataSetter`, Bag/dict input, attributes, absolute/relative paths and
   actual HTML data element have documented Python/JS behavior.
6. SourceBag XS and mixed Bag branches survive JSON/MessagePack typed envelopes;
   pointers stay expressions, runtime page/builder references stay out.
7. Seed defaults do not overwrite edits on source rebuild, remote or unfreeze;
   explicit reset remains possible and separately requested.
8. Root-content replacement preserves subscriptions and authored addressing.
9. Only decorated/authorized page routes are reachable over either transport;
   root, identity and internal context cannot be supplied by the caller.
10. Same resident instance serves repeated calls; successful freeze releases it;
    restored data receives exactly one set of fresh observers and a fresh instance.
11. Freeze failure leaves live state usable; snapshot never traverses callbacks,
    reparent live data or leak activity from a discarded snapshot to the live page.
12. Guest-to-authenticated transition rechecks context; sibling and iframe pages
    remain isolated; ordinary HTTP/background work follows the concurrency policy.
13. A lightweight host works without SPA imports/registries; a standalone Builder
    works without Pages, Routes or ASGI.
14. Test against published artifacts before removing experimental overrides.

## Performed verification and limits

`pages-builder-analysis-probe.py` beside this document contains eight small
read-only design probes. They verify recipe-only versus create behavior, external
Bag sharing including SVG, downstream dataRpc, routed-main signature behavior,
Bag descendant events, callback-copy failure and the data-name collision.
Expected failures are printed explicitly. All probes completed successfully.

Run from the canonical Pages repository with its existing `.venv`, adding the
canonical Bag/Builders/Routes `src` directories to PYTHONPATH, as recorded in
`pages-builder-analysis-evidence.txt`. No existing suite was modified and no
full migration or real freeze/unfreeze lifecycle is claimed. The prior phase's
92 passing tests validate the old implemented slice, not this proposed architecture.

## Decisions to settle before an upstream handoff

1. Confirm borrowed page-owned data, with autonomous Builder defaults preserved.
2. Confirm GUI-only `data()` compatibility versus a deliberately breaking generic
   datastore rename. Recommendation: compatible GUI spelling in this batch.
3. Choose the stable data replacement boundary (#37) at the data-owner level.
4. Choose routed entry plus ordinary `main(root)`, or decorated recipe with a
   Pages adapter. Recommendation: use the existing route-name mechanism first.
5. Confirm that ordinary `data()` seeds client data; persistent/synchronized
   branches need an explicit declaration and initialization policy.
6. Settle the subscriber-safe snapshot contract with ASGI/Bag before installing
   live page subscriptions; decide resident activation and cleanup semantics.

Discuss in that order, not six unrelated implementation patches. Naming approval
for the current phase remains pending and does not approve this architecture.

## Source locations

All paths below are relative to the named repository at the snapshot above.

- Builders: `src/genro_builders/builder/base.py:345` (construction), `:468`
  (subbuilder sharing), `:530` (main/setup/create), `:617` (compute), `:658`
  (data_logic); `builder/source_bag.py:119` (node data), `:43` (containers).
- Pages: `src/genro_pages/page.py`, `application.py:get_main`,
  `widget_test_builder.py`; `js/src/application.js`, `rpc.js`.
- Routes: `src/genro_routes/core/routing.py:181`, `base_router.py:685`,
  `router_node.py:265`, `decorators.py:54`.
- ASGI: `src/genro_asgi/spa/register_row.py:46`, `register_registry.py:191`,
  `:263`, `:398`; `orchestration/spa_worker.py:674`, `:1750`, `:2653`, `:2707`.
- Bag: `src/genro_bag/bag/_events.py:161`; `_populate.py:297`, `:340`.
- Bridge: `src/genropy_asgi/spa/genropy_register.py:120`, `:168`.
- Legacy: `gnrpy/gnr/web/gnrwebstruct/base.py:132`, `:170`, `:793`, `:847`;
  `dojo11.py:86`, `:102`, `:112`; `gnrwebpage.py:1237`, `:2356`, `:2694`;
  `gnrwebpage_proxy/rpc.py:24`.
- DOM JS: `src/application.js`, `builder-base.js:423`, `builder-handler.js`,
  `source-bag.js`; Python and JS provider semantics must be compared explicitly.

## Genro Routes feasibility probe — 2026-09-07

Executed against the Pages environment's installed genro-routes 0.30.0; source
reference: canonical Routes 0051b86. No Routes or Pages production code changed.

Verified with small local RoutingClass subclasses:
- add_branches with a cls spec defers construction; nodes() does not instantiate
  the page. First traversal creates one page instance, reused on later traversal.
- A branch alias reaches the same materialized instance, not a second page.
- @route(name="calculate") on compute exposes calculate. nodes()["entries"]
  contains both the declared name and the bound callable; comparing the callable
  identifies the entry without reading private decorator attributes. Undecorated
  private methods are absent in this probe's default configuration.
- page.route.get_url("calculate") returns calculate; host.route.get_url(
  "monitor/calculate") and host.route.get_url("@poc.calculate") return
  monitor/calculate. Resolving shortcut/calculate through a branch alias returns
  the canonical target monitor/calculate.
- get_url(page.compute) raises AttributeError: direct callable reverse lookup
  is not an implemented public input contract.
- Two @route declarations on one callable create two entries. Automatically
  choosing one would be ambiguous. Proposal pending owner decision: require an
  explicit route path in that case; raise a clear construction-time error for
  an ambiguous callable rather than selecting the first entry.

Consequences: Pages can adapt an unambiguous callable using public router
introspection; a generic new Builder routing dependency is not demonstrated as
necessary. Authoring lookup is not request authorization: actual invocation must
still traverse the router and its plugins. get_url performs candidate resolution,
not authorization. Global endpoint_id is optional and must not become mandatory
for multiple independently instantiated pages. Handling references to methods
on other mounted contributor objects remains to be verified separately.

The router's reused lazy instance is service-instance lifetime, not automatic
per-browser-page isolation. SPA page_id-to-instance ownership and lightweight
shared-state hosting remain responsibilities to settle in Pages/host design.
