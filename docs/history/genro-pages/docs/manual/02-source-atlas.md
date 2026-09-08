# 2. Source atlas

[Contents](README.md) · [Previous: architecture](01-architecture.md) · [Next: runtime](03-runtime.md)

Version: 0.1 · 2026-09-08 · 🔴 DA REVISIONARE.

> **Snapshot boundary:** Chapters 1–4 describe the client assembly C tested during this analysis. The authoritative DOM worktree changed concurrently: new form/validation code is described in [the closing addendum](07-concurrent-work.md). Claims of absence apply to the tested C runtime, not to that later unverified work.

Paths use the root keys from the main manual. Every maintained Python/JS/CSS source and test in P and D has a direct file link in the [symbol index](source-symbol-index.md). This chapter explains their relationships, rather than treating an import listing as architecture. Tests below are relative to the repository owning the source unless prefixed otherwise.

## In this chapter

- [2.1 Python recipe and hosting layer](#21-python-recipe-and-hosting-layer)
- [2.2 Browser page integration](#22-browser-page-integration)
- [2.3 DOM kernel](#23-dom-kernel)
- [2.4 Collections and dependency modules](#24-collections-and-dependency-modules)
- [2.5 Source, generated data and distribution](#25-source-generated-data-and-distribution)

## 2.1 Python recipe and hosting layer

| File / primary symbols | Responsibility and callers | State and lifetime | Tests / when to intervene |
| --- | --- | --- | --- |
| P `src/genro_pages/page.py`: `WebPage.main`, `client_builder`, `client_setup`, `source_inspection` | Host-independent page authoring descriptor; consumed by `WebpageApplication` | Class configuration; fresh instance for recipe construction | `test_hello_world.py`, `test_page_bootstrap.py`; authoring contract or client descriptor |
| P `application.py`: `WebpageApplication.index`, `get_main`, `get_menu`, `get_inspector`, `get_registered_page`, `__call__` | Route selection, recipe serialization, shell generation, registered identity checks, asset serving | Application lifetime: page registry, menu class, module roots, worker reference | `test_hello_world.py`, `test_registered_page.py`; wrong route, identity, assets or transport |
| P `page_document.py`: `PageDocument.main`, `build_head`, `build_body`, `build_menu`, `get_script_json` | Python-rendered initial HTML; invoked by `index` | Startup Bag/menu for one response | `test_page_bootstrap.py`; import map, startup escaping, menu links, resource order |
| P `menu.py`: `MenuElements`, `MenuBuilder` | Static grammar with `branch` and `webpage`; `DemoMenu` populates it | Recipe tree; validation cross-checks page registry | `test_hello_world.py`, `test_widget_pages.py`; navigation vocabulary |
| P `demo.py`: `DemoMenu`, `DemoApplication` | Concrete registration and collection menu, not generic GUI kernel | Registered page class map | `test_widget_pages.py`; add a demo destination |
| P `worker.py`: `PageWorker`, `PageServer.run_sync` | Adapter to `SpaWorker`; build one hosted demo per worker, delegate sync calls to worker pool | Worker process and request context | `test_registered_server.py`; concurrency or host-version adaptation |
| P `server_configuration.py`: `PageConfiguration.main` | Builds Genro ASGI orchestration configuration and string worker-entry paths | Configuration instance and state directory | `test_registered_page.py`, `test_registered_server.py`; host imports or launch topology |
| P `__main__.py`: `Cli.run` | CLI options and server launch | Process entry only | Registered-server test; launch parameters |
| P `hello_world.py`: `HelloWorldPage` | Compatibility host entry for original single-page experiment | Inherits the application host; delegates recipe to `pages.hello_world` | `test_hello_world.py`; preserve old import independently of new page class |
| P `widget_test_builder.py`: `WidgetTestBuilder` element methods | Python declarations matching experimental client collection grammar, including `data` alias | Grammar/class, SourceBag per recipe | `test_data_recipe.py`, widget integration tests; new Python-visible widget/tag |
| P `widget_test_page.py`: `WidgetTestPage.main` | Discover `test_*` methods, isolate datapaths, show Live/Python tabs using inspected method text | Fresh recipe composition | `test_widget_pages.py`; demo isolation/source presentation |
| P `inspector.py`: `build_inspector` and helpers | Recipe for palette, tree views and editor templates | Tool recipe per request | `test_inspector.py`, `test_inspector_editing.py`; inspector UI structure |

Except for the first row, the short filenames in this table are under `P/src/genro_pages/`. `pages/hello_world.py` and `pages/about.py` provide small HTML recipes; `pages/playground.py` composes the laboratory using `PlaygroundBuilder` and client setup. `pages/widgets/*.py` contains individual cases for inputs, box/panel/border/tab/stack, palette, tree and clipboard. `pages/widgets/__init__.py` exposes `WIDGET_PAGES`. These files are executable usage documentation; they are not collected pytest tests merely because methods begin with `test_`.

`get_main` invokes `page_class().main(builder.source)` directly. It does not call Python `builder.create()` or render the page recipe. That matters for data elements: the client must receive and execute them, not receive only Python's computed HTML. In contrast `PageDocument.create()` and `.render(...)` intentionally execute Python's static HTML path.

The current host is tightly tied to a **root mount**. `WebpageApplication.__init__` rejects a nonempty `mount`, and generated URLs start at `/`. Changing just that guard cannot provide prefix support: document links, client imports, main/inspector endpoints and WSX URL construction all participate.

## 2.2 Browser page integration

| P `js/src/` module / symbols | Called by and responsibility | Owned state / cleanup | Evidence / intervention |
| --- | --- | --- | --- |
| `bootstrap.js`: `renderPage` | Module entry from HTML; decode startup, create runtime, channel, source, builder, tools, setup | Module generation ticket; replaces old root and disposes old app | `test_page_bootstrap.py`, `test_registered_channel.py`; stale load or startup ordering |
| `application.js`: `PageApplication` | Bootstrap subclass of D `Application` | `pageId`, `RpcService`; dispose RPC before DOM runtime | Registered-channel/disposal tests; transport ownership |
| `rpc.js`: `RpcService` | `PageApplication` exposes `remoteCall`/`openChannel` | Correlation map, timers, HTTP controllers, WebSocket and opening promise; explicit dispose | `js/tests/rpc.test.mjs`, registered-channel/server tests; timeouts or cross-call replies |
| `gallery.js`: `GalleryBuilder` | Dynamic builder selected by widget pages | Class grammar; eagerly imported collections | Widget Pages integration; collection availability |
| `playground-page.js`: `PlaygroundBuilder` | Python playground client descriptor | Extends gallery with `labEditors` | `test_playground.py`; editor grammar |
| `playground.js`: `mountPlayground` | `client_setup` hook | UI event removers and owned `LabSession`; stop nested input propagation | `test_playground.py`, `test_runtime_consumers.py`; controls vs experiment isolation |
| `lab-session.js`: `LabSession.reset/run/dispose` | Playground execution engine | Independent app, data/source subscriptions; rebuild disposes and recreates | Playground/runtime consumer tests; Apply vs Rebuild semantics |
| `dev.js`: `DeveloperTools.dispose` | Inspector/playground mount functions | Owns child tools, not a second global runtime | `test_runtime_consumers.py`; recursive cleanup |
| `inspector.js`: `mountInspector` | Bootstrap after page mount | Tool app, shortcut registry, live references to page Bags, subscriptions, editor disposers | Inspector/editing/disposal tests; avoid reparenting inspected Bags |
| `inspector-editor.js`: `InspectorEditor.apply/refresh/reload/getParsed` | Inspector selection and Apply action | Selected node identity, value/attribute snapshot, draft dirty state; listener disposal | `test_inspector_editing.py`; conflict, type parsing, rollback |
| `shortcuts.js`: `Shortcuts.register/execute/dispose` | Inspector | Document listener and named command map | `test_runtime_consumers.py`; modifier, editing, repeat or IME behavior |
| `codemirror-component.js`: registered `CodeMirrorElement` | `PlaygroundBuilder` collection | Editor instance, fallback textarea, async generation; destroy/disconnect | `test_codemirror_labels.py`, playground tests; async resource and focus behavior |
| `bag-xml-view.js`: `bagXmlView` | Playground diagnostic callback | Derived text only | Playground tests; readable typed Bag display |
| `recipe-highlight.js`: `highlightRecipes` | Bootstrap after mount | Optional asynchronous highlighter work | `test_widget_pages.py`; literal source display |
| `module.js`, `xmldom.js` | Browser import-map shims for dependency expectations | Adapter exports, not page state | Bootstrap/transport tests; raw ESM dependency compatibility |
| `shell.css`, `theme.css`, `inspector.css` | Document or tool stylesheet loading | Document/shadow styling | Browser review plus widget tests; cascade and compact layout |

The inspector references `page.builder.data` and `page.builder.source` as store properties on its trees. Putting those Bags under the inspector's own Data tree would change their parent/backref ownership and is therefore not equivalent. The UI's selected paths belong to the inspector's data; the edited nodes belong to the inspected page.

`LabSession.run` is intentionally a local developer console implemented with `new Function`. It receives `root`, `data`, `source`, `builder`, `app` and `Bag`. It is trusted author code with normal browser privileges; it is not a sandbox for untrusted recipes. Apply mutates existing Bags and retains changes made before an exception. Rebuild creates a new Application. These are different operations, not two ways of applying a transactional diff.

## 2.3 DOM kernel

| D `src/` module / symbols | Responsibility, callers and dependencies | State / lifetime | Tests / intervention |
| --- | --- | --- | --- |
| `index.js` | Package exports for SourceBag, builders, handler, targets, renderers, Application, grammar and collection helpers | Import boundary | `embryo.test.js`, consumers; public export stability |
| `source-bag.js`: `SourceBag`, `SourceBagNode`, `wrapSource` | Bag subclasses, TYTX `XS` registration, fluent Proxy, runtime attributes and path methods; called by builder/renderer/actions | Node builder pointer, target ID, root handler link | `abs-datapath.test.js`, `imported-source.test.js`; path, type or authoring dispatch |
| `builder-base.js`: `BuilderBase` | Schema resolution, `setChild`, `loadSource/create`, `runtimeValues`, data logic, source events, render patch generation | Source root, handler/data references, target serials, imported recipe, writeback maps, defaults | Structural/import/component/reactive-logic tests; grammar or patch generation |
| `builder-handler.js`: `BuilderHandler`, private `RowContext` | Own data root; activation, pointer map, data events, batching, formula cascade, row rule dispatch, patch optimization | Subscriptions, queues, dedup sets, component/shared rules, removed IDs | `reactive-logic`, `component-rules`, `per-row-patches`, `structural`; scheduling or missed update |
| `renderer/base.js`: `RendererBase` | Recursive walk; meta handling; component expansion; dialect dispatch; fragment finalization | Per-renderer cache, expansion bookkeeping | `component.test.js`, `container.test.js`, `svg.test.js`; mixed dialect or expansion shape |
| `contrib/html/html-builder.js`: `HtmlBuilder`, `HtmlRenderer` | HTML grammar and DOM element creation; attributes, target identities, pointer hooks and store property | Render-time element construction | `embryo`, `writeback`, `explicit-dom-id`; DOM projection |
| `contrib/html/html-attributes.js`: `HtmlAttributes` | CSS-root and dialect attribute adaptation reused by labels | Dialect value; no datastore | `style-adapter.test.js`, `widget-labels.test.js`; incorrect attribute/style routing |
| `contrib/html/html5-elements.js` | Static grammar data consumed by `defineGrammar` | Class schema input | Embryo/import tests; HTML vocabulary |
| `contrib/svg/svg-builder.js`: `SvgBuilder`, `SvgRenderer`; `svg-elements.js` | SVG namespace renderer and grammar | Renderer per dialect | `svg.test.js`; namespace and SVG attributes |
| `target-wrapper.js`: `TargetWrapper`, `DomTarget` | Full replace, partial patch application and limited reconciliation; uses source target IDs | Caller-owned host plus WeakMap of recipe DOM snapshots | Structural/layout/labels/ID tests; focus, replacement, runtime style preservation |
| `application.js`: `Application` | Own handler/target/events; mount; delegated writeback and recipe commands | Listeners, disposed flag, builder; recursive dev cleanup | `writeback`, `actions`, `deferred-mount`; page API and input routing |
| `services/recipe-runtime.js`: `RecipeRuntime.run` | Evaluate action strings with fresh arguments and source-node `this` | Application reference | `actions.test.js`; action scope/compiler boundary |
| `services/topics.js`: `TopicService` | Synchronous page topics and live source `subscribe_*` traversal | Callback sets, unsubscribe handles and optional signals | `actions.test.js`, P runtime consumers; topic ownership |
| `recipe-defaults.js`: `RecipeDefaults` | Seed missing pointer targets once per source node | WeakSet of initialized nodes; builder reference | `sliders-defaults.test.js`; null/default overwrite |
| `collections.js` | Register collection metadata, merge grammar later, define custom elements and inject CSS | Module registry and CSS dedup set, shared within realm | `widgets.test.js`; unknown collections |
| `widget-label.js`: `WidgetLabel` | Stable internal label/content wrapper and decoration adaptation | Host/control/box references, MutationObserver, applied attribute map | `widget-labels.test.js`; label focus/style preservation |
| `input-null-state.js`: `InputNullState` | Represent null separately from native input values; keyboard gesture and pending blur commit | Null/pending flags and input-local listeners | `input-null.test.js`; null/empty/readonly/IME behavior |
| `pointer.js`, `utils.js` | Pointer parsing/scanning and Bag detection utilities | Stateless helpers | `pointer.test.js`; syntax helpers, not replacement for `absDatapath` |

The handler decides **what needs a render**; the builder decides **which patches represent it**; the renderer decides **what DOM a source node means**; the target decides **how to apply the patch to existing DOM**. Keep these responsibilities separate when debugging: a correct fragment cannot fix a missing notification, and an overbroad replacement cannot be fixed by changing the widget's label text.

The source header in several files still says components, symbolic paths or anti-echo are “not yet ported.” Actual methods and tests show those slices exist. Conversely, the presence of a grammar field such as `formId` or `dataRpc` does not prove a form controller or remote data provider exists.

## 2.4 Collections and dependency modules

D `collections/inputs.js` defines text/password/number/date/time inputs, checkbox, comboBox/filteringSelect and horizontal/vertical sliders. `layout.js` defines panel, box, borderContainer, tabContainer/tab, contentPane, stackContainer and stackButtons. `colorpicker.js`, `storetree.js`, `palette.js`, `clipboard.js` are separate collection modules. Their classes are mostly local to `defineComponents`; use collection registration as the extension boundary, not imports of private class names. Chapter 4 maps widget contracts and tests.

B `builder/base.py` and `_grammar.py` own Python schema-based construction; `_decorators.py` supplies `element` and composition decorators; `source_bag.py` owns builder-aware node/Bag behavior; `_validators.py` and grammar export utilities are distinct from browser input validation. Python `renderer/base.py` and `contrib/html/html_builder.py` implement static rendering, used for the document. Do not port the current Python static engine's removal of reactive queues into DOM accidentally: the browser engine has its own implemented reactive lifecycle.

C `genro-bag-js/src/bag.js`, `bag-node.js` and the ordered node-container implementation own traversal, values/attributes, insertion/deletion, backrefs and notification. Bag's TYTX methods encode tree/class metadata; C `genro-tytx/js/src/index.js` exposes codecs and registry exports. Python counterparts come from installed packages. GUI code should call these APIs instead of mutating node internals or reimplementing class hydration.

## 2.5 Source, generated data and distribution

- P `src/genro_pages`, P `js/src`, D `src`, B `src` are source. The JS HTML grammar explicitly says it is generated from genro-builders and must not be edited by hand; regenerate it from its owner when changing that vocabulary. Grammar tables are runtime inputs, distinct from generated wheel assets.
- P `temp/client-*` trees are development assemblies/backups. C's DOM is a disposable **copy** of D. C `node_modules` and lockfile record dependency installation, not new GUI ownership.
- P `js/src` is force-included by Hatch into wheel path `genro_pages/resources`. The host chooses the source directory if present, otherwise this packaged resource directory. Do not maintain both by hand.
- A wheel containing Pages JS is not yet a self-contained wheel containing all DOM/Bag/TYTX assets. Current construction still requires external client roots.
- P `tests/*.mjs` are Node integration consumers invoked from pytest or loader commands; P `js/tests/rpc.test.mjs` is a focused service test. D `tests/*.test.js` is the standalone runtime suite. `tests/dom.js` creates jsdom globals; it is test infrastructure.
- P and D examples, docs and `temp/` evidence are explanatory artifacts; they are not installed production entry points. The symbol index deliberately keeps tests separate by path.
