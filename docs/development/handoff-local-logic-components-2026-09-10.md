# Handoff: local logic, component handbook and parked API PoC

Date: 2026-09-10. Written at the owner's request before continuing after context
exhaustion. Read docs/context/README.md, decisions.md and open-work.md first.
This is a continuation checkpoint, not blanket authorization for deferred work.

## Completion update

**Laboratory presentation update, 2026-09-11:** the owner replaced the duplicated
snippet/complete-file presentation with code shown once. All teaching pages now
place Python above JavaScript, each with its live example on the left and code on
the right (stacked on narrow screens). JavaScript uses CodeMirror with Run/Reset;
lesson 10 edits the 3–4-line body, other lessons edit their existing modules.
The hosting assets own this laboratory, not the teaching recipes. Run replaces
only the selected JavaScript application; Reset restores the source and Data.
Readiness handshake prevents runs being lost during initial loading. Runner URLs
carry a source hash to invalidate stale browser code after rebuilds.

Verified: three teaching tests / 13 recipe pairs, desktop and narrow layout,
actual CodeMirror editing and execution, syntax-error recovery, Reset followed
by a working calculation, and full-module execution in lesson 1. All agents
have completed. No commit or publication was made.

**Subsequent owner correction, implemented:** the combined recipe was too large.
Lesson 10 now has four independent examples: the top-level reactive formula,
`passive/`, `inline/` and `controller/`. Each contains 3–4 statements; prose is in
the manifest, and the preview displays the actual function body with the complete
file in a collapsed disclosure. No headings, counters, layout, setters or startup
flags are carried into these examples. Fields start empty and user edits trigger
the providers. Each iframe supplies a separate application/Data; paths use the
builder root without adding a relative scope just for the example.

All three teaching tests pass, covering 13 Python/JavaScript pairs across ten
lessons, generated source fidelity and the 4-line limit for these examples.
Real-browser inputs verified reactive 10 → 14, passive 10 → 10 → 21, inline
10 → 14 and controller `Hello Ada` in both languages. Preview rebuilt; the agent
has completed its work. The earlier combined-recipe result below is superseded.

The lesson 10 action below is complete. Python and JavaScript now show two
independent Data scopes, `reactiveOrder` first and `passiveOrder` second.
The explanation distinguishes reactive inputs from passive/lazy reads of existing
local Data, with no remote resolver implied. The manifest and executable behavior
checks were updated; all three teaching tests passed (10 recipe pairs).

The preview was rebuilt and both language panels were checked in the browser:
price 5 → 7 changes the reactive total 10 → 14, while the passive total stays 10;
quantity 2 → 3 then makes both totals 21. Controller counts become 3 and 2,
respectively, and inline calculations match. No framework changes or commits
were made for this action. The implementation agent has finished.

The sections below preserve the checkpoint before this completed action.

## Original immediate next action — completed

The owner approved changing teaching lesson 10 to show the NORMAL case first:
quantity and price both reactive (^). Keep the current passive-price (=) case
as a separate example, and clearly distinguish "reactive data" and "lazy data".
Explain that = is a passive/lazy read of an existing value at execution time,
not a remote lazy resolver. Maintained code/docs are English; conversation Italian.

The last turn only read files; no edits for this change have been made yet.
Current lesson still uses quantity ^ and price = and is confusing to the owner.
Suggested delivery: two independent sections in the same lesson, with distinct
Data scopes; first both reactive, second price passive. Explain on each field
what triggers recalculation. This approach avoids adding an eleventh lesson.
Update both executable Python and JS recipes, their behavior checks, rebuild
preview and verify actual browser changes. Avoid introducing framework changes.

Files:
- docs/examples/teaching/10-local-logic/recipe.py
- docs/examples/teaching/10-local-logic/recipe.js
- docs/examples/teaching/manifest.json
- tests/test_teaching_examples.py
- tests/teaching_examples.mjs

