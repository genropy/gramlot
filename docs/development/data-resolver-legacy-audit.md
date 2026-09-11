# Legacy JavaScript Data resolvers

Inspected 2026-09-11 in `/Users/gporcari/Sviluppo/Genropy/genropy`, checkout HEAD
`418b4454a6`. Source inspection, not a runtime test or implementation approval.

## Findings

The owner distinguishes a JavaScript resolver that can access an external service
from a resolver that calls a Genro server method. The legacy supports JavaScript
callback resolvers independently of the Genro RPC resolver.

- `gnrjs/gnr_d11/js/gnrbag.js:2552`: `GnrBagCbResolver` extends `GnrBagResolver`.
  It accepts `method` and `parameters`; `load(kwargs)` merges parameters with
  resolution kwargs and calls the JavaScript callback.
- `gnrbag.js:2200`: `setCallBackItem(path, callback, parameters, kwargs)` creates
  that resolver and installs it on a Bag node.
- `resources/common/th/th_view.py:1491–1501`: a real dataController installs
  `new gnr.GnrBagCbResolver({method:cb})` at `.usersets.menu`. The callback
  computes a menu locally. This is evidence of a JS resolver, not an example
  of an external HTTP call.
- `gnrbag.js:196–246,2345–2415`: normal node reads resolve on demand and cache
  results; the resolution path explicitly handles `dojo.Deferred`. A callback
  may therefore supply asynchronous work, including a browser-side service call.
  No dedicated external-service example was found in the inspected usages.
  Native Promise handling should not be inferred from the Deferred checks.
- `gnrjs/gnr_d11/js/genro_rpc.js:28,694`: `GnrRemoteResolver` and
  `genro.rpc.remoteResolver` implement the separate RPC specialization.
- `gnrpy/gnr/web/gnrwebstruct/dojo11.py:424`: `dataRemote` installs the RPC
  resolver through the source-provider machinery in `gnrdomsource.js:487–507`.

No declarative `dataResolver` tag was found in the current Python/JavaScript
sources. A content-history search over gnrjs and the webstruct paths also found
no match, but Git reported skipped exhaustive rename detection; this is not
proof that the name never existed elsewhere or in an uninspected version.

## Semantics relevant to future Gramlot design

A resolver is a value-loading mechanism attached to a Data node. Reactive versus
passive binding (`^` versus `=`) is a separate question: even a passive read can
encounter a resolver. `cacheTime < 0` means resolve once until reset, `0` is the
uncached intent, and positive values are seconds of validity. Expiration is
checked on access, not by a periodic fetch. `isGetter` bypasses ordinary node-value
storage/caching. Reset invalidates the resolver timestamp; reload forces reading
again. Generic cache validity is time-based, not a demonstrated cache keyed by
arbitrary changed parameters.

The owner's exchange-rate example calls for a parameterized resolver (source
currency, target currency, date) consumed by an amount-times-rate formula.
Parameter invalidation, async formula execution and external-service integration
remain contracts to settle in Gramlot. No new runtime code is implemented here.

## Current Bag JS follow-up — 2026-09-11

The Bag JS 0.4.0 dependency installed under `js/dom/node_modules/genro-bag-js`
exports `BagResolver`, `BagCbResolver`, `UrlResolver`, `UuidResolver`,
`StorageResolver` and the non-executable transport placeholder `OpaqueResolver`.
`UrlResolver` declares URL, query-string (`qs`), method, body, timeout, transport,
retry and Bag conversion options. It delegates HTTP to `fetchTytx`.

A local smoke check found a concrete blocker: constructing UrlResolver with a URL
and `qs`, then resolving with retry disabled, throws `TypeError: Cannot read
properties of undefined (reading 'toUpperCase')` before network access. Its
`internalParams` filters URL/method/etc out of `_kw` in the base constructor, but
`load()` reads those options from `_kw`. In addition, its default `readOnly: true`
bypasses the base resolver's cached-value shortcut; cache expectations require
explicit checking rather than relying on the declared `cacheTime: 300` alone.
No dependency files were modified.

A BagCbResolver smoke check with cacheTime 60 returned EUR twice with one callback
execution, then GBP with a second execution after changing the currency parameter.
This verifies parameter-sensitive cache invalidation in the current callback
resolver, distinct from the time-only legacy mechanism described above.

## Owner discussion checkpoint — resume after 2026-09-11

The preferred proposed grammar is a concrete `pane.urlResolver(destination, ...)`,
rather than `dataResolver(type='url', ...)`. Destination follows existing Data-path
rules. Proposed query parameters can contain bindings, e.g.
`qs={'from': '^.fromcurrency', 'to': '^.tocurrency'}`. Recursive binding evaluation
inside parameter objects is a target to implement, not verified current behavior.

The owner prefers storing the complete JSON response converted to Bag, then reading
its paths, or optionally transforming it using `_onResult`. A special `response`
extraction-path parameter was discarded in that discussion. The owner also requested
`_onError` and `_timeOut`; timeout units in seconds were suggested by the assistant,
not explicitly settled by the owner. Error fallback semantics, async formula reads,
cache ownership, concurrent requests and stale-response handling remain open.
No urlResolver grammar/runtime implementation or dependency repair has begun.

The owner's fundamental design principle: once an author understands that data
and structure are hierarchical Bags and compose transparently, subsequent features
should reuse that knowledge. Evaluate usability by transfer of learning and the
number of new mental models required, especially at external-library boundaries;
feature parity or line counts alone are not the intended comparison with React/Vue.
This is a design principle, not a newly approved formal definition of LOT.

The teaching preview is at http://127.0.0.1:64323/lessons/10-local-logic/.
It now has Python CodeMirror read-only and JavaScript CodeMirror editable, with
Run/Reset; example left and code right, Python above JavaScript. Null decoration
is opt-in through a saved preference, and numberTextBox values align right.
All implementation agents finished; no background task or scheduled wakeup is active
for this continuation. No commit/publication was requested.
