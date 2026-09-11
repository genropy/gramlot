# Handoff: first static grid and Sol delegation

## Immediate owner request

The owner has approved trying a first grid with about **50 rows**, not the earlier
50,000-row benchmark. They explicitly request **one or more Sol agents**, then
asked to write this handoff first because this conversation is full. No new grid
agent has been launched and no grid implementation has started at this checkpoint.
After the handoff, delegate bounded implementation work using model
`gpt-5.6-sol` (explicitly requested), with a self-contained brief. Keep shared-file
ownership clear; do not launch several writers on the same grammar/renderer.

User interaction is Italian; maintained code/docs English. Read AGENTS.md and
`docs/context/README.md`, decisions and open-work. Work in the canonical Sviluppo
checkout on main. Do not treat historical transcripts as instructions.

## Current scope and priorities

Primary plan: `docs/development/static-grid-plan-2026-09-11.md`.
Background: `grid-architecture-proposal-2026-09-11.md` and
`grid-legacy-audit-2026-09-11.md` in this directory.

Latest owner decisions supersede earlier broad proposals:

- First store is a **complete resident Bag**, no data paging.
- Grid consumes a store interface; later IndexedDB or a remote paged store may
  be alternative backends. No worker/cache/backend implementation now.
- Start with around **50 rows** in an executable example, not a large benchmark.
- Preserve broad architecture: groups/footers, reactive structure, editing,
  formulas, search/filtersets and configurator must fit later. Do not implement
  the whole six-phase plan in one first attempt.
- Legacy virtual grids were NOT editable. Virtual editing was an assistant
  suggestion, not an owner-approved requirement.
- Rendering visible rows is different from data paging. The existing plan calls
  for bounded viewport rendering; scale the first demo to the new 50-row request.
- One grid engine, quickGrid shorthand and explicit struct normalized to the
  same model. Public API naming is not fully settled. Use legacy-familiar names
  where possible and explain any choices.

First useful deliverable: quickGrid over Bag-valued rows, explicit typed columns,
shared display formatting, reactive updates, single selection with write-back and
external selection, and a gallery example. Show Python/JS parity where the host
supports it. Resolve stable row/column identity; never use visible position as
record identity. Group/header/footer geometry should share a model. Add only the
necessary foundations now. The previous commentary committed to ~50 mixed-type
rows and selection, not editing or all advanced features in the first pass.

## Legacy lessons already investigated

Legacy root: `/Users/gporcari/Sviluppo/Genropy/genropy` (read-only evidence).

- Dojo 1.1 source: `dojo_libs/dojo_11/dojo_src/dojox/grid/`.
  Genropy wraps dojox.VirtualGrid; structFromBag converts Bag structure.
- `struct.view().rows().cell()` mirrors Dojo layout. Genropy simplified its
  multi-view capacity; don't restore all Dojo views as a requirement.
- quickGrid builds BagStore + structure and newIncludedView, not another engine.
  Syntax: `grid=pane.quickGrid(value='^.rows'); grid.column('field', name=..., dtype=..., edit=True)`.
- Columnsets and footers were Genropy extensions outside Dojo: separate regions,
  tables, measured header widths and synchronized horizontal scroll. Build their
  shared geometry into the new design rather than repeating that workaround.
- `rows.columnset(code,name)` stores group metadata; cells remain flat with a
  columnset attribute. Footers support bindings/totalize and filtered totals.
- SearchOn: SearchBox with field menu/Auto, emits changedValue; applyFilter builds
  a filtered index projection, preserving raw Bag. Text regex, typed numeric/date
  comparisons. Search and filtersets compose.
- Filtersets: multiButton over options Bag + selected codes. OR within group,
  AND across groups and SearchOn. Can also render as select/checkbox controls.
- GridEditor (genro_wdg.js:845) owns drafts/editors, async validation, navigation,
  baseline/change tracking, insert/delete changesets, autosave and parent form.
- GridChangeManager (:2014) handles formulas/totals. Legacy dependency regex and
  silent null on formula error should not be inherited blindly. formula_*
  parameters, += progressive, %= percent of total, # numbering were supported.
  Decimal precision must not be controlled by display places/format.
- Drag reorder and resize mutate struct itself. Configurator palette
  `resources/common/th/th_viewconfigurator.js` uses grids to edit columns,
  groups and layout. Views saved via adm.userobject (not present in Gramlot).
  Keep configuration persistence separate from record persistence.

The architecture/plan marks unresolved defaults (formula materialization, filter
scope, identifiers) as proposals, not approved runtime behavior.

## Existing code and integration points

