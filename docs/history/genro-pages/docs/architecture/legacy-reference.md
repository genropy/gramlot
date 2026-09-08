# Legacy recipe, client stores and reactivity

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

Static source examination, 2026-09-05. Repository: /Users/gporcari/Sviluppo/Genropy/genropy. No source changes or runtime tests performed. Findings describe the supplied checkout, including its current indexed trigger dispatch; they do not assert that every historical release used that optimization.

## Python authors a structured recipe

`gnrpy/gnr/web/gnrwebpage.py:2356`, rpc_main, creates a GnrDomSrc root through domSrcFactory.makeRoot. Page methods populate this tree. `gnrpy/gnr/web/gnrwebstruct/base.py:109` defines GnrDomSrc over GnrStructData; makeRoot associates the page and child delegates structured node creation. Tags and attributes describe both visual elements and nonvisual data/logic declarations. The initial page is therefore not merely an HTML string.

`gnrpy/gnr/web/gnrwebpage_proxy/rpc.py:47`, result_bag, wraps the result and marks the DOM source with __cls=domsource. It includes collected client dataChanges and serializes the envelope as typed XML. Client genro_rpc.js reconstructs a Bag using genro.clsdict; genro.js maps domsource to GnrDomSource. genro_src.js:130 calls main, and genro.js:663 starts source construction from its response.

## The two client stores

1. Data store: genro._data, a GnrBag under the main node of genro._dataroot (genro.js:580). It contains application values, nested records/collections, attributes, selections and other client state.
2. Source store: genro.src._main, a GnrDomSource (genro_src.js:107), containing the live structural recipe. Source nodes describe tags, binding expressions, inherited datapaths and logic; at runtime they link to the resulting widget or DOM node.

The source is not discarded after initial rendering. It is the live model through which structure can be inserted, removed or rebuilt. The two stores have different responsibilities and are not duplicate copies of the same data. The recipe initially carries data declarations: stripData/moveData initializes their values in the datastore and activates nonvisual providers. These declarations do not become visible DOM elements.

## Shared Bag event mechanism, different consumers

GnrBag.onNodeTrigger (gnrbag.js:2003) invokes local subscribers and propagates through parent backreferences, extending pathlist. insert/update/delete events carry context including the affected node and, as applicable, position, old value, attribute/value flags and reason. Not every operation has all fields. Subscriptions can observe a whole hierarchy.

Source root subscribes sourceTriggers to GnrSrcHandler.nodeTrigger. Datastore root subscribes dataTriggers to genro.dataTrigger. Thus the same observable tree mechanism drives two distinct circuits.

## Source changes build or tear down UI

GnrSrcHandler.startUp (genro_src.js:478) inserts the received recipe into the subscribed source root. Initial construction uses the same source-event machinery as later structural changes.

nodeTrigger queues events and dispatches _trigger_ins/_trigger_upd/_trigger_del. Insertion chooses the parent destination and builds the new node; update may rebuild its subtree; deletion tears down widgets/DOM and subscriptions. There are build/freeze guards and cleanup for removed content.

GnrDomSourceNode.build (gnrdomsource.js:960) processes data declarations, resolves dynamic attributes, builds the element and registers subscriptions. genro.wdg.create (genro_wdg.js:303) selects the handler and creates native HTML or a Dojo widget, linking it to the source node. The source-to-widget boundary is the relevant integration point for new web components; its lifecycle obligations include teardown and subscription cleanup, not only initial element creation.

## Datastore changes drive bindings and logic

registerNodeDynAttr (gnrdomsource.js:902) recognizes pointer expressions. ^path registers a dynamic dependency; =path reads a value without itself registering that reactive dependency. == expressions have separate formula handling. Relative .paths resolve through the source-node datapath chain; paths can also address node attributes with ?attr.

Datastore event -> genro.dataTrigger -> publishDataTrigger -> indexed subscriptions -> sourceNode.trigger_data. In this checkout GnrTriggerIndex uses a path trie for stable paths and a floating set for dynamically resolved paths. It selects ancestor/exact/descendant candidates, then getTriggerReason makes the precise match. The legacy _trigger_data topic remains published for direct subscribers.

A triggered visual source node updates the bound property through updateAttrBuiltObj/doUpdateAttrBuiltObj. Some attributes or widget types require rebuilding; this is not a blanket full-page render. A data provider instead runs setDataNodeValue: dataFormula computes a value, dataController executes client logic, dataRpc invokes a server method when its trigger conditions require it. Their results can write data and cause downstream reactions. Python authors the recipe, but the embedded client logic executes in JavaScript.

