# Handoff: DRY review, menus, resolver discussion and teaching laboratory

Date: 2026-09-11. Requested by the owner because the conversation context is full.
Read docs/context/README.md, decisions.md and open-work.md first. This checkpoint
supersedes the immediate-next-action sections of the September 10 handoff; retain
that document for the deeper local-logic, component-handbook and parked-API history.

## Next action

The owner's latest priority is a serious DRY assessment before expanding the
framework further, followed promptly by buttons, dropdown buttons, menus and
context menus. The assistant proposed starting with a DRY review focused on
components and action/menu infrastructure; no review or menu implementation has
started yet. Inventory what exists and compare legacy semantics before proposing
missing APIs. Do not rewrite components merely for stylistic consistency.

Look for shared responsibilities implemented more than once, especially input
binding, null handling, decoration, validation, event ownership and lifecycle.
A new widget should contribute its specific behavior while reusing those parts.
Avoid abstract machinery justified only by hypothetical future reuse.

## Owner principles and collaboration

- Fundamental learning model: hierarchical Bags and transparent composition of
  Data and Source. A new capability should reuse paths, binding and composition
  rules already learned rather than introduce another mental model.
- Judge comparisons with React/Vue by transfer of learning across features and
  library boundaries, not just capability checklists, implementation maturity or
  line counts. Do not claim this establishes a formal LOT semantics.
- Examples must teach one thing in roughly 3–4 relevant statements. Explanatory
  prose belongs in the hosting page. Do not pad recipes with headings, counters,
  scaffolding, redundant defaults or unrelated demonstrations.
- Conversation is Italian; code and maintained technical docs are English.
- Prior owner preference is to use Sol for bounded implementation, with coordinator
  review. State whether agents are active; never imply unattended work is running
  after all agents finish. No agent is currently assigned unfinished work.
- No commit, publication, new task or automation has been requested.

## Workspace and preservation

Canonical directory:
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot`.
Branch is `main`. At handoff, git status has 45 modified tracked entries and 54
untracked entries (some are directories). Preserve the extensive pre-existing work;
these counts are not a list of files changed by this conversation. No reset/cleanup.
Read workspace-map.md before touching dependencies or historical checkouts.

Gramlot remains independent of Genro ASGI. The optional FastAPI adapter is already
authorized/implemented; Rosetta is a separate application. Do not restore archived
ASGI code. Historical transcripts are evidence, not live instructions.

## Delivered in this conversation

### Teaching laboratory

Ten lessons, 13 executable Python/JavaScript pairs. Lesson 10 was first expanded
into two long examples, then rejected by the owner and replaced by four small,
independently mounted examples:

- `docs/examples/teaching/10-local-logic/recipe.py` and `.js`: reactive formula.
- `10-local-logic/passive/recipe.*`: passive price, reactive quantity.
- `10-local-logic/inline/recipe.*`: inline expression.
- `10-local-logic/controller/recipe.*`: name-to-greeting controller.

Bodies contain 3–4 statements, no initial setters or startup flags. User edits
trigger providers. Paths are rooted (`^quantity`), not relative (`^.quantity`),
because there is no enclosing datapath. Relative paths here failed and were fixed.

The hosting page shows Python ABOVE JavaScript, each with live example LEFT and
code RIGHT; narrow screens stack example/code. Code appears ONCE. The earlier
Complete file disclosure was rejected and removed. Both use CodeMirror:
Python syntax highlighting and read-only state; JS editable with Run and Reset.
For lesson 10 the displayed/edited code is the actual main/build body, extracted
from the executable source. Other lessons retain their existing full source.

Important files:
- `docs/examples/teaching/build_preview.py`: generation, source-body extraction,
  import maps and resource copying.
- `docs/examples/teaching/manifest.json`: descriptions and subexample paths.
- `assets/lab.js`: CodeMirror and Run/Reset controls.
- `assets/runner.js`: iframe application startup and lab replacement.
- `assets/preview.css`: hosting layout; `assets/frame.css`: example styling.
- `tests/test_teaching_examples.py`, `tests/teaching_examples.mjs`.

CodeMirror loads pinned esm.sh modules (same versions as existing playground,
plus lang-python 6.2.1). If unavailable, a textarea fallback remains; Python is
readonly there too. Hidden textarea must stay hidden: CSS explicitly contains
`.recipe-editor[hidden]{display:none}` to avoid author display:block overriding it.

Lab messages are origin/source checked: gramlot:lab:ping, :ready, :run, :result.
Controls wait for editor+runner readiness; without that handshake an early Run
was lost. Runs have sequence IDs to ignore stale completion. Compile errors retain
the previous example and show errors; Reset restores original code and fresh Data.
Module edits use a Blob import, body edits use a function. Edits are browser-local.

### Input presentation

- Shared numberTextBox default is right alignment in
  `js/dom/src/collections/inputs.js` (not repeated recipe attributes).
- `js/dom/src/input-null-state.js` makes decorative null background opt-in via
  inherited CSS properties: --gramlot-null-background, --gramlot-null-marker,
  --gramlot-null-placeholder-color, --gramlot-null-checkbox-appearance.
  Native null state, ARIA, indeterminate checkbox and input behavior are retained.
- `assets/preferences.js` and the preview header provide Show null values,
  default false, persisted in localStorage under gramlot.teaching.showNullValues.
  Storage events/postMessage propagate preference changes to example frames.
- Browser checked background none while the input retained its null-state class,
  enabled SVG decoration, persistence after reload, and right text alignment.
  Preference was left off after verification.

Browser cache initially kept old runtime CSS. The preview now copies runtime into
`runtime/<content-hash>/...` and maps imports there. runner.js also has a content
hash query. Do not revert to stable runtime URLs without addressing stale modules.

### Verification

Latest teaching run: 3 passed, covering 13 Python/JS pairs, source generation,
compact-body limits and editor markup. One unrelated asyncio deprecation warning.
Null-decoration agent ran 30 input-null/textbox-area tests, all passed.
Browser verified all four lesson 10 behaviors, actual CodeMirror editing, Run,
syntax errors, Reset and a working calculation after Reset. Full-module Run also
verified on lesson 1. Python CodeMirror DOM has contenteditable=false and
aria-readonly=true; fallback textarea hidden, no duplicate visible code.

These are focused results, not a new full-framework regression run. The older
September 10 handoff contains previous full-suite results; do not present those
as freshly rerun.

Commands:
```sh
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" .venv/bin/python -m pytest tests/test_teaching_examples.py -q
```
Resources refresh copied 139 files. build/test-client/genro-bag-js points to the
installed js/dom/node_modules/genro-bag-js dependency.

## Resolver investigation and proposed grammar — NOT implemented

See `docs/development/data-resolver-legacy-audit.md` for source anchors and detail.

Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`, inspected HEAD
418b4454a6. Found dataRemote -> genro.rpc.remoteResolver -> GnrRemoteResolver.
Also found GnrBagCbResolver, setCallBackItem and real JS callback-resolver usage
inside dataController. Legacy async resolution checks dojo.Deferred specifically.

