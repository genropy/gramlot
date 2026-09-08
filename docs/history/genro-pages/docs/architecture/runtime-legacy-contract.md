# GUI 2.0 runtime: preserve the author model

Status: working architecture, 2026-09-06. The owner requested a familiar Genro
runtime, modern internals and first-class mobile use. This document separates
observed legacy behavior, agreed direction and work still to implement.

## Destination

One page owns one `genro` runtime. Recipe authors work through `genro` services
and their source node. ES modules are implementation units, not extra globals
that authors must learn. A service name does not require a giant source file.
Do not introduce empty compatibility facades that pretend to implement legacy APIs.

The source node remains the context of actions and recipe callbacks. Preserve
relative data paths, runtime attribute evaluation, node-owned subscriptions and
source-to-widget identity. Keep the data tree and source tree distinct. DOM
replacement must not silently change the logical identity or ownership of a node.

## Evidence in the reference checkout

Root: `/Users/gporcari/Sviluppo/Genropy/genropy`.

| Source and entry point | Observed contract worth preserving |
| --- | --- |
| `gnrpy/gnr/web/gnrwebpage.py`, startup argument preparation around 1340–1378 | Server prepares typed startArgs, page_id and resource configuration; HTML startup belongs to a page instance |
| `gnrjs/gnr_d11/js/genro.js`, genroInit around 217 | Runtime owns rpc, src, wdg, dev, dlg, dom, vld, wsk and other services |
| `genro.js`, start/dostart around 621–668 | Root/parent page context is established before main source startup |
| `genro_src.js`, startUp around 478 | Source is attached under main; construction follows source management |
| `gnrdomsource.js`, getRelativeData/setRelativeData around 544–594 | Reads/writes resolve through the source node; trigger reason and fired semantics matter |
| `gnrdomsource.js`, currentAttributes around 950 | Recipe attributes are evaluated at execution time |
| `gnrdomsource.js`, subscriptions around 1099, 1171, 1300–1329 | Scope, subscriber owner and publisher topic prefix are distinct concepts |
| `gnrlang.js`, macroExpand_* around 1660 and funcCreate around 1826 | GET/SET/PUT/FIRE expand to source-node operations; explicit scope binds this |
| `gnrbag.js`, fireItem around 1709 | FIRE delivers a value then silently resets to null |
| `genro_widgets.js`, _ButtonLogic around 3500 | Action uses source scope and current parameters; action precedes fire/publish; delay and click aggregation have dedicated semantics |
| `genro_mobile.js`, initialize/startHammer/patches around 38–164 | Touch-specific gestures and splitter patches existed; Hammer startup is commented out in the inspected initialize path |

This is evidence of mechanisms, not an assertion that every old handler used
source-node this. Widget internals can use widget scope; callbacks carrying an
explicit scope must retain it. Audit each recipe callback family before porting.

## Contract to retain

- `GET .x`: read relative data; `SET .x = value`: write with notification.
- `PUT .x = value`: silent write; `FIRE .event = value`: notify then silently reset.
- `FIRE .event` defaults to true. FIRE_AFTER and PUBLISH need explicit coverage.
- Action `this` is the source node; parameters are freshly evaluated.
- Absolute, relative and marked paths must have explicit conformance cases.
- `genro.publish` is page-wide; node publish uses a node prefix. They are not
  interchangeable. Subscriber lifetime belongs to its owner, not its publisher.
- Keep the familiar service vocabulary where its meaning matches: src, dom,
  wdg, dev, rpc, dlg, vld. `genro.events` is a new internal service behind the
  familiar publish/subscribe entry points, not a claim of an old service name.

## Changes with concrete reasons

| Change | Reason and boundary |
| --- | --- |
| ES modules, explicit imports and owner injection | Small independently testable files; no dependency on global initialization order |
| Native Web Components and DOM adapters | Remove Dojo dependency; preserve recipe names through collection grammar |
| Token-aware macro compiler | Preserve literals/comments and provide useful errors; raw regex rewriting is insufficient |
| Owner-scoped cleanup and cancellation | Prevent duplicate subscriptions, timers and stale async updates after replacement |
| Promise-based RPC adapter with correlation | Prevent older responses overwriting newer values; no synchronous network calls |
| Capability-based touch affordances | A tablet may also have a mouse; device labels alone cannot describe current interaction |
| CSS tokens, component styles and layout styles separated | Shared themes without copying overrides into every component |

