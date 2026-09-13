# Remote Source: legacy audit before experimentation

Status: source inspection on 2026-09-13, not a claim of full legacy runtime
verification. Gramlot source version is locally 0.1.4, unpublished. No new remote
API or behavior is implemented by this audit. The existing prototype is assessed
below. Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`.
The inspected `gnrdomsource.js` is clean; its latest affecting commit is
`31e68fe358`. Findings describe this checkout, not every historical release.

## Three mechanisms that must not be conflated

1. Python `pane.remote(...)` annotates the existing parent container with
   `remote='remoteBuilder'`, `remote_handler` and `remote_<parameter>` attributes.
2. A browser Source child tagged `remote` follows `_bld_remote` →
   `setRemoteContent`: it installs a GnrRemoteResolver on the parent, with
   `updateAttr=true`, its own cacheTime, and sync default true. This is a separate
   path from updateRemoteContent and has different callbacks/cache semantics.
3. dataRemote resolves Data. A Source builder returns structure whose insertion
   creates widgets, bindings and providers, not merely a Data value.

## Authoring and invocation

Legacy anchors: `gnrpy/gnr/web/gnrwebstruct/base.py:847`,
`gnrpy/gnr/web/gnrwebpage.py:2696`, `:1237`, `:1610`.

- `remote(method, lazy=True, cachedRemote=None, **kwargs)` resolves the handler
  while constructing the original page. Callables are accepted directly.
- It modifies the parent node, rather than appending a normal visible widget.
- `lazy=False` also invokes the handler immediately into the initial Source.
  Remote attributes remain installed, allowing later forced refreshes. This is
  initial embedding, not an instruction to always make an immediate browser RPC.
- Initial eager `_onRemote` is extracted and emitted as a dataController with
  `_onStart`; the network variant runs a browser callback after content merging.
  The two timings must not be assumed equivalent.
- Parameters ending `_path` get a section-sign prefix during lazy authoring;
  remoteBuilder strips `_path` from the key and the first character from the
  value. The eager path passes the original keyword names/values instead.
  Blindly copying this convention can corrupt values or change handler signatures.
- remoteBuilder optionally mixes `py_requires`, resolves the remote handler,
  creates a new Source root, sets page `_root`, calls the handler and returns
  that root. The handler return value is ignored. `tag` can instead construct a
  specified child. These are legacy capabilities, not approved Gramlot inputs.
- getPublicMethod supports marked public methods, remote_ fallback, proxy paths,
  encoded mixin references, signed URLs, verifiers and tags. Gramlot's explicit
  @source/MRO allowlist must not inherit arbitrary method lookup from this API.

## Triggering, visibility and parameters

Browser anchors: `gnrjs/gnr_d11/js/gnrdomsource.js:903`, `:993`, `:1500`, `:1714`.

- Initial remote building waits for container visibility, then a 1 ms timeout.
  Merely declaring a remote in a hidden tab does not mean it is requested now.
- updateRemoteContent returns if Source already contains children unless forced.
  This protects eager/previous content. Static placeholder children can therefore
  prevent initial loading: this is not equivalent to a designated loading slot.
- Changes to reactive remote_* attributes force updateRemoteContent. ^ registers
  a dynamic attribute; = supplies a value without the same trigger subscription.
- remote_* parameters are evaluated on the SourceNode at execution time.
  Non-underscore names are sent to the server; underscore names are controls.
  Typing an option incorrectly can make it an application parameter.
- Date parameters are converted with the Data node's dtype. Typed Date/Datetime
  preservation is part of the contract, not cosmetic formatting.
- `_if` is evaluated with the remote parameter context. False with `_else`
  merges the fallback (a string may be executed to obtain it); false without
  `_else` preserves existing content. This is not inherently a dataRpc predicate.
- sendInheritedAttributes forwards the inherited attribute set as
  `_inheritedAttributes`. The flag itself was already copied among non-underscore
  kwargs. Check consumers accepting **kwargs rather than assuming it vanishes.
- `_async` overrides the call argument; otherwise `kwargs.sync = !async` can
  request synchronous XHR. `_waitingMessage` adds a hider and forces async.
  Gramlot must use Promise-based asynchronous transport, not port blocking XHR.

## Cache and overlapping requests

- `_cachedRemote` compares evaluated attributes with `_lastRemoteAttr`; it is
  last-argument suppression, not a cache of multiple Source results or a TTL.
- `_lastRemoteAttr` is assigned before `_if` and before successful completion.
  An error followed by identical arguments can therefore be suppressed. Retrying
  must be explicitly tested; a successful-result cache is a different contract.
- Current legacy `_remotebuilding` coalesces changes into `_pendingRemoteUpdate`.
  The running response is merged, then a new forced call uses fresh attributes.
  Intermediate parameter states are not all replayed, but old content may appear.
- `_remotebuilding` is cleared after scheduling the pending-header watcher, not
  necessarily after that watcher merges Source. Request completion and completed
  UI construction are distinct stages.
- The shown error branch alerts on result.error. Hider removal is inside the
  success watcher; transport failures and flag cleanup need runtime fault tests.
  These are risks inferred from local control flow, not verified reproductions.

## Replacement, ownership and lifecycle

Anchor: `gnrdomsource.js:2143` (mergeRemoteContent).

- Ordinary containers remove existing Source children, then transfer nodes out
  of the returned Bag. It is replacement despite the name mergeRemoteContent.
- tbody is special: only remote_merged_* children are removed; a returned tbody
  is located and its children inserted with that prefix, preserving static rows.
- Falsy fallback clears removable children. Incoming nodes are moved, not cloned;
  a cached result cannot be assumed reusable after insertion.
- Resource headers must finish loading before merge; `_onRemote` runs after
  merge, followed by fakeResize. This ordering does not establish that all nested
  async remotes, images or third-party widgets have finished loading.
- Removing Source is not a declaration that Data is deleted. Reinserted setters,
  controllers and subscriptions can modify existing Data or duplicate work if
  disposal is incomplete. Dirty forms, focus, selection and nested providers
  require explicit tests rather than assumptions about DOM replacement.

## What Gramlot currently does

Sources: `src/gramlot/grammar/logic.py`, `src/gramlot/page.py`,
`js/dom/src/services/server-call.js`, `js/dom/src/builder-base.js`,
`js/dom/src/logic/runtime.js`, `tests/test_page_services.py`,
`js/dom/tests/remote-source.test.js`.

- Python `contentPane.remote(method, **params)` installs a transparent
  remoteSource child and defaults `_on_start=True`. Only contentPane is accepted.
- @source builds into the supplied root and must return None. main is the sole
  implicit Source method. Roles are enforced separately from @endpoint.
- The host creates an invocation-local builder; sync methods use the host worker
  path, async methods are awaited. Client/server Data is not implicitly shared.
- Calls use the source role and TYTX. Container-relative Data scope is exercised
  by the current tests. Sending inherited server builder context is not provided
  by the existing remote API.
- A new Source request cancels the prior browser request and uses generation
  checks to discard late replies. This differs from legacy pending replay and
  from dataRpc's busy refusal. Browser abort does not promise server cancellation.
- `_onCalling` can cancel; `_onResult` receives source/kwargs/installed after
  insertion; `_onError` handles errors. `_onRemote` is not an implemented alias.
- `_delay` goes through shared provider scheduling. Visibility gating, legacy
  `_if`/`_else`, cachedRemote and waitingMessage are not implemented equivalents.
- Replacement stages imported Source, rejects label collisions, preserves static
  siblings and removes only the provider's previous nodes. The provider survives
  replacement. Prevalidation is not a rollback guarantee for runtime failures
  during installation; a setter could have already changed Data.
- Runtime node disposal cancels provider calls; application disposal also makes
  results obsolete. Nested remote teardown must be stress-tested.
- Existing tests cover replacement/Data scope, preservation on server error,
  late reply rejection, disposal and standalone service rejection. They do not
  prove the broader legacy contract above.
- The local Django refactor moves invocation code into contrib/_shared/pages.py;
  it remains separate uncommitted work. Committed FastAPI behavior must be tested
  independently when consolidating changes.

## First experiment and acceptance matrix

Proposed experiment: a separate Python-first FastAPI page, live pane and full
Python source side by side. A selector requests an @source fragment containing
bound inputs and a nested remote. Add a static sibling to expose ownership.
Use controlled delay/error parameters only in this local example.

Before claiming compatibility, check:

1. Hidden container: decide visibility-lazy versus immediate start; test first
   reveal, hide/reveal and prebuilt children.
2. Parameter change with multiple ^ dependencies and _delay: one settled request;
   = values sampled when the call actually starts; no unsolicited replay policy.
3. A→B slow responses: choose pending replay, busy refusal or latest response;
   inspect browser outcome and server work separately.
4. Static sibling survival and two providers with colliding labels; validate
   before removing known-good content.
5. Server error, transport timeout, decode error, invalid Source, installation
   failure, retry with identical arguments, and cleanup of busy/feedback state.
6. Dirty Data and forms: explicitly choose preserve versus reset; verify bindings,
   setter execution, focus and subscriptions after repeated replacement.
7. Nested remote removed while in flight; no late resurrection or leaked listener.
8. Component collection/resource first loaded by remote content; nested build
   completion versus callback timing.
9. Empty Source, conditional false with/without fallback, first eager build and
   subsequent remote refresh; do not silently equate missing options.
10. Typed dates, literal paths, inherited context and ordinary MRO-decorated mixins.

Decisions still open: default initial visibility policy; ownership of existing
children; policy for in-flight updates; callback readiness level; allowed inherited
context; success-only caching/retry; Data initialization semantics. These are
proposals for review, not fresh approved legacy-compatibility requirements.

## Owner-approved first PoC scope

The owner authorized a delegated first PoC after this audit, explicitly deferring
complete legacy coverage. Use the existing @source/contentPane.remote contract
for parameter-driven fragment replacement with a bound input and static sibling.
Do not silently adopt the legacy overwrite-all, visibility, caching or pending
replay policies. Keep the omitted cases documented beside the example. This
approval does not authorize a release, push, or consolidation of unrelated work.
