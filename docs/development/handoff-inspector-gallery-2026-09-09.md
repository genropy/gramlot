# Gramlot handoff: framework work after the input gallery

Date: 2026-09-09. Internal development handoff, not public tutorial material.

## Purpose and owner checkpoint

The owner considers the Inputs gallery a usable first baseline: “ci siamo abbastanza; gli input ci sono tutti”. The next session should open in **Gramlot**, carrying forward the framework work described here. This is acceptance of the current baseline, not a claim that every input option or edge case is complete. Do not restart the website design or rebuild the inspector from scratch.

Read `AGENTS.md`, `docs/context/README.md`, `docs/context/decisions.md`, `docs/context/open-work.md`, and `docs/context/workspace-map.md`. Context files contain dated superseding updates: read the later decisions before acting on old migration/dependency statements. This handoff records completed work and proposed next steps; it does not authorize publication, cleanup or unrelated historical tasks.

## Repositories and current local state

- Active framework: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot`.
- Website/gallery: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot-site`.
- Historical Pages and DOM repositories, and `Documents/ChatGPT/genro-pages`, are recovery material. Do not implement there or delete them wholesale.
- Gramlot HEAD at handoff: `10cb2e1` (`Link the live Read the Docs manual`). The inspector changes are **uncommitted**, including new untracked modules and tests. Inspect current status before editing; do not reset it.
- The site source is also local and untracked at this checkpoint. Do not assume it is backed up by a remote commit.
- `docs/development/grammar-foundations-audit.md` was already present before the inspector work. Preserve it and distinguish its earlier audit findings from new implementation.
- No commit, push, release, production deployment or DNS change was performed for this work.

The owner chose **gramlot.org** for the website and the existing `genropy` GitHub organization. Earlier `.com` or separate-organization proposals are superseded. The manual remains at https://gramlot.readthedocs.io/en/latest/.

## Architecture and decisions to preserve

Gramlot combines Python authoring and the JavaScript runtime. Generic Builders, Bag and TYTX remain dependencies. `GramlotBuilder` owns GUI-specific adaptations; do not monkey-patch dependency internals or return to preview worktrees. Gramlot does not depend on Genro ASGI. The optional FastAPI adapter under `gramlot.contrib.fastapi` is authorized; a future integration with Genro ASGI belongs elsewhere.

Public documentation should explain Gramlot directly, without migration/legacy comparisons. Internal comparisons belong under development/context documentation. Keep maintained code and documentation in English. Prefer native components/CSS; Tailwind and Bootstrap were considered and rejected for this work.

The gallery is a **widget catalogue**, not a sequential tutorial. Tutorials and reusable-composition examples are separate. Recipes shown must be the exact recipes executed; no simulated framework examples or invented implemented widgets.

## Inspector: implemented behavior

The inspector is now a lazy `<gramlot-inspector>` web component, composed from the Python-authored inspector recipe and existing components. It observes the application's actual Data and Source Bags, not copies. Editing updates the running instance through Bag APIs and runtime notifications; it does not rewrite recipe files.

A lightweight controller is installed when `GramlotBuilder` mounts. Ordinary DOM `HtmlBuilder` applications are unaffected. The component, recipe and editor DOM are created on first opening and reused after closing. The internal inspector application explicitly disables its own inspector. Disposal removes the component, shortcuts and subscriptions.

Public host API:

```javascript
const app = new Application(host, builder);
await app.inspector.open();
await app.inspector.toggle();
app.inspector.close();
// app.inspector.opened; app.inspector.element (null before creation)
```

- Default shortcut: **Ctrl+Shift+D**, also while editing. F2 was rejected.
- A framework launcher exists by default. The gallery hides it inside examples and places a labelled magnifying-glass Inspector button beside Reset.
- JS opt-out: `new Application(host, builder, {inspector: false})`.
- Python/FastAPI opt-out: `Page.source_inspection = False`, forwarded by the adapter. Other hosts must forward their page policy explicitly.
- `gramlot-inspector-change` bubbles/composes through the application host with `{opened}` only when visibility changes.
- Shortcut/launcher errors emit `gramlot-inspector-error`; direct async API calls reject.

### Two presentations, one editor

- Default **floating** presentation: draggable/resizable palette.
- **Embedded** presentation: the same Data/Source tabs, tree, splitter, property grid and Path, without a palette.

```javascript
new Application(host, builder, {inspector: {presentation: 'embedded'}});
// Or set app.inspector.presentation = 'embedded' before its first opening.
```

The embedded component fills the space allocated by its host. The site positions it in an adjustable right sidebar **inside the executing result iframe**, preserving access to the demo. This is not a detached inspector mounted in the parent document. Narrow frames stack the panel below the example. Do not restore the old fullscreen iframe expansion or shadow stylesheet injection hacks.

Themes use inherited `color-scheme` plus documented CSS variables. Dark and light themes work through the component contracts. `:host-context(data-theme)` support is supplemental; explicit color-scheme is portable.

### Property editing

The owner rejected the old input-plus-permanent-type-selector layout.