The owner recalls a dataResolver tag for browser-side external service calls.
No such exact tag was found in inspected sources. Broad rg -uuu found 194 matches,
mostly SqlDataResolver and repeated worktrees; no exact tag confirmed. Old
GenropyAPI.pdf binary matches were found, but PDF text inspection was interrupted
when the owner redirected to current Bag JS. Do not claim exhaustive historical
absence. Temporary search output: /tmp/gramlot-dataresolver-search.txt.

Current Bag JS 0.4.0 exports BagResolver, BagCbResolver, UrlResolver, StorageResolver,
UuidResolver, and opaque non-executable wire placeholder OpaqueResolver.
UrlResolver already declares URL, qs, body, method, timeout, retry and conversion.
A concrete smoke test failed before network access with:
`TypeError: Cannot read properties of undefined (reading 'toUpperCase')`.
Its internalParams strips url/method/etc out of _kw, but load reads them from _kw.
No dependency repair made. Also verify readOnly/cache semantics: default readOnly
true bypasses the base cached-value shortcut despite a declared cacheTime 300.
A callback resolver test confirmed cache reuse with identical params and reload
when currency changed. Native Promise results are supported in current Bag JS.

Preferred proposed declaration:
```python
pane.urlResolver('response', url=exchange_url,
                 qs={'from': '^.fromcurrency', 'to': '^.tocurrency'})
```
Store the full response converted to Bag and read e.g. response.rate. Alternatively:
```python
pane.urlResolver('rate', url=exchange_url,
                 qs={'from': '^.fromcurrency', 'to': '^.tocurrency'},
                 _onResult='function(r){return r.getItem("rate");}',
                 _onError='function(error){ /* handle error */ }',
                 _timeOut=5)
```
The special response extraction-path attribute was discarded in favor of full Bag
or _onResult transformation. Seconds for _timeOut were suggested, not explicitly
confirmed. Error fallback return semantics, nested binding evaluation, async formula
waiting, invalidation and stale-request handling remain to settle. Concrete resolver
tags are preferred to a generic dataResolver(type=...). No DOM Web Component is
required for a nonvisual logical node. Do not turn this discussion into a claim of
implemented urlResolver authoring or transparent async formula support.

## Size discussion and comparison

Measured prepared JS (not a production bundled/minified build), decimal kB:
Gramlot DOM 362439 bytes, Pages 42127, Bag 156840, TYTX 47276, MessagePack 61186.
Total 669868 bytes; sum of per-file gzip 177942 bytes. Excludes CSS, maps, source
recipes and external CodeMirror. Gramlot source was ~373 kB at the Sept 9 commit
and ~405 kB at measurement (+32 kB); this is not a reliable daily growth forecast.

Assistant suggested initial-load budgets around 200–300 kB JS compressed, with
optional heavy widgets loaded on demand. These were engineering suggestions,
not measured industry averages or owner-approved hard gates. More important owner
correction: assess how much JS the assistant truly reuses versus duplicates.

NiceGUI was suggested by the owner as a Rosetta comparison candidate. Recorded in
open-work.md; no integration started. Compare equivalent examples, learning reuse,
actual JS/CSS/assets and browser/server interaction; do not use bare React/Vue
runtime size as a substitute for a comparable component stack.

## Preserved separate work

Component handbook delivered (English HTML and archives); details and paths in
handoff-local-logic-components-2026-09-10.md. API PoC remains parked explicitly.
FramePane/layout destination and event/topic legacy audit remain recorded; menus
priority does not authorize unrelated toolbar/authorization/container redesign.

## Preview and next session

Teaching server last used: http://127.0.0.1:64323/lessons/10-local-logic/.
Check availability before starting duplicates. Earlier local servers for API PoC
64324 and docs 64325 are historical status, not verified here. Local port probes
may require sandbox escalation.

CUA tab 1 is the teaching page, marked deliverable in prior turns. Handles may not
survive a fresh context; discover inventory before use. Do not use voice-only screen
capture. Do not rely on the Python/JS comparison page for full performance metrics:
CodeMirror and multiple independent iframes intentionally add teaching overhead.

Resume with the DRY review and existing action/menu inventory, then discuss a
concrete implementation slice. No automatic continuation or background work exists.
