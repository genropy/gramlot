# Legacy lifecycle audit — verified paths and open coverage

Date: 2026-09-06. Read-only runtime investigation; no runtime changes in this pass.
Reference root: `/Users/gporcari/Sviluppo/Genropy/genropy`.
This records traced mechanisms, not a claim that the entire legacy repository
has been audited. Read with runtime-legacy-contract.md and the reorganization plan.

## 1. Server document to client instance

`gnrpy/gnr/web/gnrwebpage.py:rootPage` obtains build_arg_dict and selects the
template. Page identity is registered/checked earlier in page construction
(_check_page_id / _register_new_page), not invented by the browser bootstrap.
The default Mako path and opt-in Python PageTemplate path were both inspected.
The new implementation must use the DOM builder, as explicitly chosen by owner.

`frontend/basepagetemplate.py:PageBuilder` creates html/head/body with GnrHtmlSrc.
`resources/common/tpl/standard.py` composes document structure and resolves
HeaderTemplate through resource lookup. `gnr_header.py` emits resource imports
and GenroClient construction with page_id, startArgs and domRootName.
Thus template selection, page identity, resources and GUI source are distinct.

## 2. Client initialization is not source readiness

`genro.js:genroInit` creates page services and pagehide/beforeunload hooks.
`start` establishes parent/root context, then getMainSource fetches the source.
`dostart` loads context and calls src.startUp. The latter inserts the source under
main, and source triggers drive construction.
Near genro.js:790 a delayed callback connects the parent iframe, installs the
window message listener, fires gnr.onStart, publishes onPageStart and sets
_pageStarted. This is later than starting source construction.

Do not equate connectedCallback, a rendered node, a mounted source and page-ready.
Preserve their semantic ordering; the historical 100ms timer is not itself the
contract and must not be copied as a readiness mechanism.

## 3. Source construction and callback scope

`gnrdomsource.js:build` calls genro.src.stripData before ordinary widget building.
`_doBuildNode` extracts onCreated, connect_*, subscribe_*, selfsubscribe_* and
formsubscribe_*. It creates the target through genro.wdg.create. onCreated is
called with this=source node and arguments widget,attributes. Node IDs are
registered; connect callbacks are bound to the node; subscriptions have owners.
Lazy construction adds another stage and requires independent review coverage.

`connect(target,eventname,handler)` defaults to the widget's default event when
appropriate. If a target widget has the requested method/event, dojo.connect
connects there; otherwise it connects to target.domNode. A direct DOM target is
also supported. This is broader than addEventListener: method interception must
be separated from DOM listening, not silently translated into a DOM event name.

`currentAttributes()` evaluates every attribute through getAttributeFromDatasource.
Actions, controller execution and RPC callbacks rely on the node context, but
widget-internal methods are a separate scope. A blanket this rebinding is wrong.

## 4. Data providers and startup triggers

Python declarations are in `gnrwebstruct/dojo11.py` (a package in this checkout):
- dataFormula(path, formula, **kwargs) emits path/formula.
- dataController(script=None, **kwargs) emits script.
- dataRpc(pathOrMethod, method=None, **kwargs) supports a method-only form with
  no destination as well as a path+method form. Do not copy its outdated docstring
  claim that a destination is mandatory without checking the implementation.

`genro_src.js:stripData` around 640–717 handles provider initialization:
_init executes immediately; _timing schedules; _onStart subscribes to
^gnr.onStart; numeric _onStart can supply a delay. _onBuilt uses an after-build
callback, optionally delayed. self/form subscriptions receive different prefixes.
These controls are not interchangeable with the new builder's _on_start flag.

`gnrdomsource.js` around 475 compiles a formula as a return expression, a
controller as a statement body, then applies the function with this=source node.
The current new runtime instead accepts func functions/names and argument
objects. A GUI compatibility adapter is required; engine presence alone does
not mean old recipes work.

RPC _onResult(result,kwargs,old), _onError(error,kwargs) and _onCalling are
compiled in source scope. Response ordering, conditions, fired arguments and
callback chaining need dedicated tests before porting. Builder issue #38 covers
the declarative entry, not this whole runtime.

## 5. Deletion is a pipeline

