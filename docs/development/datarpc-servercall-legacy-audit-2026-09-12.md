# Legacy dataRpc and serverCall: compatibility baseline

2026-09-12 · source audit, not an implementation or approved replacement API.

The owner requested this investigation before component-manifest design proceeds.
Components requiring server capabilities are not usable in standalone pages.
This document examines dataRpc and serverCall first; remote Source replacement
requires a subsequent, distinct audit.

## Evidence and limits

Inspected checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`, HEAD
`418b4454a6e08445817e858a1b5d2a2c91c2dbf5`.
Git reports no local modifications to the six principal files checked:
webstruct/dojo11.py, gnrwebpage.py, gnrwebpage_proxy/rpc.py, genro.js,
genro_rpc.js and gnrdomsource.js. Findings are static source observations;
no legacy server/browser was started and no integration tests were run.

Paths below are relative to that checkout. Line numbers identify this snapshot.

| Source | Relevant entry point |
| --- | --- |
| `gnrpy/gnr/web/gnrwebstruct/dojo11.py:112` | dataRpc and chained callbacks |
| `gnrpy/gnr/core/gnrclasses.py:365` | Method serialization registration |
| `gnrpy/gnr/core/gnrlang.py:487` | serializedFuncName |
| `gnrpy/gnr/core/gnrbagxml.py:454` | Callable attributes in XML export |
| `gnrjs/gnr_d11/js/genro_src.js:652` | Provider installation/startup |
| `gnrjs/gnr_d11/js/gnrdomsource.js:214` | Scheduling and provider execution |
| `gnrjs/gnr_d11/js/gnrdomsource.js:384` | dataRpc execution branch |
| `gnrjs/gnr_d11/js/genro.js:2200` | Public genro.serverCall wrapper |
| `gnrjs/gnr_d11/js/genro_rpc.js:450` | Shared remoteCall |
| `gnrjs/gnr_d11/js/genro_rpc.js:270` | HTTP/context preparation |
| `gnrjs/gnr_d11/js/genro_rpc.js:596` | Result envelope processing |
| `gnrpy/gnr/web/gnrwebpage.py:1237` | Public method resolution |
| `gnrpy/gnr/web/gnrwebpage_proxy/rpc.py:25` | Dispatch and result encoding |

## 1. The public authoring contract

Python signature: `dataRpc(self, pathOrMethod, method=None, **kwargs)`.

Supported shapes established from implementation:

```python
pane.dataRpc('.result', self.calculate, amount='=.amount', _fired='^.run')
pane.dataRpc('.result', 'calculate', amount='=.amount', _fired='^.run')
pane.dataRpc(self.calculate, amount='=.amount', _fired='^.run')
pane.dataRpc(None, self.calculate, amount='=.amount', _fired='^.run')
```

These are illustrative legacy-shaped declarations, not runnable complete examples
or Gramlot APIs. The callable-only overload recognizes a callable first argument
when no truthy separate method is supplied. A string first argument alone is not
that overload: it is interpreted as the destination path.

The generated Source has tag dataRpc, path and method plus keyword attributes.
The old docstring claims a mandatory dummy destination; implementation supersedes
that claim. Browser execution additionally treats the literal path `dummy` as no
destination. Relative destinations resolve through the declaring node's datapath.

`datarpc_addcallback` and `datarpc_adderrback` append callBack children and return
the RPC declaration for chaining. Errbacks carry `_isErrBack=True`.

## 2. Passing a Python method means serializing a reference

The previous audit left this seam unresolved. The inspected code now establishes:

1. The Python declaration stores the callable in its method attribute.
2. XML attribute serialization uses the class catalog. Its method serializer is
   `serializedFuncName`, registered in gnrclasses.py.
3. The serializer strips the `rpc_` prefix; applies proxy_name, class public name
   or a SqlTable-qualified proxy; and prefixes resource mixin package/path where
   present (`package|path;method`). No Python code is sent to the browser.
4. Server getPublicMethod resolves resource/proxy qualification and the method.

With omitUnknownTypes enabled, callable attributes are retained when marked is_rpc,
__safe__, or named with an rpc_ prefix. This is serialization eligibility, not an
independent authorization grant. This inspection establishes the bound-method
path, not unrestricted portability of arbitrary lambdas or callable objects.

Implication: a component can contribute a server method reference without exposing
its physical URL in every recipe. The new manifest must separate logical service
identity, implementation/exposure and deployment resolution. Resource mixin naming
is legacy evidence, not automatic approval to reproduce dynamic mixins in Gramlot.

## 3. dataRpc is a provider with a lifecycle

The provider resolves method, destination and named parameters in Source context.
Reactive `^` parameters participate in dynamic updates; passive `=` parameters
are read when executed. `_fired` is a common trigger attribute. Dynamic parameters
also recognize inline `==` expressions. Relative paths require Source context.

Startup is explicit: `_init` executes during installation; `_onStart` connects to
page startup; `_onBuilt` executes after build. `_timing` uses seconds. `_delay`
uses milliseconds and cancels/replaces the pending timer. A numeric `_onStart`
sets delay if none is declared. These spellings differ from current Gramlot's
`_on_start`; compatibility needs an explicit choice, not silent renaming.

`_if` gates execution; `_else` executes locally when the condition fails and may
write a destination. `_userChanges`, subscriptions and run-time supplied kwargs
also affect provider execution. This is not just a fetch with a target path.

Observed RPC order:

1. Resolve parameters and choose method/HTTP verb.
2. Extract callbacks and UI execution options; take a shallow origKwargs copy.
3. Run `_onCalling` in Source-node context with kwargs and named arguments.
   It may modify outgoing kwargs; returning exactly false cancels the call.
4. Strip remaining underscore-prefixed client options; pass internal _sourceNode
   to the transport pipeline for contextual resolution.
5. Execute remoteCall and retain its Deferred in the declaration's registry.
6. On successful application result, read old destination value and write result
   before `_onResult(result, kwargs, old)`.
7. On application error, invoke `_onError(error, kwargs)` instead of updating Data.
8. Run attached Deferred callbacks/errbacks. Callback locals are evaluated in
   Source context; a defined callback return changes the chain result.

The `_onResult` return value is ignored by the immediate dataRpc callback. Do not
conflate that hook with chained callbacks, or with Gramlot urlResolver's current
result-transforming `_onResult`. origKwargs is shallow and precedes _onCalling;
it is not proof of a deeply immutable parameter snapshot.

UI options include _lockScreen and _execClass. Full success/error/cancel cleanup
needs browser characterization; this audit does not certify all legacy paths.

## 4. serverCall is the imperative entry to the same engine

Signature: `genro.serverCall(method, params, async_cb, mode, httpMethod)`.
It normalizes async_cb through funcCreate, defaults HTTP to POST, then delegates:
`genro.rpc.remoteCall(method, params, mode, httpMethod, null, cb)`.

It does not install a Data destination, reactive subscription or Source provider.
Internal dynamic parameter evaluation can still resolve pointer strings; this
must not be confused with establishing reactive subscriptions.

Shared remoteCall behavior:

- Default result mode is bag. bag/xml select XML handling and result preprocessing;
  other modes use the corresponding response handler.
- With a callback, the normal HTTP result is a Dojo Deferred. The callback receives
  the decoded result and detected application error; `sync` can explicitly force
  synchronous behavior even with a callback.
- Without a callback, HTTP is forced synchronous and returns the decoded result.
  This is a significant legacy behavior, not a Promise API.
- Timeout defaults to 50000 milliseconds. This differs from the current Gramlot
  resolver's timeout unit (seconds).
- Explicit httpMethod takes priority for dataRpc; otherwise `_POST=False` means
  GET and the default is POST. WSK follows a separate WebSocket branch returning
  its deferred and attaching callbacks; do not generalize HTTP sync semantics to it.

Recommendation for discussion: retain recognizable authoring and callback context,
but design asynchronous completion deliberately. Dropping synchronous return,
changing callback/error semantics or omitting WSK are compatibility differences
requiring explicit review, not implementation details already approved here.

## 5. The engine carries application context and an envelope

HTTP preparation resolves dynamic parameters, serializes values with asTypedTxt,
adds page_id and uses the page RPC endpoint. It also incorporates legacy serverstore,
database/tenant and other host context. Attached Bags may add parameter attribute
metadata. This is not an arbitrary REST request with a universal JSON body.

Server dispatch calls getPublicMethod('rpc', method). It resolves public-marked
methods or rpc_-prefixed fallback methods, including proxy/resource names. Signed
URL, verifier and tag authorization checks are present. RPC dispatch also gates
forbidden/expired auth states. A manifest entry cannot replace those server checks.

The bag response envelope includes result, result attributes/type, application
error and potentially dataChanges and required resources. Source has special
metadata. Client preprocessing applies dataChanges and loads requirements before
returning the result; consequently a service can affect more than its explicit
Data destination. This coupling must be consciously retained, separated or deferred.

Application errors in decoded envelopes and HTTP/network failures follow different
paths. The transport errorHandler reports through framework error handling; the
code does not establish that every network failure reaches dataRpc._onError.
Do not promise unified errors from this static inspection.

## 6. Compatibility decisions to review

| Preserve as the starting contract | Requires an explicit decision |
| --- | --- |
| dataRpc destination/method and callable-only shape | Callable exposure mechanism in the new optional host adapter |
| genro.serverCall as shared lower-level service entry | Promise/handle contract and treatment of synchronous calls |
| Source-relative Data paths and ^/= trigger distinction | Supported startup/scheduling spellings and subset |
| _onCalling cancellation; Data write before _onResult | Snapshot timing, callback transformations and error unification |
| Named logical service references | Legacy proxy/resource qualification versus new collection identity |
| Optional destination and typed result | TYTX carrier/envelope and result metadata contract |
| Shared call engine for widgets and declarations | Client cancellation, late results and side-effecting call policies |
| Server-owned exposure and authorization | Optional Python service packaging and request context |

No latest-response-wins behavior was found in the inspected dataRpc branch: it
tracks multiple Deferreds but does not gate writes with a latest request token.
Do not copy the current Gramlot resolver's cancellation/latest-result policy onto
all RPC calls; mutations need explicit treatment and abort cannot promise rollback.
Full source-node destruction/cancellation and the WSK protocol were not audited.

## 7. Consequences for the component manifesto

A useful component contract describes required server services: logical identity,
parameter/result types, invocation semantics, contextual requirements and optional
server implementation contribution. A shared Gramlot service engine resolves and
executes them; every widget must not implement its own HTTP stack.

Dependencies are transitive through inheritance and composition. A host must
provide the selected services, not merely an HTTP server or FastAPI installation.
Known requirements can be checked at construction/export; activation must also
check dynamic dependencies. Standalone pages cannot use server-dependent components.

The next compatibility investigation is container remote: it reuses communication
but returns/manages Source, which adds ownership, required collections, scope and
replacement rules. Complete that investigation before freezing the manifesto.

## 8. Proposed executable characterization, not run

Use a tiny exposed method and a real browser to check callable/reference equivalence,
relative destination and no-destination shapes, ^ versus =, explicit startup,
_onCalling mutation/cancellation, old value and callback order, chained transformation,
application versus HTTP errors, typed Bag/null/Decimal responses, two reversed calls,
owner removal, and synchronous versus callback serverCall behavior. Isolate WSK as
a separate transport test. Record discrepancies with source reading rather than
promoting static findings into verified end-to-end behavior.

## Follow-up: parameters, result values and TYTX

Owner direction: formalize parameters and responses first. Responses can be text,
JSON or Bag. Text and Bag are assigned to the destination. Investigate the standard
JSON-to-Bag conversion before selecting it. TYTX is the intended standard for
cooperating callees; the Python side, including FastAPI, serializes through TYTX.

Separate the return value from its wire encoding: a Python str, dict/list or Bag
can be transported through TYTX. A text result containing JSON characters must
remain text, unless its declared result contract says JSON. Do not infer types
from string prefixes or double-encode already serialized values.

Recommended parameters contract for review: named arguments resolved from bindings
at invocation, encoded as a typed mapping through TYTX; provider options and host
context kept separate from method arguments. The server decodes and validates
against the exposed method contract. Typed responses are decoded before destination
assignment. Error/envelope representation remains to be selected separately.

Installed implementation inspection found public `Bag.from_json` (Python) and
`Bag.fromJson` (JS). They are not yet a safe universal JSON import contract:

- Python labels a nested array from its parent key (`items_0`); JS uses `r_0`.
- Both convert empty objects and empty arrays into empty Bags without a visible
  array-kind marker in this conversion path.
- Both recognize an array whose first object has `label` as a serialized Bag-node
  representation, which can misinterpret ordinary business JSON.
- Object keys are passed to set_item/setItem as strings; literal dotted keys need
  an explicit preservation test rather than an assumption.

Gramlot's current `jsonBag` helper instead uses literal path segments, r_N labels
and an in-memory `_jsonArray` property. That property is not an established TYTX
roundtrip contract. Do not promote this helper into an RPC standard without fixing
and verifying the generic representation boundary.

Next bounded verification: Python/JS conversion parity for nested arrays, empty
containers, literal dotted keys, records with label/value fields, null/scalars,
then JSON → Bag → TYTX → browser Bag → JSON preservation. These are source findings,
not a completed executable cross-language probe. No generic Bag change is made.
