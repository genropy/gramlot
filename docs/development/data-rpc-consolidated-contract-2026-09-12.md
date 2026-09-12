# Data RPC: consolidated decisions and implementation checkpoint

2026-09-12 · Data RPC foundation included in the planned 0.1.2 release

The owner considers the triangle dataRpc experiment a suitable basis for
consolidation. This records the agreed contract and checks it against the local
implementation; it does not declare a release, merge or completed beta.

## Status and precedence

Latest checkpoint: implementation committed on develop as `ef23584`; the owner
now authorizes branch push but explicitly excludes release. Earlier local-only
and uncommitted descriptions below are historical checkpoints.

**Later owner scope change:** this foundation is included in 0.1.2. Its runtime
and tests are now integrated locally into canonical develop, uncommitted. The
original worktree remains intact. main and tags have not moved. The following
worktree-only description is the earlier checkpoint, superseded by this update.

Runtime work remains uncommitted in sibling `gramlot-datarpc-poc`, branch
`codex/datarpc-poc`. Canonical `gramlot` is on `develop`; its documentation records
these decisions. The verified remote is `git@github.com:genropy/gramlot.git`.
Neither consumer repository was changed. Source version 0.1.2 and the 0.2.0 beta
target must not be confused with publication. Registry and CI publication status
were not rechecked in this consolidation.

This document is the current reading entry point for RPC. Earlier experiment
snapshots using `rpc_*`, metadata exposure or `_concurrency` are historical.
The [page-services plan](page-services-design-2026-09-12.md) retains its chronology;
the [SourceNode alignment](rpc-source-node-alignment-2026-09-12.md) supplies detailed
legacy evidence and earlier test/build records. Later example layout changes do
not change this RPC contract.

## Approved decisions

| Concern | Decision |
| --- | --- |
| Application authoring | Python-first; UI, Data, bindings and requests use Gramlot. No application fetch or DOM workaround. |
| Data methods | `@endpoint` exposes a Python Data-producing method. `dataRpc` optionally writes its decoded result to a Data destination. |
| Source methods | `@source` builds Source into `root`. `main` is the only implicitly exposed Source method. |
| Inheritance | Ordinary MRO and `super()`. Unchanged inherited methods retain their decorators, including ordinary mixins. An overriding definition must be redecorated, except implicit `main`. |
| Page state | Pages are stateless. Request/user/shared mutable state belongs outside the Page. |
| Browser startup | Application and configured services become ready before initial content. `main` is initial remote Source; a compulsory second request is not an architectural requirement. |
| Serialization | Cooperating Python and browser services use TYTX; the decoded result determines its type. No `_result_dtype`. Text remains text, Bag remains Bag, Decimal remains Decimal. |
| Pending RPC | The SourceNode owns its pending invocation. A second trigger is refused with busy feedback; no queue, replay, cancellation of the first call or automatic latest-result policy. |
| Scheduling | `_delay` coalesces triggers before execution, in milliseconds. Binding values are read at execution time. |
| Interaction lock | Authors can use `_lockScreen` when editing must wait for completion. |
| Standalone | Components requiring Python services need an explicitly configured server. Standalone files cannot supply those services themselves. A hosted Gramlot service remains a parked idea. |

Refusing another call on one node is not a global sequential RPC scheduler.
Different SourceNodes may have independent calls in flight. `_concurrency` is
rejected rather than exposed as an application policy.

### The observable triangle behavior

Base and height feed both a local formula and a Python endpoint. If a call starts
with base 5 and height 4, then height changes to 8 while it is pending, the local
formula can show 20 while the accepted server call later writes 10. The rejected
activation is not replayed. A subsequent activation after completion can calculate
again. This behavior is deliberate; authors choose a screen lock when such interim
editing is undesirable. The existing browser test exercises this exact sequence.

## Local implementation details, not additional universal decisions

- FastAPI receives `POST /page/{name}/rpc/data/{method}` for Data and
  `POST /page/{name}/rpc/source/{method}` for Source. A legacy experimental Data
  route is retained as an alias; new documentation uses the role-qualified route.
- Requests use `application/vnd.tytx+json` and a TYTX-encoded mapping of named
  arguments. Signature binding applies defaults and validates supported annotations.
  The adapter injects explicitly annotated `InvocationContext`; clients cannot
  replace it. The exposed-method registry follows effective MRO.
- Responses are TYTX envelopes: `{ok: true, result: value}` or
  `{ok: false, error: {kind, message}}`. HTTP status also distinguishes malformed
  transport, signature errors and server exceptions. This is not arbitrary
  text/plain or arbitrary external JSON response support.