node._destroy() pops its source node. genro_src._trigger_del then calls
_onDeleting, traverses content, destroys/unlinks widgets and external widgets,
and cleans node plus descendant subscriptions. _cleanupNodeSubscriptions also
removes the nodeId index entry if it still points to the deleted node.

Consequences: disposal must be owner-based and recursive; deleting a DOM element
alone does not implement source deletion. Keeping a source node while replacing
its DOM is a different operation from disposing the node. Parent/child callback
ordering and pending async completion require explicit tests in the new runtime.

## 6. Closing a page is not deleting a source node

pagehide calls onWindowUnload, which invokes notifyPageClosing.
notifyPageClosing traverses child frames, conditionally sends /_beacon with
method=onClosedPage (not during _reloading and not when URL contains page_id),
publishes onClosePage and saves client context. The new root-only WebSocket
requirement changes delivery topology, not the need for per-page cleanup.
A close notification is not proof of delivery or a substitute for server expiry.

## 7. Mobile evidence and remaining investigation

`genro_mobile.js` installs touchDevice/bodySize classes and patches Dojo splitters
and moveables to use touchstart/move/end. Moveable accepts an explicit handle;
Hammer exposes tap/doubletap/press/swipe, but its initialize call is commented out
in this checkout. The mere presence of Hammer does not prove all gestures use it.
CSS 11_gnr_dragdrop_misc contains touch menu adjustments. This pass has NOT yet
traced every component-specific conditional handle or native file-drop route.
Do not call mobile parity complete. Preserve gestures and affordances through
capability-driven helpers; do not carry global gesture suppression or prototype
patches into the new runtime.

## Corrections to the implementation sequence

Before further service facades, write lifecycle conformance fixtures for:
1. initial non-lazy construction and after-build scheduling, distinguished from
   delayed _onBuilt execution and later lazy subtree construction;
2. onCreated/action/controller/callback source-node this and relative paths;
3. widget method connections versus DOM connections;
4. source deletion, descendant cleanup, nodeId reuse and async cancellation;
5. root/child page close and transport ownership;
6. touch handles, scroll-versus-drag and interrupted gestures on real devices.

Then implement the smallest owner/lifecycle kernel and builder-generated
bootstrap. Do not advance data provider compatibility by adding isolated syntax
patches to the existing demo bootstrap.

## Phase 1 completion — bounded findings

Status: accepted for implementation trial; public signatures and detailed timing remain proposals. The machine-readable companion is
[runtime-contract.json](runtime-contract.json), with file hashes and symbols for
13 scenarios. These are source inspections, not a browser or real-device verdict.

The mobile row handle is confirmed in genro_grid.js (around 2039): mobile
draggable rows gain a drag_handle column. fillDragInfo turns that cell into a
row drag. genro.dragDropConnect delegates browser drag/drop to genro.dom;
onDrop_standard dispatches typed and aggregate handlers with source-node scope.
The inspected onDrag handlers do not uniformly receive that scope. Do not apply
a blanket callback rebinding. Native file-drop filtering is a separate route.

Legacy touch splitter/moveable patches have touchend cleanup but no touchcancel
path in the inspected implementation. New splitters already clean up on cancel,
blur and disconnect, but their 6px target is not enlarged for coarse pointers.
Palette gestures do not record pointer identity; a second pointer can affect the
active gesture. Lost capture and virtual-keyboard viewport behavior require tests.
These are concrete reasons for improving the implementation while retaining the
affordances. No component code was changed during this phase.

FIRE must not be specified as merely a flagged write: legacy fireItem follows it
with a silent null reset. getRelativeData's second argument also differs between
legacy and new code (autocreate versus default value). Existing convenience names
therefore do not establish complete signature or macro compatibility.

## Quality-review clarification: readiness

The legacy page-start timer does not wait for every _onBuilt callback. Numeric
_onBuilt schedules another timeout in genro_src.stripData; _lazyBuild waits for
visibility or _buildNow in gnrdomsource._doBuildNode. Therefore the earlier
sequence must not be read as a universal completion barrier. An initially hidden
lazy subtree may build after onStart or never build at all.

Macro 2 must settle the exact participation of immediate hooks in readiness.
Preserve authored delays and independent lazy-subtree lifecycles; do not block
global startup on them. Verify a delay beyond startup and a never-visible lazy
child, then reveal the child without repeating page startup.