## Input writeback and event origin

genro_widgets.js:87, setValueInData, resolves the value binding and writes to genro._data with doTrigger:sourceNode. gnrdomsource.js:156, trigger_data, checks kw.reason != this before updating the originating visual node. Other subscribers still receive the change. This is a concrete anti-echo mechanism. Lost source nodes are also prevented from writing back after teardown.

For an illustrative invoice, quantity and price inputs write the datastore. A dataFormula subscribed to those paths computes total and stores it. A total display observes the total path and updates. A controller can separately add/remove a source branch, invoking the structural circuit. None of those local steps inherently needs an RPC.

## RPC and push join the data circuit

Server result_bag carries dataChanges in its envelope. genro_rpc.js:526, setDatachangesInData, applies values, attributes, deletions or fired notifications to the datastore. The ordinary reactive mechanism then updates consumers. It also handles mapped serverChange paths; synchronization is explicit, not proof that every client datum is continuously mirrored on the server.

Remote content can return source and cause structural rebuild through the source circuit. Transport and reactive store are separate responsibilities: receiving a network result does not require a separate general DOM refresh mechanism.

## Relation to the requested new architecture

The user's stated target preserves two live client Bags and client DOM construction, replacing Dojo widgets with project-owned web components. This is closer to the legacy source/data architecture than to the old ws-web HTML/DOM-patch prototype. ws-web remains relevant as experience with Python page authoring, widgets and a source/data inspector.

User sticky in genro-asgi serves stable server-side object ownership: calls for a user reach the worker holding that user's connections, pages and application objects. The ordinary request path can reuse resident objects rather than reconstruct them from an external state store on each call. This is a requirement clarified by the user, consistent with the commander/worker registries inspected in genro-asgi. It is separate from client-local reactivity and is not by itself a promise of object survival across worker restart or migration.

Consequently the conceptual pieces are: Python recipe authoring; client source Bag and data Bag; client trigger/binding runtime; web-component adapters and lifecycle; RPC/WS access to resident server objects; explicit data/source updates crossing the network when needed. Detailed protocols, implementation phases and migration choices remain for phase 2.


## Migration requirement: authoring API compatibility

User clarification: compatibility of element names (for example borderContainer) and parameter names is intended to ease migration to the new Genropy. Treat this as an explicit migration requirement when assessing builders and project-owned web components. Preserve familiar Python recipe calls and their parameter meanings wherever possible, even though the implementation underneath changes from Dojo to web components. The public recipe name and the internal custom-element tag need not be identical. Any necessary incompatibilities should be identified explicitly during phase 2; they must not be introduced merely to rename or modernize the API. This requirement does not by itself assert full compatibility with every legacy feature.


## Transport and resolver clarification

The user specifies an initial main RPC to obtain the SPA recipe, with subsequent calls preferably using WebSockets to reach the live page and prepared server context. Server push should replace the legacy ping's role of retrieving pending changes. Preserve dataRpc as an authoring concept independently of its underlying transport.

Resolvers exist in Python and JavaScript and lazily supply node values. Python BagResolver.__call__ invokes load or returns its cache. Client GnrBagNode.getValue invokes its resolver when needed, applies the result with reason=resolver and thereby joins the ordinary Bag trigger circuit. Static access bypasses resolution; getter resolvers return without storing in the node.

The user identifies remote resolvers as the architectural reason synchronous client/server access is required: a caller may expect an immediate value from an ordinary Bag read. Source verification: genro_rpc.js remoteResolver defaults sync=true. However GnrBagNode.getValue and GnrBagResolver.resolve also explicitly handle dojo.Deferred, and GnrRemoteResolver.load contains a WSK path returning a Deferred. Thus resolvers are not intrinsically synchronous; the compatibility constraint is imposed by consumers expecting immediate values. No repository-wide claim that every other call is asynchronous has been verified. Ordinary remoteCall can also choose synchronous execution when no callback is supplied.

For phase 2, distinguish blocking synchronous browser I/O from asynchronous request/reply over WebSocket. A resident server context makes the resolver's objects available but does not turn network resolution into a synchronous JavaScript return. The required semantics of unresolved reads and their consumers must be addressed explicitly before deciding whether any HTTP synchronous exception remains. No solution is selected here.


