# Live pages, Data RPC, remote Source and shared state

For the current consolidated contract and implementation status, start with
[Data RPC consolidation](data-rpc-consolidated-contract-2026-09-12.md).
The initial-state table below is a historical baseline, not current behavior.

Design and implementation plan for owner review · 2026-09-12

Status: approved directions are identified below; API details and phase sequencing
are proposals. Subsequent owner authorization started the bounded experiment
described in the execution update below. This is the
server-contract foundation for the 0.2.0 beta consolidation, before freezing the
[component grammar design](gramlot-0.2.0-component-grammar-design.md).

## 1. Scope and evidence

The goal is a browser application ready to operate before its initial content
arrives, with a shared service mechanism for Data and Source, stateless Python
pages, and separately protected shared state. Applications remain Python-first
and use Gramlot declarations, bindings and framework services exclusively.

Local inspection at this checkpoint:

| Area | Actual state | Target or limitation |
| --- | --- | --- |
| Canonical checkout | develop at dbf6eec; source version 0.1.2; origin git@github.com:genropy/gramlot.git | 0.2.0 is the consolidation target, not a released beta |
| Browser startup | FastAPI entry.js fetches the recipe before constructing Application | Initialize the application and configured services before awaiting main |
| Python Page | WebPage provides main and configuration | Explicit Data/Source roles and stateless execution |
| RPC experiment | Sibling gramlot-datarpc-poc worktree, codex/datarpc-poc, uncommitted | Preserve and review; not merged into develop |
| Experimental exposure | @metadata(prefix='rpc', public=True), named RPC registry | Replace with @endpoint and @source |
| Experimental dispatch | POST /page/{name}/rpc/{method}, fresh Page per call, TYTX JSON | Source dispatch, instance reuse and page identity remain to design |
| Experimental MRO | Undecorated overrides hide exposure; discovery filters WebPage subclasses | Discover ordinary library mixins through effective Python MRO |
| Shared server store | No implementation supplied by this plan | Exclusive ownership of dictionary-of-Bags store |
| Publication | docs/release.md records 0.1.0a1 as published; 0.1.2 is source-only | No live registry/CI recheck performed for this documentation change |

The experiment's guide and tests describe its bounded contract. Earlier session
reports include Python, JavaScript and triangle browser verification; these tests
were not rerun for this document and do not validate the new target architecture.
The existing runtime and publication workflow were inspected, not modified.

Compatibility evidence: [legacy RPC audit](datarpc-servercall-legacy-audit-2026-09-12.md).
Distribution evidence: [browser distribution](browser-distribution-proposal.md),
[JavaScript-only guide](../guides/javascript-only.md), [FastAPI guide](../fastapi.md),
[release status](../release.md), and [branch policy](branch-policy.md).

## 2. Approved directions

- @endpoint exposes a Data-producing Python method; dataRpc publishes its result
  to Data when a destination is supplied.
- @source exposes a Source-building Python method; remote supplies a container
  with Source. main is implicitly Source, the sole automatic naming exception.
- Unchanged inherited methods retain their decorators, including methods supplied
  by ordinary library mixins or the base Page. A new overriding def must repeat
  its decorator to remain exposed. main retains its implicit Source role.
- Ordinary Python MRO chooses the effective method. super() remains normal Python
  cooperation, without a parallel method-resolution mechanism.
- Python Page is stateless. Mutable request, user and shared application state
  belongs outside the page instance. Reuse of a ready instance is possible only
  under that constraint; cache lifetime and instance granularity are not settled.
- The browser shell/application and its configured services can become ready
  before main content arrives. main is the initial remote Source at the root.
  A mandatory second request was not imposed: embedded and fetched Source should
  use the same mounting contract.
- TYTX is the cooperating Python/browser transport standard. Result type is
  decoded automatically, without requiring _result_dtype. Text stays text, Bag
  stays Bag, and numbers (including Decimal) remain typed values.
- Shared server state is a dictionary containing Bags. A thread exclusively owns
  the store throughout its read or write operation; other callers wait until it
  releases the store. Read-only access is also exclusive in this initial model.
- Standalone packaging does not imply a network prohibition. A standalone app
  could use a configured Gramlot server for additional capabilities. This service
  offering is parked; it does not authorize a hosted service implementation now.