- Existing rows choose native text, number, checkbox, date, time or datetime controls automatically.
- For the primary node value, supported `node.attr.dtype` takes precedence over inferred value type.
- Individual attributes infer their own types; the node's dtype must not be applied to every attribute.
- Explicit type selection is limited to a newly added attribute; it disappears after a successful commit.
- Leaving an edited row commits it. Moving between name/value/type within a new row is still one edit.
- `null`, empty string, numeric zero and false remain distinct. Backspace on an empty control sets null; boolean null uses the indeterminate checkbox state. Known types survive null and reselection during the editor lifetime.
- Unsupported complex values remain read-only. No speculative conversion of objects to strings.
- Invalid edits leave the node unchanged and show an error. Existing conflict detection and runtime rollback coverage were retained.
- **Apply, Discard and “Running instance only” were removed.** The footer normally contains only a small Path line: label upright, actual path italic. Errors remain visible when needed.
- DateTime edits currently use UTC and canonical TYTX DHZ. DH is a deprecated codec alias; this is a documented implementation constraint, not local-time editing.

The controls are currently native typed inputs, not complete Gramlot widget instances mounted into every cell. Do not claim that all widget formatting/validation behavior is automatically reused. Broader widget-factory integration is a possible follow-up.

### Legacy investigation: evidence, not a runtime dependency

The inspected legacy source is `/Users/gporcari/Sviluppo/Genropy/genropy/gnrjs/gnr_d11/js/`.

- `genro_components.js`: `BagNodeEditor` uses `MultiValueEditor`; `setTempStore` builds temporary grid cells with `wdg_dtype`.
- For Bag entries it uses `n.attr.dtype` before `guessDtype(value)`; when inspecting a single node, its primary value and individual attributes were normally inferred from values.
- `genro_wdg.js`: cell editing maps wdg_dtype to NumberTextBox, DateTextBox, TimeTextBox, CheckBox or TextBox.
- Type selection appears when adding a new row, not beside every existing value.

Gramlot emulates that interaction while also honoring declared dtype for the primary inspected value, including null.

## Source map for the next session

| File or directory in Gramlot | Responsibility |
| --- | --- |
| `src/gramlot/inspector.py` | Floating/embedded recipes sharing `build_view`; tree, properties, footer and row template |
| `js/pages/src/inspector-controller.js` | Lazy creation, launcher, shortcut ownership, open/close, presentation, disposal |
| `js/pages/src/inspector-component.js` | Custom element, packaged recipe loading, visibility events, component lifecycle |
| `js/pages/src/inspector.js` | Mount recipe and connect real Data/Source Bags and editors; retained explicit mount API |
| `js/pages/src/inspector-editor.js` | Typed cells, dtype inference, null, focusout commit, validation, conflict and rollback |
| `js/pages/src/inspector.css` | Grid and footer styling |
| `js/pages/src/inspector-theme.css` | Theme variables and presentation styling |
| `js/pages/src/builder.js` | GramlotBuilder application lifecycle hook |
| `js/dom/src/application.js` | Application options and optional builder lifecycle cleanup |
| `js/pages/src/shortcuts.js` | Shortcut dispatch and application ownership |
| `js/dom/src/collections/layout.js`, `palette.js` | Theme contracts used by inspector components |
| `src/gramlot/contrib/fastapi/application.py`, `frontend/entry.js` | Forward Python page inspector policy |
| `scripts/prepare_assets.py`, `hatch_build.py`, `.github/workflows/ci.yml` | Package both generated recipes and validate build input provenance |
| `docs/source/reference/inspector.rst` | Public inspector API and behavior documentation |
| `tests/inspector_component.mjs`, `inspector_typed.mjs`, `inspector_editing.mjs`, `test_inspector.py` | Lifecycle, typed editing, real Bag, conflict and rollback checks |

## Website baseline and integration

The site is a static HTML/CSS/JS shell. Python recipes are compiled to TYTX at build time; JavaScript recipes execute in the browser with the packaged Gramlot runtime. No FastAPI server or database is needed to serve this preview.

- `catalog.json` organizes the widget tree. Eleven inputs have basic real examples in Python and JS: textBox, passwordbox, numberTextBox, dateTextBox, timeTextBox, filteringSelect, comboBox, checkbox, horizontalSlider, verticalSlider, colorpicker.
- `widgets/<name>/recipe.py`, `recipe.js`, `metadata.json` are the example sources.
- Other catalogue entries are pending gallery coverage, not a guarantee of missing/present runtime implementation.
- `examples/` contains separate tutorial recipes: live-binding, presentation, local-scope.
- `design/index.html`, `design.js`, `design.css` implement the dark gallery; `web/runner.js` starts examples.
- `web/attach-inspector.js` configures embedded presentation, hides duplicate launcher, handles sidebar sizing and origin-checked messaging.
- `design/inspector-host.js` routes the toolbar/shortcut and adjusts result height; it does not mount a second inspector.
- The recipe is independently collapsible using Hide recipe / Show recipe; language tabs remain available.
- `design/playground-runner.js` and `live-playground.js` implement real JavaScript Try it. Editing runs on blur or Ctrl/Cmd+Enter with visible errors. This is a trusted local editor, not a security sandbox for hostile code.
- `lbl` is optional; basic examples omit `lbl_position` so it does not appear mandatory.
- `dist/` is generated: never patch it directly.