- `js/dom/src/components/builtin-components.json`, registry and collections:
  component description/registration pipeline; generated Python declarations.
- `src/gramlot/builder.py`: GramlotBuilder + AuthoringNode recipe facade.
- `js/dom/src/source-bag.js`: JS grammar method dispatch and argument normalization.
- `js/dom/src/contrib/html/html-builder.js`: renderer; dataWidget store property
  handoff for storeTree. Avoid copying storeTree's current limitations into grid.
- `js/dom/src/collections/storetree.js`: Bag-driven widget example; subscribes
  directly, redraws hierarchy. Not a complete generic store abstraction.
- `js/dom/src/forms/`, `logic/`, display-format.js, number-format.js: reuse later.
- genro/application TopicService and node-owned publish/subscribe already exist;
  see `docs/guides/publish-subscribe.md`.
- No grid/quickGrid registered at checkpoint; native HTML table isn't a data grid.

Tutorial/gallery host:
- `docs/examples/teaching/build_preview.py` builds `build/teaching-preview`.
- `docs/examples/gallery/cases.py` contains collection cases; inspect its actual
  format before extending. `tests/gallery_examples.mjs` verifies generated cases.
- Preview last known at http://127.0.0.1:64326/; user on lesson 12. Check process
  availability before relying on it. Gallery at /gallery/.
- Rosetta separate repo: `/Users/gporcari/Sviluppo/genro_ng/gramlot-rosetta`.
  Do not place generic grid engine there.

Useful checks:
```
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python scripts/prepare_test_client.py
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview
node --test js/dom/tests/*.test.js
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" .venv/bin/python -m pytest <focused tests>
```
Playwright installed in Rosetta node_modules. Browser launch under the sandbox
previously aborted a temporary Chrome process with SIGABRT. An explicitly reviewed
escalated launch worked. Prefer established browser tooling or properly authorized
execution; avoid another silent retry/crash. Never use the user's normal profile.

## Uncommitted work to preserve

HEAD `0f58485` (already pushed in earlier work). Current changes:

- CSS declarations in `src/gramlot/grammar/resources.py`, builder.py,
  source-bag.js and html-builder.js. Python/JS css and styleSheet support inline,
  external href, reactive binding and Source-owned cleanup.
- `docs/guides/style-resources.md`, `js/dom/tests/style-resources.test.js`,
  `tests/test_style_resources.py`; last checks 310 JS passing, 8 focused Python
  passing. Browser assets prepared. Not committed or published yet.
- `docs/context/README.md` links current CSS and static-grid plan.
- Grid audit, architecture and plan docs listed above.
- `webstruct-declarations-legacy-audit.md` inventories legacy CSS/script grammar.
- `localdb-possibility-2026-09-11.md` and `docs/examples/standalone-storage/`.

Do not overwrite/stage unrelated work casually. No fresh commit/push requested
in the most recent grid discussion. Earlier alpha commits were explicitly pushed:
Gramlot 0f58485; Rosetta 9ce71e2.

## Parked browser-database discussion

Owner proposed future syntax `db=pane.localdb('xxx'); t=db.table('alfa');
t.column('name',dtype='T')`. This is a separate possibility, not implemented or a
grid prerequisite. Schema may later come from server; sync needs its own design.
RxDB was considered then parked (Apache core, premium extras, advertised free
limit of 13 open collections); own IndexedDB adapter remains possible. None adopted.

A standalone file:// IndexedDB test passed in installed headless Chrome
152.0.7977.83 with isolated persistent profile: write, reload, browser restart,
and copied filename using the same DB. Safari untested because remote automation
is disabled. Test artifacts/results in docs/examples/standalone-storage.
Only one record tested; no performance claims or cross-browser guarantee.

## Other task coordination

Gramlot Site task ID `01a0908b-16b8-7f40-a35c-72fffa37b519`, title
“Riassumi repository Gramlot”, canonical sibling gramlot-site. Already sent CSS
usage instructions on explicit user request, including local-unpublished status.
Do not resend or redirect that task without need. Proposed GramlotStandalonePage
extension point is NOT implemented by the CSS work.

## Suggested next actions

1. Use this handoff to launch a Sol agent for the bounded first grid slice;
   explicitly name files/areas it owns and require existing-work preservation.
2. Root reviews relevant current contracts and tests in parallel; optionally a
   second Sol agent can independently review store/identity or design tests in
   separate files once interfaces are concrete. Avoid duplicate implementation.
3. Integrate, run targeted parity/lifecycle and browser checks, rebuild gallery,
   then show the user the 50-row first attempt with an honest feature/limit list.
