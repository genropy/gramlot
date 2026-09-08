# Fresh-session handoff: Pages and DOM JS coordination

Version: 1.0
Last updated: 2026-09-08
Status: handoff of verified work and recorded owner directions; proposed next steps require review.

## Mission and immediate scope

Continue as `pages`, coordinator for the GUI, across genro-pages and genro-dom-js.
The owner wants a modern replacement for Genropy GUI that preserves useful authoring
ideas, not an indiscriminate legacy port. Keep the running gallery usable while
consolidating its foundations. The immediate unfinished topic is one organic
Builders update, coordinated with the standalone DOM runtime and Pages integration.
Do not resume widget expansion or redesign routing before restoring this context.

This handoff does not authorize a merge, push, release, new agent/session, or a
particular resolution of open naming/ownership decisions. The owner prefers to
start any separate Claude session himself from a supplied prompt.

## Start here: actual checkouts

Canonical Pages repository:
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages`

- Branch: `codex/hello-world`.
- HEAD: `25a8f9bfb3398eca85c0127ecef8733935dbf7a5`.
- Both pre-commit and pre-push hooks exist.
- Uncommitted tracked changes at handoff: `pyproject.toml`,
  `src/genro_pages/page_document.py`, `docs/development-checkout.md`,
  `docs/dependency-consolidation.md`.
- These are the dependency alignment and browser import-map fix described below.
  Preserve them; they have not been committed.
- This handoff is in ignored `temp/`; it is not a published architecture decision.

DOM experimental source worktree:
`/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js`

- Branch: `codex/python-js-alignment`.
- HEAD: `eaaa0ac0a582cc8f9abada1cdddf699cd0e66bbc`; clean at handoff.
- Remote: `git@github.com:genropy/genro-dom-js.git`.
- Contains the runtime used by the prototype, but is not a released artifact.

Canonical DOM repository:
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-dom-js`

- Branch `main`, HEAD `2d8395698791b34e6db1a9c9a42552ff28b0bdc4`.
- Untracked `PATTERNS_DISABLED` and `examples/gallery.html`; preserve them.
- Do not confuse this checkout with the experimental branch or the active snapshot.

The old Pages checkout under `/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-pages`
is a preserved detached copy. Do not edit it. Do not delete the old outer directory:
it contains relocation backups and dependency worktrees with outstanding changes.
The saved Codex project may still point there; explicitly use the canonical Pages
workdir, preferably open the fresh session in that canonical project.

## Read in order

Paths below are relative to canonical Pages unless absolute.

1. `CLAUDE.md`, parent `../../CLAUDE.md`, and applicable AGENTS instructions.
2. `docs/development-checkout.md`: exact current environment; later dated sections
   supersede earlier historical assertions.
3. `docs/dependency-consolidation.md`: release audit, issue texts and ownership.
4. `docs/gui-2.0-guide.md`: agreed recipe and GUI conventions.
5. `docs/architecture/runtime-legacy-contract.md`,
   `docs/architecture/legacy-lifecycle-audit.md`,
   `docs/architecture/runtime-reorganization-plan.md` and `runtime-contract.json`.
   These contain both implemented slices and historical/planned work: verify code.
6. `temp/pages-builder-organic-review.md`: detailed analysis and probes, NOT a fully
   accepted plan. Read its later additions and the corrections in this handoff.
7. `docs/architecture/decisions.md` and `docs/architecture/handoff.md` for background;
   early September 5 descriptions are historical, not the current implementation.
8. `.phased/done/registered-page-startup/plan.md` for the last finished workflow.

No active phased plan remains. Completed workflows are in `.phased/done/`:
`runtime-contract`, `page-owned-runtime`, `python-page-bootstrap`,
`registered-page-startup`. Do not execute a nonexistent next phase or reopen a
completed phase merely because an older draft says closure/naming is pending.
Use phased workflow skills when requested by the owner.

## Tested dependency assembly

