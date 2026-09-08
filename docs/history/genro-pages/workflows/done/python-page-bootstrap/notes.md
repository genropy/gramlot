
## Phase 1

Execution approved in chat. Implemented the initial PageDocument composition,
startup Bag, page client descriptors, shell stylesheet extraction and generic
bootstrap imports. Contract skeletons copied unchanged; bodies still pending.

Dependency blocker found on first integration run: HtmlBuilder declares
`details` with `sub_tags='summary[0:1]'` in
`../genro-builders/src/genro_builders/contrib/html/html5_elements.py:126`.
Consequently the existing shell's `details > summary + pre` cannot be expressed:
`ValueError: 'pre' not allowed as child of 'details'` from PageDocument.build_body.
`tests/test_hello_world.py`: 4 passed, 3 failed (all initial HTML requests).
No retry, bypass, alternate renderer or sibling edit attempted.

The plan explicitly requires reporting missing builder capabilities. Ask the
owner to authorize a bounded genro-builders correction with its own regression
test (preserving summary cardinality and allowing flow content), then resume
this phase. Existing sibling changes must be preserved. Current implementation
is incomplete: startup requests fail until the grammar is corrected; the demo
has not been restarted. Next: settle the dependency correction; finish six
contract bodies, adapt runtime_consumers fixtures to real generated HTML, run
full suites and browser checks, update docs, and request the authored human QA.

### Continuation after issue #39

Owner requested proceeding with the remaining work while the builder issue is
open. No dependency fix was authorized or attempted. Added implementations for
the six immutable contract skeletons, real generated-shell consumption in the
runtime ownership fixture, a Node bootstrap/typed-data fixture and the pages
asset alias in the test loader. Added documentation with explicit pending status.
Typed the optional client_setup descriptor to resolve the earlier mypy advisory.

Validation: 70 existing tests passed, with the 4 existing full-bootstrap cases
explicitly deselected because of #39; the six new full-document contracts have
not been executed while the known prerequisite is absent. DOM suite: 128 passed.
Ruff and JavaScript syntax checks passed. An isolated generated-head check parsed
its actual HTML and decoded startup through JS TYTX, preserving hostile closing
script text, Unicode, date, number and boolean, with no injected DOM. The first
version of that standalone check omitted the Bag module registration; adding
its side-effect import (also in the new fixture) made it pass. Production
bootstrap already imports Application and its Bag dependency.

Next: after #39 lands, run all six contracts and the complete pages suite,
resolve any newly exposed integration defects, exercise the browser, and
complete the authored human Verify check. No completion or browser success is
claimed by this checkpoint.


### Dependency resolved and full integration verified

Owner reported #38/#39 closed. #39 is d98b737, included in builders main
c6e4684 (0.23.2); dependency worktree advanced from fe28309 by fast-forward,
preserving its existing SourceBag tracked/untracked edits. #38 is NOT_PLANNED:
core confirms a downstream pages data-element mixin suffices; no RPC declaration
or transport was added in this phase.

Full test run exposed two fixture defects: re-registering the same application
on multiple servers, fixed by reusing application.server; menu endpoint decoded
through generic from_tytx instead of the existing Bag.from_tytx pattern, fixed
without changing any contract or assertion. Full result: 80 passed. Prior DOM
suite: 128 passed, unchanged DOM source. Browser: restarted local server at
8010 with updated Python sources; laboratory loaded, rebuild clicked, switched
to MessagePack, Ctrl+Shift+D opened actual inspector, navigated through menu to
Hello World and textBox, opened the XML disclosure. No application error was
shown; Node startup contracts explicitly capture console.error and assert none.
The CUA surface used did not provide a separate browser-console log capture.

Remaining: owner's authored visual/interaction acceptance and naming review,
then close-phase. No ready/server identity/RPC additions.

### Phase closure

Owner confirmed the browser check with "ok va", then accepted all proposed
names. Removed only naming markers. Closing gate reran all 80 pages tests and
128 DOM tests successfully, with clean ruff and verified immutable contract
fields, skeleton names and wf:contract lines. The textBox report was resolved
by reloading a stale document; real typing plus Tab verified the second field's
independent write-back. No code correction was required for that report.

The implementation phase is closed. Workflow quality-check and finalization
remain separate steps; no merge, push or history consolidation performed.

## Final touch

Reviewed revision: 961dca1; base e1b0d6f. Independent read-only Light review
by bootstrap_light_review. User QA done and names accepted; no markers remain.
Owner approved the following batch. Correction revision: 3d75ea7.

| Finding and evidence | Root cause | Fix and affected consumers | Verification | Outcome |
|---|---|---|---|---|
| P2: pyproject permitted builders 0.23.0/0.23.1; PageDocument adds details/pre, rejected before d98b737 | Required minimum not raised after #39 | Require builders >=0.23.2; package installation consumers | Parse dependency requirement; bootstrap contracts | Corrected; independent verification clean |
| Guide and roadmap said planned/pending visual acceptance | Closure status not propagated | Update only bootstrap status, preserving later ASGI/RPC boundaries | Compare against closed phase and user QA | Corrected; independent verification clean |

Coverage: Python document, safe inert TYTX, registered client descriptors,
menu encoding, JSON/MessagePack and asynchronous ownership guards; dependency
builders c6e4684 plus existing SourceBag edits, DOM f743e6c. The transport-menu
completion race is unchanged baseline, outside this correction; no new runtime
regression confirmed. Broader RPC, registered identity, source-subtree hooks and
root/iframe transport remain future work. The separately requested ASGI 0.43.0
browser proof is suspended by the owner and not part of this quality verdict.

Focused verification by fresh read-only bootstrap_correction_verify reviewed
961dca1..3d75ea7 and the affected builders dependency: no residual findings.
Checks actually run for this batch: six bootstrap contracts passed, ruff clean;
parsed requirement excludes 0.23.0/0.23.1 and accepts 0.23.2. Commit hook mypy
reported no issues in 37 source files. Full 80 pages / 128 DOM phase evidence
remains applicable; correction changes metadata/docs only, so prior accepted
human QA was retained without requiring a repeat. QA worksheet was shown at
/tmp/python-page-bootstrap-qa.html. No naming markers remain.

Quality outcome: 2 confirmed findings resolved (one runtime dependency and one
closure-documentation inconsistency), no residual findings within reviewed scope.
Reviewed revision 961dca1, correction/stamp target 3d75ea7. Historical inspection
notes about pre-fix dependency failures remain as history, not current blockers.
