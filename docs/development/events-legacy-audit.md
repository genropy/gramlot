# Legacy connect and topic contracts

Recovered on 2026-09-10 at the owner's request. This is source evidence and a
design checkpoint, not authorization to implement compatibility immediately.

## Previously recorded direction

`docs/context/decisions.md` already distinguishes DOM event connections, method
advice and publish/subscribe, requiring supported semantics and owned cleanup.
The preserved `docs/history/genro-pages/docs/architecture/runtime-legacy-contract.md`
also distinguishes page-wide publication from node-prefixed publication and
subscriber ownership from publisher identity. Its historical implementation-gap
list is not a current status report.

## Verified legacy rules

Source root: `/Users/gporcari/Sviluppo/Genropy/genropy/gnrjs/gnr_d11/js/`.

- `gnrdomsource.js:824`: node `connect(target, eventname, handler)` binds the
  handler to the source node. An absent event name or `action` selects the
  widget's default event. If a widget exposes the named member, connection is
  made to that member; otherwise it targets its DOM node. Plain DOM targets
  connect directly. This includes method hooks, not just browser events.
- `gnrdomsource.js:1062–1099`: `connect_*` connects to the built object;
  `subscribe_*` registers the literal page topic with source-node scope;
  `selfsubscribe_*` uses the node subscription method; `formsubscribe_*`
  expands to `form_<formId>_<topic>` when the node has a form.
- `genro.js:1819`: string-form `genro.publish(topic, ...args)` publishes the
  literal topic with positional arguments. Object-form publication additionally
  supports routing; audit those branches separately before claiming parity.
- `gnrdomsource.js:1300`: node publication prefixes the message with
  `<nodeId or generated stringId>_` and sends one payload argument. Optional
  recursive publication visits built descendants and uses each node's prefix;
  it is not ordinary DOM bubbling.
- `gnrdomsource.js:1315`: node `subscribe(command, handler, subscriberNode)`
  uses that node's topic prefix and callback scope, evaluates its current
  attributes, and exposes positional arguments as `p_0`, `p_1`, etc.
  `subscriberNode` owns the registration and defaults to that same node.
  Publisher identity, execution scope and subscription owner must therefore
  remain distinct concepts.
- `gnrdomsource.js:1156–1184`: registrations are tracked by owner string ID;
  dynamic-attribute reset unsubscribes tracked handles. This does not prove
  that every legacy connection family had complete cleanup.

## Current Gramlot coverage and design implications

`js/dom/src/services/topics.js` provides page-local synchronous publication,
programmatic subscription handles, optional abort signals and service disposal.
It also finds live `subscribe_<topic>` recipes and executes them with `payload`
and `_kwargs`. `application.js:94–95` delegates its public entry points to it.
This single-payload API is not yet the full legacy positional-argument contract.
The inspected runtime has no `connect_*`, `selfsubscribe_*` or `formsubscribe_*`
implementation. These must not be advertised as supported by the generic bus.

Future component/container design should retain explicit widget event contracts,
the distinction between direct connections and topics, node/form topic scope,
source callback context, and owner-controlled teardown. Native DOM events and
explicit method adapters can replace Dojo mechanisms, but their supported
ordering, arguments and lifecycle need conformance cases. Exact new APIs and
the boundary of a later legacy wrapper remain open.

## Provisional core/adapter boundary — owner checkpoint, 2026-09-10

The owner explicitly retained the following proposal as provisional, to be
confirmed later. It is not a finalized architectural decision or implementation
authorization.

- Proposed core capabilities: declared component events; page/node/form topics;
  separate topic identity, callback scope and subscription ownership; automatic
  owner teardown; source-node context for recipe callbacks; explicit argument
  and execution-order contracts.
- Proposed legacy adapter responsibilities: historical `connect_*`,
  `subscribe_*`, `selfsubscribe_*` and `formsubscribe_*` conventions; Dojo event
  names; textual topic prefixes; old callback argument conventions and macros;
  interception of arbitrary legacy methods.
- Recursive descendant publication and historical cross-window routing would
  initially belong to the adapter, subject to independent Gramlot requirements.
- Declaring public properties, events and methods in the component manifest is
  a proposed way to share the contract across Python authoring and JS runtime.

In particular, declared public events in core versus method interception in the
adapter remains a working hypothesis. Exact authoring syntax is still open.
