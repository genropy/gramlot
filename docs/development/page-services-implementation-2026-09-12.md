# Page-services worktree implementation

Experimental implementation note · 2026-09-12

This dirty `codex/datarpc-poc` worktree implements P1–P5 from the canonical
page-services plan for review. These routine choices are implementation evidence,
not additional owner decisions.

- Decorators live in `gramlot.page`; Source methods keep `main(self, root)` and
  other Source parameters follow `root`. `InvocationContext` is injected only
  when explicitly annotated.
- The FastAPI adapter uses one allowlist and invocation path for Data and Source.
  The HTTP experiment spells these roles under `/rpc/data/...` and
  `/rpc/source/...`; the former `/rpc/{method}` remains a Data-only compatibility
  route.
- Pages and Source builders are invocation-local. No page/request state is placed
  on a reusable object.
- Browser startup creates Application before awaiting implicit `main`. Remote
  Source is represented internally by a transparent provider child while its
  public Python operation configures an existing `contentPane`.
- Remote always uses latest-response replacement. Incoming Source is validated
  before the old owned branch is removed. Static siblings remain outside that
  ownership.
- The store is a single `ExclusiveBagStore` per `PageCollection`, process-local,
  reentrant for the owning thread, with copied insertion and guarded access. Public
  results are detached; callbacks remain responsible for not stashing private
  implementation objects through unrelated side effects. There is no rollback or
  fairness promise.

The legacy remote source was re-read before implementation. Legacy Python
`remote()` annotates the existing parent container with `remote`,
`remote_handler` and `remote_*` arguments; `remoteBuilder` constructs a fresh
Source root. Browser `updateRemoteContent()` serializes calls, resolves the
arguments in Source scope, waits for requirements, then merges returned Source.
The current slice preserves existing-container ownership, scoped parameters and
server-built Source while choosing explicit replacement, failure preservation and
late-result rejection. Cached remotes, waiting overlays, conditional branches,
inherited attributes, arbitrary layout children and dynamic resource loading stay
outside the bounded contract.

Component grammar P6 implications, without implementing that overhaul:

1. Components need distinct required-service roles (`data` or `source`) and a
   logical method identity; a generic HTTP requirement is insufficient.
2. Construction/activation must reject known missing services. Dynamic Source
   activation must apply the same check before side effects.
3. Source providers own a replaceable branch and its pending work. Contract
   composition must preserve scope, disposal, requirements and stale-result rules.
4. Typed parameter/result schemas should refer to TYTX value categories. Result
   dtype hints and JSON-looking-string inference would conflict with this service
   contract.
5. Application-scoped services must be alive before component Source activation;
   standalone export records required capabilities rather than implying offline
   execution.

Deferred work includes component grammar composition, hosted standalone services,
WebSockets, distributed stores, remote stores and release workflow changes.

## Subsequent RPC interaction correction

Owner correction replaces the original parallel/latest dataRpc policy. A SourceNode
now owns one pending Promise; another activation is refused with busy feedback and
is not replayed. _concurrency is rejected. _delay coalesces pre-execution triggers
for formula/controller/RPC, and _lockScreen provides independently owned interaction
locks. Button actions support delayed _counter and a 200ms immediate-click guard.
Remote Source retains its separate replacement/disposal policy; this change does not
silently turn remote replacement into a Data RPC policy.

The tests and build results above describe the previous agent checkpoint. See the
coordinator's later alignment report for verification of these subsequent changes.