## 3. Responsibilities and lifetime

| Object | Owns | Must not own |
| --- | --- | --- |
| Browser Application | Data, mounted Source, service clients, pending-call lifetime | Python method implementations |
| Python Page | Stateless endpoint/source behavior and immutable configuration | Mutable user/request state or a shared builder |
| Invocation context (proposed) | Current request identity, authorized store access, cancellation context | State leaked onto reusable Page attributes |
| Shared store | Dictionary of Bags and the exclusive access mechanism | Browser DOM or Source construction machinery |
| FastAPI adapter | Route resolution, request decoding, allowed-method dispatch and response encoding | Grammar compilation rules or an alternative browser runtime |
| Component contract | Named service requirements and parameter/result documentation | Hardcoded deployment URLs or arbitrary Python imports from clients |

Distinguish the page type name (for example triangle), an optional browser opening
page_id, a reusable Python instance, and a shared-state key. These are not synonyms.
A page_id is not proof of authorization. Its creation, lifetime and ownership remain
open. The triangle calculation does not require introducing page_id first.

Source builders must be invocation-local even if a Page object is reused. Sync
Python methods can run in the adapter's thread pool; async methods need an explicit
context/access strategy without blocking the event loop.

## 4. Method registry and validation

Proposed registry procedure: enumerate effective names across the full MRO, select
exactly the attribute Python resolves, then inspect that effective method's marker.
Do not search ancestors for a decorator after encountering an undecorated override.
Keep main's implicit Source rule separate. Reject ambiguous double decoration.

The registry should record method role, effective callable, signature and origin
class for diagnostics. The server dispatches only registry entries. A callable
reference emitted by Python authoring becomes a logical method reference, never
serialized executable Python or an arbitrary attribute path.

Validation layers remain separate:

1. Grammar validates the declaration and provider options.
2. The client resolves bound parameters and captures one invocation snapshot.
3. The adapter decodes TYTX, checks the registered role and binds named arguments.
4. Supported type constraints and domain checks validate values before execution.
5. Result validation distinguishes Data from Source before encoding and mounting.

Annotations are not a promise of arbitrary Python typing support. Specify supported
annotations and reject unsupported contracts at registration. Defaults, None,
extra/missing parameters and inherited signatures need characterization tests.
Service exposure is not authentication: the host still enforces access policy.
Import paths, context injection, source signature details and role-changing overrides
remain review questions; examples here are conceptual, not executable API docs.

## 5. RPC values and provider behavior

Start from the experiment and legacy audit; preserve verified syntax rather than
inventing a second logical-provider engine. dataRpc and genro.serverCall share the
same application-owned transport. Framework code owns networking; recipes do not
contain fetch or manual input scraping.

Parameters use named typed values. Keep provider controls and trusted invocation
context out of the caller's method arguments. Preserve ^ reactive subscriptions
and = passive reads. An optional destination does not change server execution.

The PoC uses TYTX JSON request maps and an ok/result or ok/error response envelope.
These exact envelope fields are a proposed baseline, not an owner-approved wire
version. Define HTTP status, protocol errors, application errors and serializable
error details together. Do not interpret JSON-looking strings as objects.

JSON dict/list-to-Bag normalization remains open. Verify arrays, empty objects and
arrays, dotted keys, label/value business records and typed leaves across Python,
TYTX and JavaScript before choosing a conversion. Do not silently bless existing
Bag conversion helpers: the audit records cross-language shape discrepancies.
Numeric triangle results need no automatic JSON conversion.

Retain the PoC's documented write-before-_onResult order and cancellation hook as
compatibility candidates. Its Promise return, bounded callbacks and timeout need explicit regression coverage
and a differences record. Later owner correction removes recipe-level _concurrency:
one pending Data RPC per SourceNode, busy feedback for refused activations, no replay.
_delay coalesces triggers before execution; _lockScreen optionally blocks interaction. Client abort never guarantees server rollback. Store locking does
not eliminate stale network responses; these are separate concurrency concerns.

## 6. Ready browser and remote Source

Proposed first lifecycle:

