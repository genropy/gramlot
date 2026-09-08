# Context: codex/hello-world
Parent: develop
Mode: interactive
Channel: in-chat
Must not break: Python recipes and the DOM-builder bootstrap decision; no Mako.
Must not break: source-node callback context, relative data paths and legacy authoring semantics.
Must not break: independent page instances, single rooted data Bag and distinct SourceBag.
Must not break: gallery, inspector and playground; JSON and MessagePack typed transport.
Must not break: mobile accessibility and root-only physical WebSocket topology.

## Objective

Complete the bounded legacy investigation needed to reorganize the current GUI
runtime without losing its authoring model. Deliver an evidence-backed contract
and ownership proposal; do not implement the runtime in this macro.

## Work Plan

- [x] **Phase 1**: Establish the runtime compatibility contract
  > Done: 13 audit scenarios, 29 verified evidence references; tests and lint pass.
  > Files: docs/architecture/legacy-lifecycle-audit.md, docs/architecture/runtime-legacy-contract.md, docs/architecture/runtime-reorganization-plan.md, docs/architecture/runtime-contract.json, docs/gui-2.0-guide.md, tests/test_runtime_contract.py, .phased/active/runtime-contract/plan.md, .phased/active/runtime-contract/notes.md
  > Verified: owner accepted the organization for implementation trial; no runtime functionality claimed.
  - Run: fable / high
  - Pattern: `docs/architecture/legacy-lifecycle-audit.md`; `tests/test_typed_envelope.py:TestTypedEnvelope` and sibling `genro-dom-js/tests/actions.test.js` for later behavioral fixtures.
  - Files: `docs/architecture/legacy-lifecycle-audit.md`, `docs/architecture/runtime-legacy-contract.md`, `docs/architecture/runtime-reorganization-plan.md`, new `docs/architecture/runtime-contract.json`, `docs/gui-2.0-guide.md`, new `tests/test_runtime_contract.py`.
  - Decisions: keep the agreed genro/source-node mental model; use modern modules, DOM-builder HTML and capability-driven input. No implementation changes, dependencies or fabricated page registry. Concrete new public signatures remain proposals for owner review.
  - Details: record the starting revisions and uncommitted work in every relevant checkout; trace bootstrap/readiness, callback context, GET/SET/PUT/FIRE, method-versus-DOM connections, source deletion, nodeId reuse, delayed callbacks, page close, nested frames and mobile handles/drag cancellation. Compare actual current code with actual legacy call sites. For each scenario record legacy evidence, current evidence, expected behavior, disposition and a reproducible verification recipe. Separate witnessed behavior from inference. Produce an ASCII ownership/module tree rooted at genro and classify every divergence by a concrete reason. Update the guide with approved conventions only. Provide the entry/exit and remaining decisions for Macro 2.
  - Done: the plan's tests for this phase, copied into the test tree, pass: `python -m pytest tests/test_runtime_contract.py`; `ruff check tests/test_runtime_contract.py` passes. Each scenario has both evidence sets, expected outcome, disposition and verification steps. All cited files and symbols are checked manually against the recorded revisions. No production source change is included in the phase delta.
  - Verify: now — review the genro ownership tree and the compatibility matrix; confirm that the authoring model is familiar and that each proposed difference has a concrete reason.

## Contract-test boundary

The phase tests verify the completeness and traceability of this research
deliverable. They do NOT prove that pending runtime features work. Runtime
conformance tests are authored with the next implementation plan using the
accepted scenarios. No red future-feature test is disguised as a passing audit.

The matrix uses scenario IDs from the attached test; each entry has `legacy`,
`current`, `expected`, `disposition` and `verification`. Evidence entries have
`path`, `symbol`, `revision` and `finding`; paths are relative to named repository
roots in `repositories`. Dispositions: preserve, adapt, defer. Deferred items
must state the dependency in `reason`; adapted items explain the benefit there.

## Starting state and scope

Anchor: existing genro-pages checkout under this task's worktrees directory.
Initial HEAD: 9b009125d0b10507389196914f65e9183c4b1a3c.
Parent develop: e305378f7e59d6aeec7519283551173cdd33803a.
Existing uncommitted changes predate the workflow in pages and sibling libraries.
The plan commit includes .phased only. Do not stage all files, reset, stash or
fold unrelated pre-workflow changes into phase commits. Before execution, inspect
and preserve the exact starting diff; any baseline checkpoint is a separate,
explicitly reviewed operation, never an implicit consequence of this plan.

Sibling libraries are read-only in this macro. Their implementation will need
repository-specific commits/plans; do not vendor them into pages or claim a
single pages commit captures their state. ASGI and mailbox decisions must be
re-read before designing their integration, not inferred from old drafts.

Only Macro 1 is executable here. The roadmap records later boundaries without
pretending that unresolved API or transport choices are ready implementation.

## Quality check

> Quality check: 2026-09-06T18:16:17.223969+00:00 — commit 69ba533 — review extended, QA done, findings 3 confirmed, 0 dismissed, final touch 3 corrections

Residual: one RPC evidence anchor needs its full signature and correct line; see notes.md. Not a clean consolidation gate.

> Quality check: 2026-09-06T18:17:50.327872+00:00 — commit a89dc53 — review extended, QA done, findings 3 confirmed, 0 dismissed, final touch 4 corrections

Supersedes the diagnostic result above: the residual RPC anchor is corrected
and independently verified. No outstanding findings within this workflow.

> Quality check: 2026-09-06T18:34:57.809759+00:00 — commit 3087485 — review extended, QA done, findings 2 confirmed, 0 dismissed, final touch 2 corrections

Checkpoint review extension: both implementation defects resolved and independently
verified; 68 Python and 128 DOM tests pass. Depends on genro-dom-js 358ca59 plus
the existing local sibling development state. Earlier documentary review remains
valid for its recorded scope. No outstanding confirmed findings.