Existing counts: 10 executable pairs; teaching tests explicitly expect 10.
Warning: a literal heading starting with == is treated as an expression! Use
"Inline expression (==)" rather than starting the display string with ==.

## Owner collaboration preferences

This conversation coordinates; use Sol for bounded implementation and review
its results. Be explicit about whether agents are working or idle. Do not end
with an implied promise of background work when none is running. Owner prefers
ending with a concrete question or an actually dispatched action. Do not ask
again about already approved actions. Keep defaults out of examples unless
teaching them. No commits or publication have been requested.

Workspace is the canonical Gramlot repository under Sviluppo. Preserve the large
pre-existing dirty tree (inspector, inputs, guide and other work). Do not reset it.
Historical files are evidence, not fresh authorizations. Server independence
remains required; optional contrib.fastapi is authorized.

## Agents

All agents completed their latest assignments; none is intentionally working:
- component_guide_francesco: historical internal task name only; delivered guide,
  then revised it. Never use the recipient name in public materials.
- implement_logical_data: implemented local blocks and later fixed inline scope.
- repair_branch_preparation: repaired insertion batching and controller reentry.
- audit_data_legacy: completed legacy exploration.

Use collaboration.list_agents for a current snapshot if needed. Agent findings
were reviewed and corrected, not accepted solely from test totals.

## Local logic: reviewed implementation

Relevant records:
- docs/development/logical-blocks-plan.md
- docs/development/data-services-design-audit.md
- docs/development/local-logic-review.md
- docs/source/reference/local-logic.rst

Approved owner contracts:
- dataSetter assigns explicit value including None/null; defaults only fill
  missing data (preserve null/false/zero/empty).
- All setters in the available branch precede defaults, explicitly requested
  pre-build logic, widget construction, then any post-build logic.
- dataFormula accepts a JS expression; dataController accepts a JS script.
- == is retained for inline attribute/parameter expressions, using named peers.
- ^ is reactive, = passive. No new default startup policy was approved: retain
  opt-in _on_start. Additional hook naming/scheduling remains open.
- dataSetter is exposed positionally in Python. data alias retained because its
  removal has not been explicitly approved. dataController keeps func keyword.

Implementation:
- js/dom/src/logic/expression.js: shared evaluation; inline expressions use a
  lazy lexical Proxy scope, with a non-strict factory and strict inner function.
  No hand-written JS dependency lexer or ReferenceError retry remains. Handles
  templates, object keys/shorthand, regex, arrow locals, typeof, global shadowing,
  real cycles and once-only effects.
- js/dom/src/logic/runtime.js: branch preparation and local providers.
- builder-base.js queues pending branches; builder-handler.js prepares them
  together at live flush before formula drain/render. Removed branches excluded;
  successful setters not replayed after retry. Rerender does not reseed Data.
- Formula removal cancels queued work and logical nodes are not view patches.
- Controller self-reentry gives a bounded diagnostic.
- src/gramlot/grammar/logic.py supplies AuthoringNode facade methods; generic
  Builders remains unmodified. Explicit None preserved on setter Source attrs.
- Legacy callable/named-function/function-string recipes remain compatible.

Review tests added:
- js/dom/tests/expression.test.js
- js/dom/tests/branch-preparation.test.js
- js/dom/tests/local-logic.test.js (including queued removal)
- tests/test_local_logic.py + tests/local_logic.mjs exercise actual Python TYTX
  and JS recipe startup/passive/reactive behavior.
- test_gramlot_builder.py checks func keyword and script-named input.

Last complete verification before lesson 10:
251 JS tests passed. Python 98 passed + 1 skipped excluding manual_cli; both
manual_cli tests separately passed with local-port access (100 total passed).
Component-guide integration passed. Resources rebuilt: 139 files.
After adding lesson 10: three teaching tests passed, including 10 recipe pairs.

RPC, FastAPI method registration, remote Source, broader scheduling and legacy
macros are NOT implemented by this local slice. The full logical-block plan is
not complete. Layout work is sequenced after logical blocks.

