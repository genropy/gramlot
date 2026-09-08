## Phase 1

Execution approved in chat. Source inspection only. Production worktrees are
unchanged against initial tracked diffs and untracked source hashes, preserved
in temp/runtime-contract-baseline (not committed).

The named architecture documents and guide were previously untracked. This
phase tracks these related documents with the audit additions; earlier text is
not claimed as newly authored. Other pre-workflow changes remain unstaged.

Validation: 13 audit contract tests passed; Ruff clean; 29 file hashes and symbol
references checked; contract test copy byte-identical to plan. No runtime or
physical-device validation is claimed. Initial matrix test was red as expected.
Two verification commands needed path corrections before successful reruns;
these were command-location errors, not changed tests or runtime fixes.

Read-only mobile review confirmed legacy row handles, source-bound drop
callbacks and modern pointer-identity/cancellation gaps. These become future
conformance cases; no components were edited. Public API signatures remain
proposals for the next planning gate. Matrix dispositions await owner review.

Baseline revisions:
- genro-pages: 9f0c0bf4026d1f188b8a91d365bbd8be55889326 (working tree changes recorded separately)
- genro-dom-js: e5540e0ca5baa7d18cfdd18c9b416a501ef5b99a (working tree changes recorded separately)
- genro-bag-js: 005b01d8311c433ee5a8859b336ee9bcd49daba4 (working tree changes recorded separately)
- genro-builders: fe28309620caf3615cbe476601dd65b1587f73c1 (working tree changes recorded separately)
- genro-bag: 1b13b1ef15f8caa772275e5329a7e033af11bab4 (working tree changes recorded separately)

Closure: owner said "proviamo a vedere se regge", accepting the proposal for an implementation trial. Re-ran 13 tests and lint, checked evidence hashes/symbols and unchanged contract blocks/copies. No naming markers or new production callables. This closes the audit, not the implementation.

## Final touch

Reviewed revision: 90ab79d (base 9f0c0bf). Review depth: extended, independent
read-only reviewer. Human QA: done, organization accepted for implementation
trial. No naming markers. Correction revision: this final-touch commit.

| Finding and evidence | Root cause | Correction and consumers | Verification | Outcome |
| --- | --- | --- | --- | --- |
| Readiness matrix implied onBuilt completion before startup, including lazy children | Scheduling conflated with callback completion | Separate initial construction, delayed providers and lazy lifecycles; Macro 2 must settle exact immediate-hook ordering | Read genro_src onBuilt timeout and gnrdomsource lazy visibility gate; audit tests | Confirmed, corrected; independent delta verification pending |
| Typed-transport legacy evidence pointed only at fireItem | Irrelevant evidence for serialization | Cite fromXmlDoc, clsdict and RPC resultHandler; typed-transport consumer | Verify symbols and file hashes | Confirmed, corrected; independent delta verification pending |
| Documents still said pending review after acceptance | Status not synchronized with owner response | Record acceptance for trial, not public signatures or timing | Inspect document statuses | Confirmed, corrected; independent delta verification pending |

Owner approved all three corrections in one batch. No source code or immutable
plan contract fields/test copies changed. Checks: 13 audit tests pass, Ruff clean,
33 evidence references checked for hashes and symbols. Runtime, physical-device
and live WebSocket behavior remain outside this documentary workflow.

Independent delta verification: 90ab79d..69ba533. Readiness and acceptance
status resolved; typed transport substantiated, but its RPC evidence anchor
remains imprecise: generic resultHandler matches a resolver wrapper at line 101.
The intended signature is resultHandler: function(response, ioArgs, currentAttr)
at line 596, with envelope.fromXmlDoc at 602. This is one residual citation
defect, not a runtime or contract failure. No second correction batch applied.
Close-out is diagnostic, not clean; request a bounded citation correction.

## Authorized residual correction