Promise use does not settle legacy callback timing. Record ordering and batching
in tests. Arrow functions cannot acquire a new this via call/bind: recipe
compilation must use ordinary functions when source-node this is required.

## Current gaps (do not advertise as finished)

Static HTML still contains the laboratory shell. bootstrap.js chooses builders
by URL and builds the menu directly. No registered server page identity, root
frame bridge or login lifecycle exists in this demo. Application has a minimal
page-local event contract; node publish/subscribe compatibility and macro syntax
are incomplete. Formula/controller execution currently uses its existing func
convention, not the complete legacy recipe language. dataRpc grammar request:
https://github.com/genropy/genro-builders/issues/38.

The inspector mounts a separate tool Application over references to the real
page Bags. The playground has a separate experiment Application. Both need
explicit ownership; neither is a second global genro for the main page.

## Mobile is a release criterion

Use Pointer Events for gestures, scoped touch-action, pointer capture and cleanup
on cancellation. Do not globally disable scroll or pinch zoom. Expose handles
where touch cannot use hover, and keep a keyboard/button alternative to drag.
Keep semantic drop payloads and allowed targets separate from gesture detection.
File drops, item reordering and resizing are distinct interactions.

Test phone/tablet, a hybrid mouse+touch device, keyboard-only, virtual keyboard,
orientation changes, viewport resizing, scrolling during gestures, cancellation
and focus restoration. Compact desktop density must not force small touch targets.
Real-device tests are required; jsdom and narrow screenshots cannot prove touch support.

References for the modern implementation direction:
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/any-hover

## Verified HTML construction paths

A follow-up read traced rootPage all the way to HTML output. The inspected
checkout supports two paths, not just a generic "HTML builder":

- Default: `gnrwebpage.py:rootPage` -> `build_arg_dict` -> Mako
  `gnrjs/gnr_d11/tpl/standard.tpl` -> `gnr_header.tpl`.
- Opt-in `experimental.no_mako`: resource lookup for `standard.py` ->
  `resources/common/tpl/standard.py:PageTemplate` ->
  `gnr_header.py:HeaderTemplate`. Missing Python templates fall back to Mako.
- `gnrwebpage_proxy/frontend/basepagetemplate.py:BasePageTemplate.render`
  creates `PageBuilder`, invokes build and serializes via toHtml. PageBuilder
  uses GnrHtmlSrc, creates html/head/body and calls toXml with HTML options.
  It deliberately does not use the print-oriented GnrHtmlBuilder defaults.

Both paths emit mainWindow, protection_shield, framework/page resources and
`new gnr.GenroClient({page_id, pageMode, pageModule, domRootName, startArgs,
baseUrl})`. This verifies the owner's distinction: the initial document already
boots a particular page instance; it is separate from the later main source.
Retain that separation and overridable document composition, not obsolete XHTML,
Dojo loader configuration or viewport rules that disable zoom.

## Phase 1 decision surface

Status: accepted for implementation trial; public signatures and detailed timing remain proposals. See [runtime-contract.json](runtime-contract.json)
for evidence, expected behavior and future verification steps for each scenario.

Preserve: page-local ownership, relative authoring paths, source context where
legacy specifies it, node identity continuity, typed source/data separation.
Adapt: readiness completion instead of a fixed delay; token-aware macros instead
of regex replacement; owned cleanup instead of incidental DOM removal; native
events and explicit widget method adapters instead of universal dojo.connect.
Defer: registered identity, root/child transport and close delivery until the
approved ASGI seam is available. A codec-envelope test is not a socket test.

The pending-callback rule intentionally strengthens the inspected legacy: a
removed owner must not mutate a replacement when an asynchronous operation ends.
Drop callbacks preserve source scope; widget internals and inspected drag
callbacks are not automatically rebound.

Legacy typed transport evidence is Bag.fromXmlDoc (typed-text conversion and
recursive class reconstruction), GenroClient.clsdict (domsource versus bag), and
rpc.resultHandler (XML response envelope decoding). fireItem establishes fired
write/reset semantics only, not serialization. See the matrix for hashed paths.
