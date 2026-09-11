# Logical blocks implementation plan

2026-09-10. Planning requested by the owner. Implementation has not started.

Owner sequencing request: complete this logical-block step before resuming
layout implementation. Container research remains preserved; framePane,
borderContainer, tabContainer, drawers and toolbar redesign do not enter this
step. Remote integration uses an existing ordinary container rather than
requiring a new layout implementation.
Evidence: [data/service audit](data-services-design-audit.md),
[legacy inventory](../context/legacy-data-remote-services.md),
[events audit](events-legacy-audit.md).

## Outcome

Coherent Python/JS authoring for dataSetter, dataFormula, dataController,
dataRpc and container remote. Python describes browser logic and initial Data;
JS prepares Data before widget construction and executes reactive providers.
Optional adapters expose data services and Source fragment services. Local
recipes must remain usable without FastAPI or a server.

Exclude lazy dataRemote resolvers, database helpers, persistent server page
objects, WebSockets and full legacy compatibility from this delivery.

## Decisions before dependent work

| Topic | Working proposal and unresolved choice |
| --- | --- |
| Name | dataSetter in both languages; owner suggested this, but removing data alias still needs confirmation |
| Assignment | Confirmed by owner: explicit assignment including None/null; defaults only initialize missing data. Legacy null-preservation exception is not retained |
| Preparation | Initial pre-build requirement confirmed; extend to newly attached/remote branches, subject to confirmation |
| Boundary | Confirmed: prepare all setters in the branch being built before its widgets; stronger than the legacy per-level pass. This does not authorize forcing unavailable lazy branches |
| Order | Confirmed: branch setters, missing-only defaults, explicitly requested pre-build formulas/controllers, widgets, then post-build logic. Hook names and remote insertion details remain open |
| Logic syntax | Confirmed: JS expression for dataFormula and JS script for dataController, without a required function wrapper. Migration of existing function-string/named-function recipes and exact callback context remain to specify |
| Scheduling | Distinguish initialization, after-build, page-start, debounce and interval; names/defaults open |
| Topics | Reuse owner-scoped service; core/legacy syntax boundary remains provisional |
| Services | Existing endpoints and optional exposed page-method convention; not yet approved |
| Remote | Configure existing container and replace its managed children; insertion/failure rules open |

Settle local choices first, endpoint choices before RPC, and fragment lifecycle
before remote. No need to settle every server detail before local implementation.
Examples for review must avoid redundant defaults and show both Python and JS.

Owner confirmed `==expression` for inline attribute and service parameter values
from named peers, including reactive attribute updates. Define dependency
analysis, expression-to-expression references, cycles and errors alongside ^/=
before phase 3; reuse the expression evaluator rather than inventing another
provider. See the audit for the distinct attribute and RPC parameter paths.

## Module organization

Proposed responsibility boundaries; filenames can be refined during review:

- `src/gramlot/grammar/logic.py`: logical declarations with exportable parameter
  contracts; facade normalizes positional authoring. Do not patch generic
  Builders. Verify public export and disclose its known attribute-export limits.
- `js/dom/src/logic/`: preparation and provider execution with shared scheduling,
  bindings and ownership. BuilderBase/BuilderHandler delegate to this layer;
  preserve their structural integration and existing reactive graph.
- Existing `services/recipe-runtime.js`: converge recipe evaluation/context,
  rather than adding a competing compiler. Any approved macros require token-aware
  handling and a defined subset, not ad-hoc replacements.
- `js/dom/src/services/`: injected service client and HTTP transport. Source
  installation reuses ordinary branch preparation/disposal.
- `src/gramlot/contrib/fastapi/`: optional registration, request context,
  validation and typed responses. Page-method convenience belongs to the adapter;
  core WebPage remains host independent.

## 1. Local contract and characterization

Write agreed signatures and behavioral cases before runtime changes. Cover
missing/null/false/zero/empty/Bag values and attributes, duplicate destinations,
relative paths, nested containers and setters after their consuming widgets.
Record current versus intended behavior separately. Decide expression/script
syntax and how current function-based recipes migrate; a parameter rename does
not settle the expression language.

Completion: agreed local matrix and focused tests exposing the differences.

## 2. Pre-build Data preparation

Separate setters from startup formula/controller execution. Current create()
initializes defaults first and interleaves setters with startup providers in
source order: explicitly resolve that difference. Apply preparation to initial
imports and dynamic insertion. Normal re-rendering must not replay setters over
user edits. Define whether replacement is a new installation or retained identity.

Completion: first widget construction reads declared initial Data, including
later-positioned setters within the agreed boundary; null/default/attribute
cases pass; re-rendering preserves edits; Python transport and native JS agree.
Deliver one minimal executable teaching pair.

## 3. Shared formula/controller lifecycle