1. Load runtime and host configuration; create Application with a root destination.
2. Initialize configured service clients and framework loading/error presentation.
3. Acquire main Source, either from an embedded typed payload or a service call.
4. Decode and validate Source and its required capabilities before activation.
5. Mount through the same lifecycle used by a container receiving remote Source.
6. Dispose pending work and owned resources when the application is destroyed.

Make application readiness distinct from main-content readiness. A slow or failed
main must not leave an uninitialized client or an invisible error. Retry and state
retention behavior must be specified before exposing a public lifecycle API.

For subsequent remote replacements, define the existing container destination,
relative Data scope, resource preparation, ownership, old branch disposal and late
response rejection. A failed replacement should, as a proposal, preserve the last
working branch and expose the error rather than partially remove valid content.
Do not copy request-specific Source across page instances or browser openings.

Separate fetching can reveal the shell earlier but adds a round trip. Embedded
TYTX avoids that round trip but can delay the response while Python builds Source.
Compare compressed HTML with compressed JSON/MessagePack on representative recipes;
no loading-time claim or carrier selection is established by this plan. WebSocket
readiness motivates the lifecycle but WebSocket transport is outside this slice.

## 7. Exclusive shared store

The selected unit of ownership is the whole store, not an individual Bag and not
only the dictionary lookup. Acquire, perform the entire operation, and release.
A protected read-modify-write sequence cannot interleave with another owner.

Proposed API illustration, not shipped code:

```python
with store.acquire() as data:
    # Access the dictionary and its Bags only while ownership is held.
    ...
```

Required behavior:

- Release in a finally-equivalent path, including exceptions.
- All readers and writers use the same ownership boundary.
- Do not use an escaped live Bag reference after release. Return a detached result
  or serialize a snapshot while protected when the result would alias shared state.
- Waiting callers acquire only after the owner releases. FIFO fairness is not
  implied by the agreement and must not be advertised without an implementation.
- Lock ownership gives exclusion, not transaction rollback: an exception may leave
  partial mutations. Rollback is a separate feature, not implicitly promised.
- Keep remote I/O and browser waits out of the protected operation where possible.

For the first proof, recommend a single-process, synchronous critical operation
executed in a worker thread, with threading-compatible mutual exclusion. An async
wrapper must not block the event loop, acquire in one thread and casually release
in another, or release ownership while cancelled worker code is still executing.
Settle reentrancy/nested acquisition and timeout behavior before implementation.

A process-local dictionary cannot coordinate multiple workers. Recommend an explicit
single-process limitation for the first experiment; shared persistence and distributed
ownership require another store backend and their own failure contract. Store scope,
key creation, cleanup and memory limits still require review. Do not expand this into
a distributed storage project as a prerequisite to triangle RPC.

## 8. Standalone and required services

Separate distribution format, available services and offline operation. A file://
page can potentially call an external server if browser and server policy permit;
an ESM directory intended for static HTTP hosting is not automatically a working
single-file export. Existing JavaScript-only installation instructions remain valid.

The earlier blanket prohibition on server-dependent standalone components is
superseded. The proposed rule is to reject unsatisfied service requirements, at
construction/export where known and at dynamic activation otherwise. A Python
endpoint must be installed on a server; exporting HTML does not install Python
there. A future hosted Gramlot service, credentials and file-origin policy remain
parked and are not included in the initial experiment.

## 9. Implementation plan for review

Original review sequence follows. Subsequent authorization has now assigned P1–P5
and their consolidation checks to Sol in the preserved RPC worktree. Resolve routine
API choices as documented experimental choices; escalate genuine semantic blockers.
Each phase produces a reviewable change and documented evidence before proceeding.