Owner explicitly approved the bounded RPC citation correction after the
independent delta review. Replaced the ambiguous symbol with the unique full
resultHandler(response, ioArgs, currentAttr) signature at line 596. Verified
that its body decodes envelope.fromXmlDoc(response, genro.clsdict); source hash
is unchanged. No contract semantics or production files changed.

Independent verification of 67cb225..a89dc53 confirms the full signature,
line 596, decoding call and recorded hash. Residual citation defect resolved.
13 audit contract tests and Ruff pass after the correction. Extended review
findings: all three original findings resolved, plus the authorized residual
anchor correction; none outstanding. Coverage remains documentary only.

## Checkpoint review — 39e634c

Owner requested extended review of the previously uncommitted GUI checkpoint,
range 75d1898..39e634c. Source state unchanged during review. Independent
reviewer inspected actual diff and current sibling dependencies.

Validation: with documented PYTHONPATH=src:../genro-builders/src:../genro-bag/src:../genro-tytx/src,
68 Python tests pass; sibling genro-dom-js npm test: 128 pass; Ruff src/tests
clean. Initial PYTHONPATH=src run used incompatible installed/original packages
and failed 50 tests; attributed to environment, not accepted as code regression.

Confirmed findings (correction proposal pending):
- P2 nested gnr-set crosses preview Application boundary. Real tab click
  writes experiment.page=second into both inner and outer data roots.
  application.js consumes input/change/topics but not gnr-set propagation.
  Add real nested-widget regression coverage and ownership boundary handling.
- P2 inspector dispose reuses a host carrying old Application listeners.
  Disposing then mounting another inspector leaves the old Application receiving
  gnr-set and mutating its old data. Give each inspector a removable private
  mount or remove delegated listeners explicitly; test repeated remounts.

These are observed implementation defects, not future feature requests. A
concurrent-bootstrap race was not reproduced and is not a confirmed finding.
Documentary QA approval is not a new browser/mobile QA pass for this checkpoint.
No clean finalization claim applies to the checkpoint until findings are resolved.

## Checkpoint final touch

Reviewed revision: 39e634c (base 75d1898), findings recorded at b62c99a.
Owner approved both fixes together. Correction revision: this commit in pages;
dependency correction genro-dom-js 358ca59 (only one line staged, unrelated
existing library changes preserved).

| Root cause | Correction | Verification | Outcome |
| --- | --- | --- | --- |
| gnr-set bubbled past its owning Application | Stop propagation at the Application command boundary | Python/TYTX playground test clicks a real inner tab and asserts outer experiment.page is absent | Fixed, independent verification pending |
| Inspector reused a host with stale Application listeners | Private removable mount, mount-scoped queries and idempotent disposal | Remount real inspector, select a tree leaf, assert old data unchanged; dispose old instance again and retain replacement | Fixed, independent verification pending |

Both regression tests failed before fixes. After fixes: 68 Python integration
tests, 128 DOM tests, Ruff src/tests pass. Python test environment uses documented
sibling source PYTHONPATH. No new public API, no broad lifecycle implementation,
no dependency-version changes. The audit JSON file hashes describe the earlier
inspected snapshot; the Application hash now intentionally differs by this fix.

Checkpoint correction verification: fresh reviewer checked pages
b62c99a..3087485 and DOM358ca59; independently reran the two focused Python
regressions (2 passed). Both defects resolved, no residual within the reviewed
scope. This does not establish general Application disposal or garbage collection.
Full checkpoint review and correction evidence now covers the previously
uncommitted pages implementation; sibling uncommitted work remains external.

## Finalization

Owner selected commit-only archival: preserve history, branch and worktree;
no squash, merge or push. Quality stamp at 068832b is current and has no
outstanding confirmed findings. Pages working tree was clean before archival.

Durable-lesson scan covered phase rationale and both final-touch reviews.
Readiness versus delayed/lazy execution is already recorded in the architecture
audit; per-instance event and mount ownership are expressed in the regression
tests and ownership documentation. No additional knowledge entry was needed.

Macro 2 remains to be planned in this conversation. The existing sibling
development work is not consolidated or published by this archival operation.