Implement the agreed syntax, source context, conditions and scheduling on one
provider lifecycle. Register ^ dependencies even when not run at startup; read
= values when execution starts. Keep internal options and trigger metadata
distinct from user parameters. Formula writes its result; controller performs
explicit effects. Decide whether controller return-to-destination is supported.

Specify formula-chain order, duplicate triggers and direct/indirect cycles with
bounded diagnostic failure. Reuse existing batching. Removal and replacement
must cancel timers/subscriptions without duplicate startup callbacks.

Completion: tests for ^/=, fresh values, context, conditions/else, initialization
versus build completion, debounce/interval if selected, chains, cycles and owner
removal. Separate formula and controller examples.

## 4. Service client and dataRpc

Define endpoint references, HTTP verb, path/query/body mapping, response codec,
errors and injected transport. An arbitrary REST endpoint need not accept a
universal payload. First test orchestration with a fake service, then HTTP.
dataRpc uses the shared provider lifecycle and an optional destination.

Settle snapshot timing, pending state, timeout, before-call cancellation and
result/error hooks. Latest-result acceptance can suit reads but must not silently
drop side-effecting calls. Abort does not guarantee server rollback. Do not
automatically retry mutations. Late responses cannot affect replaced owners.

Completion: deterministic tests for reversed responses, failure, cancellation,
disposal, optional destination and typed results. Local blocks work without a
service; unavailable services report clear errors. One RPC teaching example.

## 5. Optional FastAPI endpoints

Integrate an ordinary existing endpoint first. If confirmed, add explicit
page-method exposure and generated references to avoid repetitive routing code.
No arbitrary attribute dispatch. Preserve validation and dependency injection
deliberately, with async handlers and request-scoped context. Fresh page/builder
instances per request; browser Data is not automatically Python instance state.

Completion: same client contract works with an existing endpoint and registered
page method; unexposed methods are unreachable; typed values/errors round-trip;
concurrent requests do not share mutable Source; base imports/installations do
not require FastAPI. Provide executable client/server examples.

## 6. Remote Source composition

Reuse transport, decode/validate Source separately from Data. Settle activation,
refresh, managed-child replacement, failed-load retention and overlapping loads.
Proposed sequence: validate Source/required components, prepare incoming Data,
dispose old managed children at the agreed boundary, install/build new children,
run completion hooks. Define failures explicitly; do not imply transactional
Data rollback. Preserve container identity and scope.

Specify IDs, component loading, Data ownership versus Source ownership, retained
user values and nested remote lifetimes. Server fragment generation uses a fresh
builder/root with host context. Core has no server-framework import.

Completion: fragment includes setter and formula; first build sees prepared
Data; replacement removes old subscriptions/timers; failed/stale loads preserve
the agreed state; repeated instances stay isolated. Verify a real FastAPI round
trip and equivalent local fragment installation.

## 7. Integration and review

Update grammar exports, maintained references, paired examples and packaged
assets together. Run relevant bindings/forms/defaults/Source regression checks,
clean package tests and server-independent import checks. Document intentional
legacy differences; successful demos are not full compatibility certification.

## Execution order

### Reviewable delivery blocks before layouts

| Block | Deliverable | Review gate |
| --- | --- | --- |
| A — Local contract | Signatures and lifecycle matrix, including == | Confirm unresolved behavior; use owner-approved decisions without asking again |
| B — Initial Data | Pre-build setter/default preparation for initial and inserted branches | First widget build sees Data; rendering does not replay setters |
| C — Expressions and local providers | Shared ==/formula evaluation, controllers, ^/= dependencies and scheduling | Paired executable examples; startup, cycles and cleanup verified |
| D — Server calls | Host-independent client, dataRpc and optional FastAPI registration | Ordinary endpoint and, if approved, page method; typed results and late-response tests |
| E — Remote content | Source fragment request and installation in an existing container | Incoming Data before widgets; replacement/disposal verified |
| F — Integrated handoff | Updated exports/docs/assets and a compact demonstration | Coordinator review and owner walkthrough before resuming layouts |

Block A must resolve: final dataSetter naming/alias migration; implicit startup
(the question is still unanswered); hook spelling/context and supported timing;
expression dependencies and migration of old function recipes. Blocks D/E have
their own later contract decisions, so they need not block B/C. Adding == to core
does not imply retaining legacy regex-based dependency discovery.

Each implementation assignment should name its bounded deliverable, relevant
files, accepted contracts and behavioral checks. Sol reports progress on a
meaningful finding or blocker and returns a final validation summary. The
coordinator reviews before assigning the next block. Do not claim work is active
between assignments. Planning alone does not dispatch an implementation agent.

Contracts -> preparation -> local providers -> RPC -> FastAPI -> remote ->
integration. Coordinator settles behavior with the owner and reviews results;
Sol can implement one bounded phase at a time after authorization and report
progress, tests and unresolved points. This plan starts no implementation agent,
commit or publication.