| Phase | Work and dependency | Completion evidence |
| --- | --- | --- |
| P0 Contract review | Settle blocking questions below; classify PoC behavior against legacy | Agreed decorator, context and Source signatures; explicit remaining limits |
| P1 Method roles | Add framework-owned decorators and MRO registry; migrate triangle PoC | Ordinary mixin inheritance, diamond MRO, super(), redecorated/undecorated overrides, implicit main, inaccessible helpers and role checks |
| P2 Typed RPC | Consolidate shared call engine and adapter validation from PoC | Triangle formula/RPC parity; text, Bag, Decimal, null; parameters/defaults/errors; stale completion and disposal; no application bypass |
| P3 Ready application and main | Initialize app/services before content; route main through Source contract | Delayed main leaves shell/services ready; error visible; source/bundle parity; isolated builders during concurrent requests |
| P4 Container remote | Investigate legacy remote then implement bounded replacement using P3 | Relative scope, requirements, replacement, failure preservation, resource disposal and late-response rejection |
| P5 Shared store | Add exclusive whole-store access outside stateless Page after scope/async choices | Concurrent readers/writers never overlap; exact concurrent increment result; exception release; snapshot isolation; cancellation does not unlock an active worker |
| P6 Component grammar integration | Feed proven service and method contracts into existing grammar design | Component requirements, composed collections, developer/app overrides and JS class/function activation have explicit validation contracts |
| P7 Consolidation review | Review selected slices together before integration into develop | Targeted tests plus affected CI checks, executable docs, legacy differences and implementation-status updates |

P5 can be designed independently of remote; it does not block the stateless triangle.
P6 retains the existing component design's unresolved generic Builders seams and
collection composition experiments. It is not permission to implement that entire
backlog. No new worktree, merge, commit or publication is performed by this plan.

## 10. Acceptance and review questions

The end-to-end teaching example uses one Python recipe with base and height, a
local dataFormula and a dataRpc to Python. The displayed source is exactly the
executed source. Extend it only enough to demonstrate delayed main and one remote
fragment; test store contention separately so the simple recipe stays simple.

Questions blocking their respective implementation phase (none blocks this document):

| Question | Recommendation for review | Blocks |
| --- | --- | --- |
| Decorator imports and source signature | Framework-owned markers; preserve main(self, root); decide how extra Source parameters and context enter | P1 |
| Invocation context | Explicit framework-controlled context, never mutable self.request on reused Page | Reuse/context part of P2–P3 |
| Source route and envelope | Keep logical method identity independent of URL; share dispatch infrastructure with role checking | P3–P4 |
| Store scope | Start with one explicitly selected application store in one process; defer page/session scopes until needed | P5 |
| Store reentrancy and async access | Short synchronous worker-owned operations initially; specify nested acquisition and cancellation explicitly | P5 |

Other review questions: page_id necessity/lifetime; reused instance granularity;
JSON-to-Bag representation; role-changing overrides; remote failure/retry policy;
embedded versus fetched initial Source; JSON versus MessagePack; lock fairness and
timeouts; memory cleanup; beta version spelling and release acceptance perimeter.
These are not all prerequisites to the first RPC step. Hosted standalone services,
WebSockets, distributed stores and automatic server code deployment remain deferred.

## 11. Release boundary

This foundation alone does not establish beta readiness. main keeps the 0.1.2
consolidated source; develop accumulates reviewed 0.2.0 work. Before tagging any
release, fix the currently inspected publication workflow: GitHub assets depend on
PyPI publishing and upload uses --clobber, contrary to the agreed independent,
immutable GitHub release policy. Version spelling and authorized channels must be
explicit. Use the same browser payload for JS and JS + FastAPI delivery.

No commit, push, tag, public release, consumer modification or workflow edit was
performed to write this document. Preserve both the canonical documentation edits
and all uncommitted code/tooling in the RPC worktree.

## Execution update — subsequent owner authorization, 2026-09-12

The owner requested a Sol agent to implement the discussed foundation and explicitly
confirmed the model. Agent page_services_sol was assigned the existing dirty
codex/datarpc-poc worktree. Scope is P1–P5 and their P7 verification/documentation;
P6 receives design implications only, not a component grammar implementation.
No commit, merge, push, publication or consumer change is authorized by this task.

Preserve the existing RPC PoC and tooling. Use reversible, documented experimental
choices for routine API details. Genuine semantic blockers must be raised before
dependent work proceeds. Test and report actual behavior, then independently review
the implementation before proposing integration. Dispatch is not completion and
no new verification results are claimed by this update.

## Subsequent interaction contract

The owner authorized alignment to SourceNode-owned RPC pending state, busy refusal,
_delay, _lockScreen and button action/click counting after the first implementation.
The original agent verification predates that alignment. See the
[alignment record](rpc-source-node-alignment-2026-09-12.md) for current evidence.