| Component | Active source/version |
| --- | --- |
| Pages Python and JS | Canonical Pages working tree |
| Python Bag | Published 0.21.1 in Pages `.venv` |
| Python TYTX | Published 0.15.0 in Pages `.venv` |
| Python ASGI | 0.43.1 in Pages `.venv` |
| Python Builders | Experimental old worktree, see command below |
| Bag JS | Git release v0.4.0, commit faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a |
| TYTX JS | Git release v0.15.0, commit 6b9bf3a486014d92812caa3b06674083e646c5cd |
| DOM JS | Isolated COPY of experimental eaaa0ac, not a live link to its source |

Active client root:
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages/temp/client-releases-20260908`

Bag JS and TYTX were installed from published Git tags; npm registry publication
was not needed. `package-lock.json` records exact commits. DOM src/tests/package.json
were copied into this root, with dependency links resolving the SAME installed
Bag/TYTX modules as the browser. jsdom is 27.0.1. Original dependency worktrees and
links were left untouched. Editing the DOM worktree does NOT update the demo:
refresh/rebuild this disposable snapshot explicitly and verify module resolution.
Never use a copied runtime tree as the authoritative source for library edits.
Recreation instructions are in `docs/development-checkout.md`.

Bag JS uses conditional `#uuid` imports. Node resolves them through package metadata;
raw browser ESM requires an import-map entry. Pages now maps `#uuid` to
`/_assets/bag/browser-uuid.js` in `page_document.py`. Without this, the sidebar
appears but source hydration fails. No upstream dependency was patched.

Python Bag 0.22.0 remains BLOCKED: published ASGI 0.44.0 and active 0.43.1 import
`genro_bag.datachange.DataChangeCollector`, removed in Bag 0.22. Isolated SPA-worker
import failed with ModuleNotFoundError. The tested Bag/TYTX pair itself passed 44
contracts. Keep `genro-bag>=0.21.1,<0.22` until a compatible ASGI release is verified.
ASGI 0.45 was not published at the last check; recheck instead of assuming it is.
Adopting newer ASGI also requires migration to `genro_asgi_multiworker_spa`, including
worker entry-module strings. Current pyproject intentionally retains ASGI <0.44.

## Run and verify

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages
export GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908"
export PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src"
.venv/bin/python -m pytest tests/ -q --tb=short
.venv/bin/python -m genro_pages --modules "$GENRO_CLIENT_MODULES" --port 8014 --state-dir /tmp/genro-pages-channel
```

Check the existing port listener before starting or stopping anything. The demo was
running from canonical Pages on 8014 at handoff. Prefer a fresh browser tab to avoid
losing the owner's unsaved playground code.

Latest evidence:
- Full Pages suite: 92 passed using released Bag JS/TYTX JS, 24.64 seconds.
- After the browser import-map fix: six bootstrap tests pass, Ruff passes,
  `git diff --check` clean. This is not a claim of a second full run after that fix.
- Real browser: Hello World loads through MessagePack and JSON; editing title and
  leaving the field updates the bound text. Sidebar is present.
- Python TYTX 0.15 alignment previously passed all 92 tests and 39 JS registry tests.
- These tests validate the implemented prototype, not all architectural goals below.

## Responsibility boundary to preserve

```text
genro-pages/
  src/genro_pages/          Python recipes, document bootstrap, host integration
    page.py                current WebPage is a plain Python class
    application.py         ASGI integration and serving
    page_document.py       HTML document builder and typed startup/import map
    worker.py              current registered worker integration
    pages/                 examples and widget gallery recipes
  js/src/                  integration JS shipped with Pages
    bootstrap.js           startup composition
    application.js         PageApplication extends DOM Application; pageId + rpc
    rpc.js                 transport/request lifecycle
    dev.js / inspector.js / shortcuts.js
    playground*.js / lab-session.js / gallery.js
    codemirror-component.js / bag-xml-view.js

