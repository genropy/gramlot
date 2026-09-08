# 6. Glossary, maintenance map and open decisions

[Contents](README.md) · [Previous: proposal](05-proposal.md)

Version: 0.1 · 2026-09-08 · 🔴 DA REVISIONARE.

> **Snapshot boundary:** Chapters 1–4 describe the client assembly C tested during this analysis. The authoritative DOM worktree changed concurrently: new form/validation code is described in [the closing addendum](07-concurrent-work.md). Claims of absence apply to the tested C runtime, not to that later unverified work.

## In this chapter

- [6.1 Glossary](#61-glossary)
- [6.2 Concept → module → symbol → test](#62-concept--module--symbol--test)
- [6.3 Current gaps and uncertainties](#63-current-gaps-and-uncertainties)
- [6.4 Decisions needing owner review](#64-decisions-needing-owner-review)
- [6.5 Refresh procedure for the next maintainer](#65-refresh-procedure-for-the-next-maintainer)

## 6.1 Glossary

| Term | Meaning in this system |
| --- | --- |
| Adapter | Boundary translating reusable GUI behavior into a host/framework's routes, context, responses or transport |
| Application | DOM runtime object owning handler, target, events and a mounted builder; Pages extends it |
| ASGI | Python asynchronous application/server interface used by the current host and proposed portable HTTP adapter |
| Attribute | Metadata on a Bag node; source attributes may be recipe parameters, bindings or renderable HTML/CSS inputs |
| Backref | Parent/root linkage enabling nested Bag traversal and upward notification |
| Bag | Ordered labelled node tree; ordinary data container with typed values/attributes |
| Binding | Source value/attribute referencing Data; `^` subscribes, `=` reads passively |
| Bootstrap document | Initial HTML containing assets, startup configuration and empty render host |
| Builder | Grammar-aware source constructor plus render integration; Python static and JS reactive engines differ |
| Builder segment | Named branch under handler Data root, exposed as `builder.data` |
| Collection | Registered grammar and Web Component family; requiring it is not the same as downloading it |
| Component expansion | Builder method invoked at render time to generate temporary source blocks, possibly per row |
| Container method | Author-time recipe composition helper that adds source into its caller's target |
| Data element | Transparent recipe node performing setter/formula/controller logic rather than rendering DOM |
| Data widget | Widget such as storeTree receiving a Bag store property and owning its data subscription/rendering |
| Datapath | Source context used to resolve relative Data addresses |
| Dialect | Grammar/rendering family such as HTML or SVG |
| Fired value | Notification-bearing write whose stored value resets afterward |
| Generation guard | Counter/ticket preventing a late async completion from affecting a newer owner |
| Handler | Coordinator owning the rooted Data Bag, pointer map, logic scheduling and render queues |
| Host | Python application/server supplying routes, identity, services and process lifecycle |
| Hydration/import | TYTX class reconstruction followed by builder-owned source copying; not DOM hydration of server page markup |
| Inspector | Owned developer tool referring to real page Bags, with typed scalar draft editing |
| Live section | Synchronous mutation batch followed by formula drain and render flush; no rollback |
| Node ID | Author source anchor (`node_id`), distinct from HTML `id` and runtime target ID |
| Origin/reason | Bag event metadata identifying a write origin; used to suppress self-echo |
| Page ID | Optional host-issued registered identity used by Pages RPC, not a DOM node identity |
| Pointer map | Runtime index from absolute Data paths to source readers |
| Recipe | SourceBag describing structure, attributes and data logic before rendering |
| Renderer | Walk translating source nodes into dialect output |
| Shadow root | Encapsulated DOM owned by a Web Component; its native input differs from the recipe host |
| SourceBag | Builder-aware Bag with `XS` TYTX class identity; ordinary Bag uses `X` |
| Target | Consumer of full render/partial patches; `DomTarget` applies them to a host element |
| TYTX | Typed serialization boundary used for startup, recipes, data and RPC payloads |
| WSX | Existing Genro ASGI text-envelope request/reply protocol over WebSocket |

## 6.2 Concept → module → symbol → test

Repository coordinates are defined in [Contents](README.md); each exact file is linked in the [source symbol index](source-symbol-index.md). Test names are files unless a precise test function is useful. An associated passing test is evidence for its assertions, not for every behavior of the symbol.

| Concept | Module | Symbol(s) | Test / evidence |
| --- | --- | --- | --- |
| Python page authoring | P `src/genro_pages/page.py` | `WebPage.main` | P `tests/test_hello_world.py` |
| Fresh recipe request | P `src/genro_pages/application.py` | `WebpageApplication.get_main` | `TestHelloWorld.test_recipe_crosses_asgi_and_builds_in_javascript` |
| Document / recipe separation | P `src/genro_pages/page_document.py` | `PageDocument.build_body` | P `tests/test_page_bootstrap.py`, shell test in `test_hello_world.py` |
| Startup escaping | P `src/genro_pages/page_document.py` | `get_script_json` | P `tests/test_page_bootstrap.py` |
| Menu registration | P `src/genro_pages/menu.py`, `application.py` | `MenuBuilder`, `validate_menu` | P `tests/test_hello_world.py`, `test_widget_pages.py` |
| Registered identity | P `src/genro_pages/application.py` | `index`, `get_registered_page` | P `tests/test_registered_page.py`, `test_registered_server.py` |
| Worker host | P `src/genro_pages/worker.py` | `PageWorker`, `PageServer.run_sync` | Real worker test in P `tests/test_registered_server.py` |
| Client bootstrap | P `js/src/bootstrap.js` | `renderPage` | P `tests/test_page_bootstrap.py`, `test_registered_channel.py` |
| Source class identity | D `src/source-bag.js`; B `builder/source_bag.py` | `SourceBag`, class registration | P `tests/test_typed_envelope.py`; D `tests/imported-source.test.js` |
| Imported source ownership | D `src/builder-base.js` | `loadSource`, `_copyImportedSource` | D `tests/imported-source.test.js`, P `test_hello_world.py` |
| Relative / marked paths | D `src/source-bag.js` | `absDatapath`, `_resolveSymbolicDatapath` | D `tests/abs-datapath.test.js` |
| Reactive vs passive read | D `src/builder-base.js` | `runtimeValues` | D `tests/actions.test.js`, `reactive-logic.test.js` |
| Input-to-data | D `src/application.js` | `_enableInput`, `_applyMutation` | D `tests/writeback.test.js` |
| Anti-echo | D `src/builder-handler.js` | `_onDataEvent` | D writeback test “the originating node is not re-rendered” |
| Stable explicit HTML ID | D `src/contrib/html/html-builder.js`, `target-wrapper.js` | `_autoId`, `_byId` | D `tests/explicit-dom-id.test.js` |
| Source insert/remove | D `src/builder-base.js` | `_onSourceEvent`, `renderNodes` | D `tests/structural.test.js` |
| Render reconciliation | D `src/target-wrapper.js` | `_reconcile`, `_patchAttributes` | D `tests/widget-labels.test.js`, `layout-containers.test.js` |
| Action context | D `src/services/recipe-runtime.js` | `RecipeRuntime.run` | D `tests/actions.test.js` |
| Page topics | D `src/services/topics.js` | `subscribe`, `publish`, `dispose` | D `tests/actions.test.js`, P `test_runtime_consumers.py` |
| Formula cascade | D `src/builder-handler.js` | `_drainFormulas` | D `tests/reactive-logic.test.js`, `component-rules.test.js` |
| Component expansion | D `src/renderer/base.js` | `_renderComponent`, `_expandBlock` | D `tests/component.test.js` |
| Per-row updates | D `src/builder-handler.js`, `builder-base.js` | `_expansionRow`, `renderNodes` | D `tests/per-row-patches.test.js` |
| Collection registration | D `src/collections.js` | `registerCollection`, `webcomponent` | D `tests/widgets.test.js` |
| CSS adaptation | D `src/contrib/html/html-attributes.js` | `HtmlAttributes.adaptAttrs` | D `tests/style-adapter.test.js` |
| Label independence | D `src/widget-label.js` | `WidgetLabel.apply` | D `tests/widget-labels.test.js`, P `test_widget_labels.py` |
| Null vs empty | D `src/input-null-state.js` | `InputNullState.clear`, `setNull` | D `tests/input-null.test.js`, P `test_input_null.py` |
| One-time defaults | D `src/recipe-defaults.js` | `initializeNode` | D `tests/sliders-defaults.test.js`, P `test_slider_defaults.py` |
| Choice validity | D `src/collections/inputs.js` | `GnrComboBox`, `GnrFilteringSelect` | D `tests/choices.test.js` |
| Store-tree lifetime | D `src/collections/storetree.js` | `_resubscribe`, `disconnectedCallback` | Existing `storetree.test.js`; additional diagnostic in verification confirms leak |
| Palette and stack | D `src/collections/palette.js`, `layout.js` | `defineComponents` | D `tests/palette.test.js`, `stack.test.js` |
| Inspector mutation | P `js/src/inspector-editor.js` | `getUnchanged`, `apply` | P `tests/test_inspector_editing.py` |
| Playground ownership | P `js/src/lab-session.js`, `playground.js` | `LabSession.dispose`, `mountPlayground` | P `tests/test_playground.py`, `test_runtime_consumers.py` |
| Async editor cleanup | P `js/src/codemirror-component.js` | `connectedCallback`, `disconnectedCallback` | P `tests/test_codemirror_labels.py`, `test_runtime_consumers.py`; CDN visual pass not rerun |
| RPC correlation | P `js/src/rpc.js` | `_sendCall`, `_receiveMessage` | P `js/tests/rpc.test.mjs` |
| Real WSX boundary | P `src/genro_pages/worker.py`, `application.py` | worker and registered routes | P `tests/test_registered_server.py` |
| Whole-page disposal | D `src/application.js`, P `js/src/application.js` | `dispose` | P `tests/test_runtime_disposal.py` |
| Generic validation / form | No new runtime module | No implemented service | Proposal only; legacy `genro_frm.js` is reference |
| Portable FastAPI adapter | No current adapter | Placeholder APIs in Chapter 5 | Proposed integration/packaging contracts, not passing implementation tests |

## 6.3 Current gaps and uncertainties

| Area | Observed limitation | Consequence / next verification |
| --- | --- | --- |
| Store-tree cleanup | Missing unsubscribe options leave callback active after disposal | Reproduced; future fix/test belongs to D |
| Binding re-registration | Attribute/inherited-datapath changes need broader exact-key/descendant audit | Inspect pointer-map removal and prove old paths stop triggering |
| Focus preservation | Anti-echo and selected reconciliation branches exist, not universal DOM identity retention | Real-browser tests for external and structural updates |
| Action language | Trusted Function execution; no general legacy macro compiler | Use method APIs; do not port legacy string syntax blindly |
| Async source lifecycle | Page/service guards exist; no universal removed-node callback ownership | Add explicit source-owned cancellation contract before general remote providers |
| Data providers | Setter/formula/controller slices exist; remote grammar is not operational dataRpc | Design and test provider cancellation/errors separately from RPC transport |
| Validation/forms | Native validity and inspector parsing only | Proposed rule engine and Bag form require reviewed contracts |
| Null policy | Explicit null/empty preserved; configurable blankIsNull/view_null absent | Owner must settle default normalization and visual policy |
| Store widgets | Own subscriptions/state; generic scalar reactivity does not cover all store replacement behavior | Replace stores while retaining expansion/selection and ensure old subscriptions disappear |
| Resource discovery | Eager collection imports and fixed shell paths | No selective late collection loading or normalized page resource declarations |
| Prefix mounting | Root guard and root-absolute links/imports/WSX endpoint | Coherent URL seam needed before common ASGI mount |
| Production distribution | Pages JS included, complete dependencies still external | Clean wheel without Node/siblings remains a release gate |
| Client-only bootstrap | Standalone DOM works; registered Pages opens channel and fetches tools | Proposed capability split must be implemented and tested |
| Host lifecycle | Registered startup proven; full close/expiry/freeze/resume/reconnect unproven | Do not infer persistence from worker registration |
| Mobile/accessibility | Some pointer/keyboard paths exist | Actual device, focus, ARIA and layout review still required |
| Snapshot reproducibility | Dirty runtime and Builders work plus copied client assembly | Use hashes and preserve source changes before release/consolidation |

## 6.4 Decisions needing owner review

1. Whether to unify repositories at all; provisional repository name and retained distribution names.
2. Public names for portable page/document/context/adapter contracts; dependency extras and old import lifetime.
3. Release-set version policy, supported startup/recipe ranges and capability negotiation.
4. Asset build tool, collection selection, generated manifest, cache/URL strategy and source-development overrides.
5. Boundary of a common ASGI adapter versus FastAPI route dependencies and Genro worker/WSX integration.
6. Source lifecycle/cancellation guarantees and input identity promises during external updates.
7. Explicit/automatic `labledBox` semantics, inherited field styles and path/layout ownership.
8. `blankIsNull` default, any alias precedence, `view_null`, invalid draft write policy and checkbox presentation.
9. Validation coercion/rule compatibility and portable form scope, baseline comparison and save concurrency policy.
10. Which legacy recipe-language/event/provider behaviors are worth preserving, and which differences are intentional.

These are review decisions, not tasks executed by this document. The existing worktrees, runtime and application source remain untouched.

## 6.5 Refresh procedure for the next maintainer

Record HEAD/branch/status and actual Python import files; compare D `src` with the served DOM copy; read the latest roadmap/consolidation notes; run the appropriate installed-assembly tests; update the manifest and affected chapters. When a proposal becomes implementation, replace its “proposed” label only after reading the landed code and tracing a concrete consumer test. A later commit or changed version number alone is insufficient evidence.