- Plain dict/list values currently remain dict/list. A standard JSON-to-Bag mapping
  is still open; no implicit conversion should be inferred from TYTX usage.
- `dataRpc` writes a successful destination before `_onResult`. Failure preserves
  the old destination. `_onCalling` can edit the argument snapshot or return exactly
  `false` to cancel before transport. Pending ownership starts before this hook and
  ends after result/error handling, with cleanup even if a hook fails.
- `SourceNode.rpcPending` exposes pending state; `_rpcPromise` is the internal
  Promise handle. Disposal invalidates late writes and cancels owned transport and
  timers. Browser cancellation does not roll back work on the server.
- `genro.serverCall` returns a Promise and shares the transport service. Current
  transport is POST/TYTX with a 50-second default timeout. No Deferred, synchronous
  XHR or WebSocket compatibility is claimed.
- Busy emits `gramlot:busy` and attempts a short tone. Browser audio policy can
  suppress the sound without changing refusal. `_lockScreen=True` uses an app-owned
  overlay/inert root and independent lock owners; legacy presentation options are
  not all implemented.
- Zero, missing or legacy `auto` delay currently means immediate execution.
  Named `SourceNode.delayedCall` timers are cleared on removal/disposal.
- Button action restores delayed click accumulation through `_counter`; without
  delay it has a 200ms repeat guard. `fire`/`fire_*` carry count/modifier attributes;
  `publish` retains a true payload. This adjacent behavior is checked separately.
- Each invocation currently creates a fresh Page and each Source call a fresh
  builder. Async methods run asynchronously; sync methods use a worker thread.
- Remote Source currently supports an existing `contentPane`, validates a detached
  branch before replacement and preserves the previous branch on failure. It keeps
  its own latest-replacement lifecycle, separate from dataRpc's busy refusal.
- The shared dictionary-of-Bags store uses exclusive whole-operation ownership
  for reads and writes. Its local implementation is process-local and reentrant;
  release is exception-safe but mutations are not transactional. Async operations
  retain ownership until their worker actually completes.

## Open work and integration boundary

1. Decide JSON dict/list → Bag conventions before promising automatic conversion.
2. Decide whether and how to reuse ready stateless Page instances. Current fresh
   instances satisfy isolation but do not implement a registry of ready instances.
3. Specify `page_id` creation, lifetime and its distinction from page class name,
   request identity and shared-state key. The triangle does not require it.
4. Define production authentication/authorization, error disclosure and deployment
   policy before treating this PoC as a public service. Decorator exposure is not
   a user authorization model.
5. Broader remote containers, alternate transport modes, embedded initial Source,
   WebSockets and distributed/persistent stores remain outside this slice.
6. Review the complete dirty worktree diff before integration: page services, RPC
   interaction changes and example-presentation changes coexist. Preserve all of
   them; do not stage the entire worktree blindly. Integration, commit, push and
   release remain separate actions.

Recommended next step: review a bounded integration diff for the page-service/RPC
foundation on `develop`, with its tests and maintained usage guide. Do not restart
the grammar, drag/drop or canvas backlog as part of this consolidation.

## Fresh verification

Checks executed for this record on the current local experiment:

- Python: 13 passed (`test_data_rpc`, `test_page_services`, `test_shared_store`).
- JavaScript: 16 passed (`server-call`, `provider-actions`, `remote-source`).
- Chromium: 3 passed against the running triangle bundle: ready-before-main,
  local/Python parity and remote content; busy refusal without replay; live/code
  presentation with splitter state preserved after RPC.
- `git diff --check` passed in both checkouts.

These targeted checks supplement earlier full-suite records; they are not a fresh
full-suite, clean-install, CI or release validation. Existing Python dependency
deprecation warnings remain. The current example presentation uses live/code panes
and a subtle Open inspector control below the live border, superseding older
screenshots with the inspector below the editor.

## Reopened result contract: legacy modes and result attributes

Owner-requested source investigation, after the consolidation checkpoint. The
value-only experiment is not yet a complete model of legacy RPC results.

Legacy source root: `/Users/gporcari/Sviluppo/Genropy/genropy`.

- `gnrpy/gnr/web/gnrwebpage.py:636`: `_rpcDispatcher` consumes `mode` (default
  `bag`) and selects `result_<mode>`. Mode selects response processing/serialization,
  not the Python return value's dtype.
- `gnrpy/gnr/web/gnrwebpage_proxy/rpc.py:47`: `result_bag` builds a Bag envelope,
  serialized as XML. A plain value goes into its `result` node. A returned BagNode
  supplies its value and attributes. A tuple `(value, resultAttrs)` supplies the
  same two parts and marks `resultType='node'` when attributes are not None.
  A third tuple element, when a Bag, is passed to `setInClientData`; this is a
  separate client-data-change channel, not result attributes.
