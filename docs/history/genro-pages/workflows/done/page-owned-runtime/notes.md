## Phase 1

The owner approved execution and a separate DOM baseline checkpoint.
DOM baseline: 3ef702a; all 128 existing tests passed before implementation.
The baseline preserves prior widget, layout, recipe and topic work; it is not part of this phase.

Supporting file: DOM src/target-wrapper.js records text-node ownership and refuses
in-flight full/partial delivery after disposal. This is necessary to meet the
approved no-resurrection and caller-host ownership requirements; it adds no public API.
A first fixture using explicit HTML IDs exposed the existing distinction between
HTML IDs and generated patch target IDs. The ownership tests use generated IDs,
as the existing writeback tests do; explicit-ID patching is outside this phase.

Implementation dependency: genro-dom-js 4ccf4f2 (baseline 3ef702a).
The owner accepted all proposed names. No naming markers remain.

Read-only review found two reentrancy gaps: component rule batches could run a
second controller after the first disposed the Application; an in-flight full
render could remount after disposal inside a component body. Dispatch and target
delivery now honor disposal, including per-patch checks. Both reproductions are
in the behavioral fixture. Retained Bags remain readable and mutable without
owned reactive effects; external subscriptions remain active. Caller hosts and
replacement Applications are preserved. Child-runtime disposal does not close
its parent. Parent-owned tool/experiment wiring is deliberately Phase 2.

Validation: 3 ownership contract tests; full pages suite 71 passed; DOM 128 passed;
ruff check tests/test_runtime_disposal.py passed; diff whitespace checks passed.
Plan contract fields and original contract skeletons are unchanged. Tests use
real JS DOM/Bag/builder objects; the full pages suite also retains Python/TYTX
JSON and MessagePack integration coverage. No live-browser UI changes in Phase 1.

## Phase 2

Owner approved the execution scope including Application.dispose calling the real genro.dev owner. No generic lifecycle/plugin framework is introduced.

Implementation complete: genro.dev owns the mounted inspector and playground;
Application disposal closes that owner. Inspector teardown now uses Bag's required
{any: true} unsubscribe selector. Laboratory reset disposes only its old experiment.
Bootstrap checks request generation and captured instance after asynchronous steps.

Validation: full pages suite 74 passed; DOM 128 passed; ruff check src tests passed.
Three new consumer contracts run against real Python/TYTX recipes in JSON and
MessagePack. Controlled delayed inspector responses cover both page replacement
and explicit page disposal while waiting. Existing nested tabs and inspector
remount regressions remain green. Original skeleton names/comments are unchanged.

Browser check on localhost: initial example rendered with CodeMirror; two rebuilds
worked; Ctrl+Shift+D opened one inspector; switching to MessagePack preserved one
working inspector and updated navigation transport. No browser errors. Human
Verify remains the authored judgment of familiar interaction and unchanged look.

Dependency commit: genro-dom-js f743e6c. Pages implementation checkpoint: af3e883.

Human Verify accepted: the owner reported “sembra ok” after the browser interaction check. The owner accepted all proposed Phase 2 names; markers removed.

## Final touch

Review depth: Light, selected by the owner. Reviewed pages revision:
8d03a2285ac6e5bbddb8cdbaea0634d4995a2af1, base e11dc4e.
Covered DOM dependency: 3ef702a..f743e6c, excluding prior baseline widget work.
Correction revision: 2789431; verification covers exactly this correction delta.

| Finding and evidence | Root cause | Fix and affected consumers | Verification | Outcome |
|---|---|---|---|---|
| P2: real Python/TYTX laboratory throws on disposal after host removal; old disposal clears replacement button handlers on shared host | Teardown queries mutable host rather than owned controls | Register all four commands with existing listen helper, retaining exact elements and callbacks | Removed-content and same-host replacement regressions, JSON and MessagePack; real rebuild click | Confirmed, corrected |

The owner approved one correction batch. No new callable or naming decision was
introduced. Prior phase reentrancy findings remain fixed and covered; no remaining
naming markers. Explicit HTML-ID patching predates the reviewed DOM baseline and
is outside this work. General source-subtree lifetime and ready/onStart remain
expressly deferred; this completes the approved first ownership slice, not all
of Macro 2 or the future bootstrap macro. No acceptance contract was modified.

Checks after correction: focused consumers/playground 4 passed; full pages 74
passed; ruff check src tests passed; git diff --check passed. DOM suite 128 passed
at closing revision f743e6c and no DOM changes followed. Fresh independent delta
review found no residual defects and independently ran consumer tests (3 passed,
both transports). Browser smoke after reload: Rebuild and Reset update status
and work; no console errors. The owner's earlier QA approval remains applicable;
there is no visual redesign or new interaction to approve.

Final disposition: one confirmed finding corrected, no residual findings, no
risk acceptance required. Independent reviewers were separate from the author;
first reviewed the complete integration scope, second only the correction delta.

## Finalization

Scanned phase rationale, reentrancy review and Final touch. No additional durable
lesson beyond the existing guide, ownership documentation and regression tests
clears the non-duplication bar. Quality stamp remains current; no residual findings.
