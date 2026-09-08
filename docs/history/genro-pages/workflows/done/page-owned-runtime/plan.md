# Context: codex/hello-world
Parent: develop
Mode: interactive
Channel: in-chat
Must not break: Python recipe -> typed SourceBag -> client DOM for JSON and MessagePack.
Must not break: independent rooted data Bags, source-node recipe context and relative paths.
Must not break: existing gallery, playground, inspector shortcut and native/component event behavior.
Must not break: delayed/lazy readiness stays distinct; no invented ASGI identity or root/iframe transport contract.

## Objective

Give the current page Application an explicit, idempotent disposal boundary and
use it in the existing laboratory and inspector. Keep readable data/source
references after disposal for diagnosis; do not add speculative service facades.

## Work Plan

- [x] **Phase 1**: Dispose a page runtime without affecting its peers
  > In execution since 2026-09-06T18:45:45.742029+00:00
  - Run: opus / high
  - Pattern: sibling `genro-dom-js/src/services/topics.js:TopicService.subscribe`; `src/genro_pages/resources/shortcuts.js:Shortcuts.dispose`; `tests/test_inspector.py` for Python-launched JS checks.
  - Files: sibling `genro-dom-js/src/application.js`, `src/builder-handler.js`, `src/builder-base.js`, `src/services/topics.js`; new pages `tests/test_runtime_disposal.py` and its JS fixture; focused sibling tests if needed.
  - Decisions: public entry is `genro.dispose()`; calling it twice is safe. Disposal detaches owned DOM listeners, Bag subscriptions and topic listeners and clears queued work. Retained Bag/source references remain readable. It must not dispose another runtime or shared external Bag. Do not introduce ready/onStart semantics, macro compilation, generic method interception or transport APIs.
  - Details: first record and review the sibling's pre-existing dirty baseline separately from this change. Trace actual data/source subscriptions and queued rendering. Implement teardown at their existing owners, including removing only owned DOM content without destroying a caller-owned host or replacement. Keep child runtimes independently disposable. Pending callbacks under current runtime ownership cannot deliver after disposal; arbitrary author-created browser timers are outside that ownership contract. Preserve current construction entry points.
  - Done: the plan's tests for this phase, copied into the test tree with skeleton bodies implemented, pass with `PYTHONPATH=src:../genro-builders/src:../genro-bag/src:../genro-tytx/src python -m pytest tests/test_runtime_disposal.py`; `ruff check tests/test_runtime_disposal.py` passes. Run sibling `npm test`. Demonstrate two live instances, repeated disposal, stale DOM events, retained Bag/source mutations and silent removed subscriptions. No callback-count test may rely solely on private registry sizes.

  > Done: 2026-09-06 — idempotent page disposal implemented; 3 ownership contracts, full pages suite (71 tests), ruff and DOM suite (128 tests) pass. Contract names/comments and authored fields verified unchanged.
  > Files: genro-dom-js/src/application.js, src/builder-handler.js, src/builder-base.js, src/services/topics.js, src/target-wrapper.js; genro-pages/tests/test_runtime_disposal.py, tests/runtime_disposal.mjs; workflow plan.md and notes.md.
  > Review: Read-only review found component-controller and in-flight-render reentrancy gaps; both fixed and covered by behavioral regressions. DOM dependency commit 4ccf4f2; prior baseline checkpoint 3ef702a. Naming accepted by owner.
  > Verify: Automated checks cover this phase; no manual UI check required. Consumer integration remains Phase 2.

