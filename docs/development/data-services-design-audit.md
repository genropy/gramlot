# Data declarations and server services

2026-09-10. Investigation requested by the owner. This extends the
[legacy inventory](../context/legacy-data-remote-services.md); proposals below
are not approved APIs or an implementation mandate.

## Current implementation, independently inspected

`js/dom/src/builder-base.js:388–485` resolves named logic or strings evaluating
to functions. Formula functions receive bindings and return the destination
value; controller functions receive the node and bindings. This is not the
legacy bare-expression/script contract. Both pointer kinds are resolved and
`^` registers readers. Startup selects all setters and formulas/controllers
explicitly marked `_on_start`, in source order. Setters write their supplied
value and non-internal attributes; do not describe explicit data declarations
as equivalent to the separate missing-only default policy.

`src/gramlot/contrib/fastapi/application.py:106–142` registers initial document
and recipe GET routes. Every recipe request creates a fresh page and builder.
`src/gramlot/page.py` defines host-independent authoring, not a remote method
registry. These active modules do not yet supply dataRpc or remote fragment
dispatch. Archived ASGI/RPC code remains historical evidence, not active support.

## Legacy server boundary

### Provider execution recovered from source

Owner clarification: Python data authoring primarily carries initial data for
JavaScript to install before widget construction. Verified legacy ordering:
`gnrdomsource.js:960` starts every node `build()` with `genro.src.stripData(this)`,
before widget attribute resolution and construction. `genro_src.js:563–574`
processes the node and its immediate Source children; `moveData` installs data
and `_alreadyStripped` guards repeat processing. Child `build()` calls repeat
this preparation at each nested level. This is a pre-build preparation per
branch, not evidence of a single recursive pass over all future/lazy Source.
The Python method (`gnrwebstruct/base.py:793`) explicitly describes transferring
variables from server to client. Do not conflate Python Source authoring with
JavaScript widget construction when saying "before build".

Legacy sources are under the Genropy checkout below. `gnrwebstruct/base.py:793`
and `genro_src.js:623–642` show static data assignment: write when the target
is absent or the supplied value is non-null. Null therefore preserves an
existing node. This differs from both unconditional assignment and a universal
missing-only default.

`genro_src.js:615–710` and `gnrdomsource.js:214–510,648–665,898–918` establish:

- `^` subscribes and reads; `=` reads at execution without subscribing.
- Formula/controller/RPC providers have no general implicit initial execution.
  `_init` runs during installation; `_onStart` subscribes to `gnr.onStart`;
  `_onBuilt` runs after building; `_timing` repeats in seconds. Topic
  subscriptions can also trigger execution.
- Numeric `_onStart` also supplies `_delay` in milliseconds; `_delay` cancels
  the pending timer before scheduling another (debounce).
- Formulas are expressions with an implicit return and destination write.
  Controllers execute scripts, optionally writing a returned value when a
  destination is present. `_if`/`_else` and freshly resolved parameters are
  part of the executor contract.
- dataRpc defaults to POST (`_POST=False` selects GET); `_onCalling` can cancel;
  success writes the optional destination before `_onResult`; `_onError` and
  deferred callback chains handle further processing.

`gnrwebstruct/base.py:847` configures the existing container with
`remote='remoteBuilder'`, its handler and arguments. `lazy=False` also builds
initial children in Python. `gnrdomsource.js:1715–1790` requests and merges
remote Source. The exact new insertion/replacement contract remains to settle.
`dataRemote` instead installs a lazy cached resolver (`genro_rpc.js:28–105`).
Its legacy synchronous behavior must not become an accidental modern contract.

The exact point that serializes a callable Python method reference into its
browser-visible name was not established in this bounded audit. Passing a
callable in legacy authoring and server name resolution are verified separately;
do not claim the complete reference-serialization mechanism has been audited.

In `/Users/gporcari/Sviluppo/Genropy/genropy/gnrpy/gnr/web/gnrwebpage.py:1237`,
`getPublicMethod` resolves an exposed (`is_rpc`) method or a prefixed fallback
(`rpc_` / `remote_`), with proxy/resource resolution and verifier/tag checks.
This was a framework dispatcher, not an arbitrary Python attribute call.

At line 2696, public `remoteBuilder` resolves the remote handler, constructs
a Source root, calls `handler(pane, **kwargs)` and returns that Source.
`dataRpc` obtains application data; container `remote` obtains UI Source.
`dataRemote` is separately a lazy Data resolver, not another spelling of either.

## Proposed host-independent organization

1. Browser declarations own dependencies, triggers, parameters, pending/error
   handling and result application. No declaration needs to know Python class
   lookup or FastAPI routing internals.
2. A service client resolves a declared service/endpoint reference into a call
   with a parameter snapshot, result decoding, error and cancellation contract.
   HTTP verb and path/query/body mapping must be explicit in the integration;
   arbitrary REST endpoints cannot be assumed to accept one universal payload.
3. The host adapter maps those calls to registered services. Existing FastAPI
   routes remain usable; an optional convention could register explicitly
   exposed page methods and generate their service references automatically.
   Exact decorator and recipe syntax remain undecided.
4. Data results and Source fragments have distinct consumers. Remote Source
   replacement also needs ownership, disposal, IDs, required components and
   relative-path rules; successful HTTP alone does not complete this feature.

Keeping a method on the page class is compatible with server independence:
it is an authoring/registration convenience provided by an adapter. It does not
require keeping the same mutable Python page object alive between requests.
Request authentication, services and persistence come from the host; browser
Data is not automatically mirrored into Python instance attributes.

FastAPI's official [router documentation](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
and [dependency documentation](https://fastapi.tiangolo.com/tutorial/dependencies/)
provide the integration mechanisms. The page-method registry above is a Gramlot
proposal, not a built-in FastAPI feature. A generated wrapper must deliberately
preserve parameter validation and dependency handling, rather than assuming
that an ordinary direct Python method call invokes FastAPI's dependency system.

## Questions to settle before implementation

### Recovered inline expression prefix `==`

Owner requested this additional legacy check. `gnrdomsource.js:604–637`
recognizes `==expression` in attribute values, evaluates it with the other
non-formula node attributes as named arguments and the source node as `this`.
Other `==` attributes are excluded in this evaluator to avoid recursive formula
evaluation. This computes an attribute value, not a separate Data destination.
`registerNodeDynAttr` (898–920) records these expressions separately from ^
subscriptions; the attribute-update path (around 1399) checks expressions for
references to the changed attribute and refreshes matching formula attributes.
The inspected dependency check is textual, not a parsed expression graph.
`genro_src.js:715–758` also supports == in dynamic service parameters: ordinary
parameters are resolved first, then expressions evaluated from the resolved map.
Thus == is not a passive Data path (=) or a standalone dataFormula declaration.
Whether to retain this authoring prefix in core remains to confirm; it belongs
in the binding/expression contract before provider implementation.

- Legacy-compatible expression/script syntax and callback context; provider
  initialization, conditions, scheduling, event triggers and cycle handling.
- Endpoint references versus concise generated references for page methods.
- Typed result/error transport and policies for stale responses and disposal.
- Source fragment replacement and lifecycle, independently from Data loading.