## Distribution and local preview

Published dependency pin remains `gramlot==0.1.0a1`. The current inspector changes are **not in that published release**. Local development uses a built wheel of the same version in a separate environment, with an explicit unpublished-preview banner and wheel provenance. Do not publish over that version.

Current wheel:
`temp/inspector-preview/gramlot-0.1.0a1-py3-none-any.whl`

SHA-256 at this handoff:
`2060f6f8d10cdf928ab84101cb1096987e6dd672e7308b75c41766aa6a844ebc`

Site environment: `/tmp/gramlot-inspector-preview`. The old published-wheel environment `/tmp/gramlot-pypi-0.1.0a1` remains separate. Recheck existence after a restart; /tmp paths are not durable project configuration.

Framework rebuild, from Gramlot:

```sh
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python -m build --wheel --outdir temp/inspector-preview
```

Site update, from gramlot-site:

```sh
/tmp/gramlot-inspector-preview/bin/python -m pip install --force-reinstall --no-deps ../gramlot/temp/inspector-preview/gramlot-0.1.0a1-py3-none-any.whl
GRAMLOT_LOCAL_PREVIEW=1 /tmp/gramlot-inspector-preview/bin/python build.py
```

The no-deps command is only a wheel refresh in the already provisioned environment; a fresh environment must install dependencies normally. Site build rejects editable installs and requires GRAMLOT_LOCAL_PREVIEW for a local wheel. `dist/build-info.json` records provenance.

Preview: http://127.0.0.1:8048/design/?v=inspector-docked#widget/textBox

The server was restarted after returning empty replies. Latest command, from gramlot-site:

```sh
python3 -m http.server 8048 --bind 127.0.0.1 --directory dist > /tmp/gramlot-site-8048.log 2>&1
```

At last check both `/design/` and `/runtime/pages/inspector-embedded.tytx` returned HTTP 200. Recheck before starting another server; a listening port alone did not guarantee a healthy response.

## Verification record and limits

Final typed-editor framework checkpoint: 85 Python tests passed; the optional-adapter suite was skipped in that environment. Focused inspector tests covered both presentations, typed controls, null, metadata, focusout, concurrency and Source rollback. An additional new-attribute type-retention check passed. Strict Sphinx, wheel metadata and diff checks passed.

Earlier framework checkpoint, before the final typed-cell change: 212 DOM tests and 10 optional FastAPI tests passed. Do not report those as a fresh full combined run of the final tree.

After installing the final wheel, the site passed:

```sh
npm test
npm run test:design
npm run test:playground
npm run test:inspector
```

These exercise 28 executed Python/JS examples, catalogue routing/source matching, recipe collapse, real Try it/error handling, the packaged embedded inspector, no permanent selectors, dtype N with null -> numeric zero, boolean checkbox writes, visible form update, origin checks and disposal. Most automated UI checks use jsdom: visual layout has also been iterated with owner screenshots, but these are not exhaustive browser/mobile QA.

## Suggested next session: framework foundations

Start by preserving and reviewing this local diff, then inspect `docs/development/grammar-foundations-audit.md`. The owner previously asked for stronger foundations before adding more widgets:

1. GramlotBuilder should provide base configuration and compose collections with explicit widget signatures, kwargs, types and documentation; unqualified `**kwargs` alone is insufficient.
2. Start from input wrappers such as textBox and separate coherent collections (inputs, layouts, etc.). Reuse inherited HTML definitions deliberately; avoid redundant declarations without understanding custom-child requirements.
3. Python and JavaScript declarations should express corresponding contracts. Co-locating Python/JS/CSS by widget or collection was discussed, not finalized.
4. Generate exhaustive widget reference documentation from the grammar where possible; maintain legacy comparison separately from the public manual.
5. Distinguish declaration-time validation, reactive bindings, runtime validation, formatting and editor inference. The audit found gaps in schema export, JS validation and collection isolation; do not assume they are solved by this inspector work.

These are recommended planning topics, not an instruction to implement an entire grammar redesign immediately. Establish the next bounded scope with the owner. The accepted Inputs gallery should serve as a real regression consumer of framework changes.

Known follow-ups worth reviewing: native typed cells versus reuse of full Gramlot input components; null without metadata across editor recreation; more input option/edge-case examples; keyboard/accessibility and narrow-screen layout; new release version and site dependency upgrade when publication is explicitly authorized. Do not conflate these with completed work.

## Starter prompt for the new Gramlot task

> Read AGENTS.md and docs/development/handoff-inspector-gallery-2026-09-09.md in this repository. We have reached a usable first Inputs gallery and now want to continue framework work in Gramlot. Preserve the uncommitted inspector implementation and its site consumer. Summarize the actual local state, distinguish completed work from open grammar foundations, and propose the next bounded step starting from input declarations and Python/JS contracts. Do not restart the site, patch installed dependencies, work in retired Pages/DOM checkouts, or publish/commit without the appropriate authorization.