- [x] **Phase 2**: Make laboratory and inspector use page ownership
  - Run: opus / medium
  - Pattern: `src/genro_pages/resources/inspector.js:mountInspector`, `src/genro_pages/resources/lab-session.js:LabSession.reset`; `tests/inspector.mjs` and `tests/playground.mjs` actual Python/TYTX fixtures.
  - Files: `src/genro_pages/resources/bootstrap.js`, `inspector.js`, `lab-session.js`, `playground.js`; new `dev.js` only if needed for the real developer-tool owner; `tests/inspector.mjs`, `tests/playground.mjs`, new `tests/test_runtime_consumers.py` and fixture; `docs/gui-2.0-guide.md`, `docs/architecture/runtime-reorganization-plan.md`.
  - Decisions: developer-tool ownership is exposed through `genro.dev`; preserve existing mount helpers as compatibility entry points. No invented public methods beyond the approved dispose entry are required by this plan. Page teardown closes its inspector/shortcut and experiment; experiment reset only closes the old experiment. Keep Ctrl+Shift+D and recipe-authored controls. Use existing visual design. No global singleton service.
  - Details: replace partial cleanup paths with the Phase 1 disposal contract. Register real consumers with their page owner; do not introduce an abstract plugin framework. Ensure asynchronous bootstrap completion cannot mount tools onto a replaced/disposed page. Retain the latest instance locally during awaits rather than relying on a changing window.genro. Update documentation to distinguish implemented ownership from deferred APIs.
  - Done: the plan's tests for this phase, copied into the test tree with skeleton bodies implemented, pass. Run `PYTHONPATH=src:../genro-builders/src:../genro-bag/src:../genro-tytx/src python -m pytest tests/` and `ruff check src tests`, plus sibling `npm test`. Fixtures cover repeated reset, inspector remount, page replacement, shortcut disposal and late async completion, through real Python/TYTX recipes for both supported transports where applicable. Existing nested-tab and inspector-remount regressions stay green.
  - Verify: now — use the laboratory and inspector after repeated rebuilds and a transport change; confirm the familiar interaction remains clear and no visible UI redesign was introduced.
  > Done: 2026-09-06 — page-owned inspector and laboratory implemented; full pages suite 74 passed, DOM suite 128 passed, ruff check src tests passed. Contract fields and skeleton names/comments unchanged.
  > Files: genro-pages/src/genro_pages/resources/bootstrap.js, inspector.js, lab-session.js, playground.js, dev.js; tests/test_runtime_consumers.py, tests/runtime_consumers.mjs; docs/gui-2.0-guide.md, docs/architecture/runtime-reorganization-plan.md; workflow plan.md and notes.md; genro-dom-js/src/application.js.
  > Verify: now — accepted by the owner ("sembra ok") after browser checks of repeated rebuilds, Ctrl+Shift+D and MessagePack. No redesign introduced.
  > Review: Naming accepted. Dependency genro-dom-js f743e6c; pages implementation checkpoint af3e883. Server lifecycle, general source-subtree cleanup and readiness remain outside this slice.


## Scope and implementation boundaries

This is the approved first implementation slice of Macro 2, not a claim of
complete legacy source-node lifecycle parity. Recursive page-owned runtime
cleanup is included; arbitrary source-subtree lifetime hooks, legacy connect
adapters and exact immediate-hook readiness are still future planning decisions.
No empty genro.src/dom/wdg/rpc services are added merely to match the diagram.

The next bootstrap macro consumes stable ownership and disposal. The recipe
compatibility macro consumes source context preserved here. Mobile pointer
behavior and root-only physical WebSocket topology remain constraints, without
implementation in this slice. Pure Bag/TYTX libraries stay independent.

## Repository and baseline discipline

Plan anchor is the existing pages worktree. Starting pages revision:
833b188b2818eeaa26e785210a8b8b4691e34326 (clean). DOM revision includes 358ca59
plus pre-existing uncommitted work; do not silently absorb or overwrite it.
Resolve that baseline at the execution gate before any implementation commit.
Changes belong in their own repositories, never vendored. This coordinated
slice requires a code commit per affected repository and a phase-closing plan
commit in pages; record dependency commit IDs in notes. No merge, push or
release is authorized. Preserve prior commits on the adopted branch.

## Contract tests

The attached skeletons fix observable behavior and test names, not private
cleanup signatures. Their red bodies must become real JS integration checks
launched by pytest, following existing tests; no skipped or tautological tests.
The only new public entry fixed in Phase 1 is dispose(). Phase 2 exposes the
real tool owner at genro.dev, not a speculative namespace. Report a costly API
ambiguity at the phase gate before implementing it.

## Quality check

> Quality check: 2026-09-06T19:17:37.737872+00:00 — commit 2789431 — review light, QA done, findings 1 confirmed, 0 dismissed, final touch 1 correction

One confirmed finding corrected and independently verified; no residual findings.
Scope and dependency revisions are recorded under Final touch in notes.md.