genro-dom-js/src/           standalone JS runtime; no Python/ASGI/RPC dependency
  application.js           runtime composition and lifecycle
  builder-handler.js / builder-base.js
  source-bag.js / target-wrapper.js / pointer.js
  services/topics.js       generic topic ownership
  services/recipe-runtime.js
  collections/             reusable widgets and containers
  contrib/                 HTML/SVG builders
```

The owner accepted keeping Python and integration JS together in Pages (`src/`
and `js/`), keeping DOM JS independently usable. Do not rename DOM to Pages JS or
move all JS into either repository as an assumed decision. Shared generic fixes
belong upstream; page identity, networking and dev/gallery orchestration belong
in Pages. Current `WebPage` does NOT inherit RoutingClass or Builder: it defines
`client_builder`, `client_setup`, `source_inspection`, and `main(root)`.

The desired author-facing browser entry is one `genro` per page with owned services,
not unrelated globals. `PageApplication` currently adds `pageId` and `RpcService`
to the DOM Application, disposing RPC before its superclass. Verify actual service
APIs before expanding the facade. Source nodes remain the intended callback `this`,
with relative paths and owned subscriptions; compatibility is contractual, not a
requirement to copy giant legacy modules or implement a JavaScript Proxy object.

## Owner requirements and open decisions

Accepted direction:
- Modern JS/CSS, manageable modules; inspect each legacy feature before replacing
  it, retaining only useful semantics and explaining concrete improvements.
- Python recipes use helper methods/docstrings; all example text and instructions
  in English; actual executed recipe shown beside Live, no separately fabricated UI.
- Compact coherent theme, label style parameters, focus-out default input commit,
  mobile as a first-class target. Device gesture parity is not fully tested.
- Preserve meaningful GET/SET/PUT/FIRE behavior, source-node context, publish/subscribe
  and lifecycle disposal. Dojo connect DOM events and method advice are different
  cases; modern replacements need distinct semantics and ownership.
- Support lightweight ASGI use without mandatory SPA user/page registries as well
  as a stateful SPA/worker host. The small server monitor POC should demonstrate
  an in-memory server Bag updated by telemetry and streamed to the client; no
  durable persistence was requested for that POC.
- Larger server panels should compose recipe fragments from contributors. The
  _server inventory discussed monitor/users/tags/tasks/inspect/orchestration/plugins.
  Inventory and plugin contracts still need verification; this is not implemented.
- One physical WebSocket on the root browser page; nested iframe pages have distinct
  logical identities and communicate through a validated postMessage bridge.
  This is a target, not a claim that full iframe multiplexing is complete.
- `dataRpc` should accept an exposed bound Python method or a page-relative route
  reference; emit a serializable route reference, never the Python callable itself.
  Preserve `httpMethod='WSK'` convention, with configurable default transport.
- New page routing classes should be stable per path, not altered by remote calls
  or bootstrap kwargs/mixins. Methods access per-page state through a store obtained
  using page identity, not arbitrary mutable fields on a reused service instance.
- Multiple @route decorators are forbidden by owner policy; use aliases. An older
  probe demonstrated technical possibility, but that is NOT an accepted author API.

OPEN: final naming and ownership batch for Builders:
- Earlier author preference was recipe `.data(...)` instead of `.dataSetter(...)`.
  Generic Builder already exposes `.data` as a Bag, creating a real collision.
- Later discussion considered `setData`, `pageData`, or renaming the Bag to `store`.
  Do not claim a final global rename was approved. Present the coherent alternatives
  against actual code and include compatibility cost for Python AND JavaScript.
- Page-owned/borrowed data, stable observation root, subbuilder sharing, seeding vs
  overwriting, snapshot safety and cleanup need a single contract. Standalone builders
  must still work without Pages or Routes. Python source creation must not accidentally
  execute GUI provider logic; client presentation reactions stay in JavaScript.
- SourceBag XS and mixed ordinary Bag branches must survive TYTX JSON/MessagePack.
- dataFormula/dataController/dataRpc authoring and runtime behavior must be compared;
  defining a dataRpc recipe element is not an implemented RPC executor.

Older organic-review sections describing variable page classes, resident per-page
instances, live subscriptions/freeze or pending phase naming are proposals/history.
Later owner direction narrowed routing to a stable class per path and store-based
state. Resolver/page-id routing details were explicitly PARKED. Do not revive them
as an already approved implementation batch. Row locks, per-page call scheduling,
thread context and HTTP/background serialization are different mechanisms.

Data sync, server business validation revisions, stale responses and save barriers
remain future work. A 4,000-row grid may use a bounded server/client window over a
DB selection, rather than mirroring the whole dataset. Remote source fragments can
avoid continuous source-tree synchronization. Neither mechanism is completed here.

## Upstream coordination and consolidation

Tracking links (status must be refreshed before acting):
- DOM runtime consolidation: https://github.com/genropy/genro-dom-js/issues/1
- Builders SourceBag: https://github.com/genropy/genro-builders/issues/41
- Builders GUI data spelling: https://github.com/genropy/genro-builders/issues/42
- Builders stable root: https://github.com/genropy/genro-builders/issues/37
- Builders #38/#39 were closed; do not restore old workarounds blindly.
- ASGI raw forwarding: https://github.com/genropy/genro-asgi/issues/72

DOM #1 has a historical six-commit snapshot ending 718acbe. Current experimental
HEAD is eaaa0ac: inspect the full delta, do not use the old commit list as exhaustive.
Review in bounded slices: typed source hydration; widget/container behavior;
lifecycle/disposal; deferred mounting; dependency packaging. Validate standalone
DOM and Pages from clean release artifacts before dropping overrides. No wholesale
merge of an experimental branch merely because integration tests pass.

ASGI #72 asks whether opaque application payloads can cross commander/UDS/worker
without redundant TYTX decoding/re-encoding. Avoid assuming a new socket format
or duplicating the legacy bridge. Do not make this parked transport discussion a
prerequisite for unrelated Builders consolidation.

Mailbox:
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/temp/posta/`
Read README.md FIRST, then list unread messages for `pages`, including multiple
recipients. Sender identity is `pages`; core `asgi-coord`, websocket `asgi-ws`,
legacy bridge `bridge`, codec `tytx`, owner `titolare`. One immutable file/message,
name `YYYY-MM-DD_HHMM_pages_a_<recipient>_<slug>.md`, headers Da/A/Re/Stato.
Only the owner writes Stato: decisione. Mail is Italian; link absolute document
paths. This turn created no new outgoing mail or freshness claim about incoming
mail. Do not invent a DOM recipient without checking the shared convention.

## Recommended first actions for the fresh session

1. Report canonical path/branch/dirty files, inspect instructions and incoming mail,
   then confirm the environment still matches this handoff. Do not rerun all tests
   just for orientation; baseline verification belongs to the next concrete change.
2. Preserve/review the four pending Pages alignment changes as a separate small
   checkpoint; do not fold them into an unrelated architectural rewrite.
3. Read the organic Builders review and current Python/JS implementations, including
   sibling updates made since this snapshot. Explain the store/data collision and
   ask the owner ONE visible question if the final naming contract is still unclear.
4. Produce one coordinated contract for borrowed data, source construction, XS and
   GUI providers, locating each change in Builders, DOM or Pages. Keep unresolved
   routing/freeze/sync machinery explicitly outside the first batch.
5. Continue consolidation via upstream issues/releases, then consume released
   artifacts here. For DOM source changes, explicitly refresh the demo assembly;
   browser and Node must resolve the same Bag/TYTX registry instances.

The owner expects each response to end with a clear action or a necessary question.
Never claim to be working after ending a turn. Explain findings in Italian; maintain
code and repository documentation in English. Use the phased workflow if requested,
without hidden repeated permission prompts or automatic new Claude sessions.