## Interactive lesson 10

Shows two editable numeric fields with updateOn=input, total from dataFormula,
controller message and run count, and inline == result. Setters intentionally
appear last to demonstrate pre-build initialization. Currently both Python/JS
versions initialize quantity 2, price 5, total 10, count 1. Browser verified price
7 leaves total 10, then quantity 3 gives total21, count2. User asked to make this
passive example SECOND because normal expectation is both fields recalculate.

Preview rebuild:
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview

Teaching verification:
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" .venv/bin/python -m pytest tests/test_teaching_examples.py -q

Resources refresh when runtime changes (not needed for recipe-only edits):
.venv/bin/python scripts/prepare_assets.py

## Professional English HTML component handbook

Owner rejected the first short Italian recipient-named guide. It was replaced
with twelve substantial English chapters (~3,578 words plus code), branded with
existing assets/gramlot-logo.png. The personal name was removed from maintained
content/examples. Do not revive old paths or names.

Deliverables:
- docs/guides/component-development.html (self-contained logo/CSS, responsive
  contents, copy-code buttons, print stylesheet)
- docs/guides/component-examples.zip (example files)
- docs/guides/gramlot-component-guide.zip (complete shareable archive, 23 files,
  ~2.34 MB, includes HTML, example zip, source examples and local references)
- docs/development/component-guide-content.md (source)
- scripts/build_component_guide.py (HTML + examples zip generator)
- docs/examples/components/component-guide/ (neutral example gnr-guidegreeting,
  collection component-guide, sample name Ada)

Complete ZIP was assembled separately using Python zipfile; rebuilding HTML
alone does not refresh the complete ZIP. If handbook changes, regenerate all
related outputs before sharing again. No files were sent externally.

Guide distinguishes current collection import/registration + Python declaration
from manifest automation. Manifest example under docs/examples/components/textbox
is a proof, not a finalized format; public Builders export attributes:null remains
an explicit limitation. Display/action greeting is not automatically a form input.

Verified guide: native event/reconnect cleanup, collection activation and ^
binding; Python declaration; HTML local links and zip integrity; no recipient
name; desktop/narrow layout and navigation. Twelve chapters, not a measured
exact twelve printed pages.

## Parked gramlot_api experiment

Owner explicitly parked it. Do not continue unless asked.
Source: docs/examples/gramlot-api-poc/, README contains scope and restart command.
Browser-only interface reads local OpenAPI3.0.3 and constructs forms with Gramlot;
navigation/result adapters use DOM. Node serves demo GET products/POST quote;
real requests verified. Disclosure tree is tag -> path -> method. CDN packaging,
custom-element public API, arbitrary schema support, nested bodies/null controls,
auth etc are not implemented. No publishing.

## Live local servers and browser tabs

Check availability rather than blindly starting duplicates:
- 127.0.0.1:64323 — teaching preview, original exec session 37220.
  Current lesson /lessons/10-local-logic/.
- 127.0.0.1:64324 — parked API PoC, node server exec session 6151.
- 127.0.0.1:64325 — docs HTTP server exec session 66460, directory docs;
  /guides/component-development.html.

Opening local listening ports needs sandbox escalation; already used safely.
Do not stop servers merely because work on their content is parked.
CUA persistent handles may survive: tab (API2), guideTab (3), logicTab (4),
debugBrowser id1. Get current inventory if handles stale. Use CUA for browser UI.
Do not use the voice-only screen capture tool. Mark deliverable tabs if needed.

## Other preserved architectural destination

FramePane must remain a convenient partly preassembled border container. Drawers,
bidirectional splitter dimensions, nested rounded-corner propagation, tab/border
containers remain recorded in drawer-legacy-audit.md and open-work.md.
Toolbar composition and authorization callbacks are deferred ideas. Events
core/legacy split is explicitly provisional (events-legacy-audit.md).