- The same proxy has `result_xml`, `result_json` and `result_text`. Raw XML can
  serialize a Bag directly; JSON uses the page catalog and a simpler error object;
  text returns `result or error` (including its falsy-value caveat). These handlers
  do not apply the rich Bag-envelope tuple protocol. A `result_html` definition
  also exists but has a signature inconsistent with the dispatcher's single-arg
  call; do not claim verified HTML-mode compatibility from its presence alone.
- `gnrjs/gnr_d11/js/genro_rpc.js:598`: `resultHandler` processes envelope side
  channels, then returns the result node when `resultType='node'` or resolver
  `currentAttr` requests it; otherwise it returns the node's value. Resolver
  attributes are merged with incoming result attributes taking precedence.
- `gnrjs/gnr_d11/js/gnrdomsource.js:424`: dataRpc hands the result to
  `dataNode.setValue(result)` before `_onResult`. `gnrbag.js:256` recognizes a
  BagNode and unwraps its value and attributes into the destination node. Thus
  metadata is not an arbitrary object placed inside the destination value.
- Real uses include `_gnrbasewebpage.py:554` returning `(pkey, resultAttr)` after
  save (caption, lastTS), and `gnrwebpage_proxy/apphandler/get_selection.py:374`
  returning rows with selection metadata (totals, limits, selection information).

This is static source evidence, not a new legacy browser execution. The current
Gramlot envelope `{ok, result}` and TYTX auto-typing do not yet explicitly model
this result-attribute protocol. Arbitrary tuple serialization must not be mistaken
for support for `(value, resultAttrs)`.

Before closing the result contract, decide how Python supplies value plus node
attributes, how TYTX carries them, whether destination attributes are replaced or
merged, and what direct Promise callers and `_onResult` receive. Preserve the
separation between transport format, value dtype, node attributes and optional
client-data changes. No implementation or new mode API is approved by this finding.

### Automatic metadata: three distinct channels in legacy

Follow-up static verification of the Python proxy, WSGI response builder, standard
selection handlers and JavaScript consumer confirms the owner's recollection,
with an important distinction: timing is not universally injected into resultAttrs.

| Channel | Producer and evidence | Data |
| --- | --- | --- |
| HTTP headers | `gnrwsgisite.py:1377–1383`, `:1406–1409` | X-GnrTime (elapsed dispatcher time in seconds), X-GnrSqlTime (accumulated SQL delta_time), X-GnrSqlCount, X-GnrXMLTime (serialization milliseconds), X-GnrXMLSize (len of serialized XML string). None-valued entries are omitted. |
| Result-node attributes | `apphandler/get_selection.py:325–339` | table, method, selectionName, row_count, totalrows, debug, servertime in milliseconds and newproc; other fields are conditional. This standard handler constructs these attributes before returning the tuple. |
| Result-node attributes | `apphandler/db_select.py:189–205` | columns/headers when a selection exists, resultClass, dbselect_time in seconds, optional errors and applymethod additions. |
| Result-node attributes | `apphandler/related.py:231–238` | dbtable, totalrows, servertime in milliseconds, newproc, childResolverParams. |
| Envelope siblings | `gnrwebpage_proxy/rpc.py:47–79` | resultType, error, optional localizer status, each non-None page envelope_* member with its prefix stripped, and collected dataChanges. These are not attributes of result. |
| Generic result attribute | `gnrwebpage_proxy/rpc.py:65–67` | __cls='domsource' when the value is the page's DOM Source type. Caller-supplied BagNode/tuple attributes otherwise remain the source of result attributes. |

`X-GnrXMLSize` is computed with Python `len(xmlresult)`; it is not a reliable
UTF-8 byte count. `X-GnrTime` is broader than endpoint-only execution time and is
not browser round-trip duration. Header production is on the normal page response
path; early file responses and exceptional dispatch paths need separate treatment.

The browser `genro_rpc.js:598–666` reads the envelope and chooses value versus
node; `:670–678` consumes time/SQL headers into currProfilers. XML header details
are stored in rpcHeaderInfo under debug_sql/debug_py (`:614–620`). This profiling
path does not copy HTTP headers into the destination Data node's attributes.
`gnrdomsource.js:457` records _lastRpcTs on the SourceNode after completion; it is
client runtime state, not a server-provided result attribute.

Conclusion: resultattrs can contain automatically populated timings when a
standard service such as getSelection supplies them, while general RPC timing
uses HTTP headers. For Gramlot, result-node attributes, transport diagnostics and
envelope side effects must remain explicitly distinct. Their new API is still
unapproved. No runtime behavior was changed by this investigation.