## Remote recipe fragments

User clarification: remote builds new recipe fragments on the server and inserts them into existing pages, for example to change a panel when data arrives. Verified path: GnrDomSrc.remote (gnrwebstruct/base.py:847) declares remoteBuilder, remote_handler and remote_* parameters on the container. Parameters can be reactive bindings; gnrdomsource.js updates remote content when a remote_* attribute changes. GnrWebPage.remoteBuilder (gnrwebpage.py:2694) creates a new source root, optionally with inherited attributes, calls the remote handler and returns the recipe fragment.

Client updateRemoteContent (gnrdomsource.js:1714) evaluates parameters and obtains the fragment. mergeRemoteContent (:2143) removes and inserts source nodes in the existing container; those Bag mutations drive ordinary teardown/build and binding registration. It usually replaces container children, with special tbody handling preserving non-remote children. This is live recipe composition, not merely fetching HTML or updating datastore values.

The new architecture must account for both dataRpc (data/operations) and remote (structure generation) while keeping their familiar authoring APIs. With the desired WebSocket transport, a fragment request can target the resident page context and its response can update the client source Bag. This records the required behavior, not an implemented new protocol.

Additional transport evidence: the legacy updateRemoteContent explicitly assigns kwargs.sync = !async and supports an asynchronous option. Therefore synchronous calls also occur in remote in this checkout; this does not mean remote intrinsically requires synchronous semantics as immediate-value resolver consumers do.


## Python and JavaScript components

Verified in the legacy source, not inferred from filenames alone.

Python BaseComponent (gnrbaseclasses.py:76) participates in page composition through mixins. py_requires resolves component resources/classes and their dependencies; js_requires/css_requires collect browser assets. Runtime mixinPageComponent (gnrwsgisite_proxy/gnrresourceloader.py:571) also adds newly needed assets to the response envelope. Components can supply Python helpers, server methods and recipe-building methods, not just visual markup.

@struct_method (gnrwebstruct/base.py:40) registers a public builder name against a page implementation method. A prefixed method such as fgr_frameGrid becomes pane.frameGrid; GnrDomSrc.__getattr__ resolves the method on the composed page and passes the current structure as its first argument. FrameGrid (resources/common/gnrcomponents/framegrid.py:408) is a concrete example: it declares a dependency on FrameGridTools and composes framePane, stackContainer, borderContainer and includedView source nodes. It can therefore use client-side composite tags inside a server-authored composition.

JavaScript components deriving from gnr.widgets.gnrwdg (genro_components.js:2) are registered as tag handlers by genro.wdg. During _beforeCreation they expand a recipe node by calling createContent(sourceNode, kwargs, children, subTagItems). They construct more source through sourceNode._(...), rather than requiring Python to enumerate their implementation. Construction is frozen while the component expands; caller children are combined into the returned content location, declared subtags may be extracted separately, and the node is marked _isComponentNode before unfreezing and building. A component need not correspond to one Dojo widget or one DOM element.

Each source node receives a gnrwdg context with sourceNode and methods extracted from the shared handler's gnrwdg_* members. Reactive inputs implemented by gnrwdg_setX or prefix catchers are retained on the component node; trigger dispatch in gnrdomsource.js routes their changes to those handlers. Other bindings can be passed into the generated source and participate in the normal datastore/source mechanisms. These are not two new stores per component: they use the existing Bags and source-relative data contexts.

CharCounterTextarea (genro_components.js:2087) is a small concrete example. Its client createContent builds a textarea plus remaining-character and color displays, with workspace bindings. Input writes the external value path. gnrwdg_setValue responds to value changes, updates workspace count/color, and updates the textarea. SearchBox is another example building source and dataController logic with a relative datapath.

Components can span both languages: TimesheetViewer declares JS/CSS dependencies, adds a Python struct method that builds the recipe and a dataController that instantiates/updates gnr.TimesheetViewerController. Thus Python-component and JS-component are complementary capabilities, not mutually exclusive packaging categories.

Migration implication: preserve composition on both sides and familiar recipe APIs, including parameters, child insertion and reactive behavior. Project-owned web components can implement widgets below this layer, but a Genropy recipe component does not automatically need a one-to-one custom-element counterpart. Python composition, client source expansion and DOM/widget implementation are distinguishable responsibilities. Exact new component contracts remain a phase-2 decision.
