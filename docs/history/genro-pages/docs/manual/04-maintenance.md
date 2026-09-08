# 4. Widgets, tools and practical maintenance

[Contents](README.md) · [Previous: runtime](03-runtime.md) · [Next: proposed architecture](05-proposal.md)

Version: 0.1 · 2026-09-08 · 🔴 DA REVISIONARE.

> **Snapshot boundary:** Chapters 1–4 describe the client assembly C tested during this analysis. The authoritative DOM worktree changed concurrently: new form/validation code is described in [the closing addendum](07-concurrent-work.md). Claims of absence apply to the tested C runtime, not to that later unverified work.

## In this chapter

- [4.1 Widget contract](#41-widget-contract)
- [4.2 Current collections](#42-current-collections)
- [4.3 Labels, boxes and styles](#43-labels-boxes-and-styles)
- [4.4 Types, formatting, null and defaults](#44-types-formatting-null-and-defaults)
- [4.5 Validation, forms and inspector](#45-validation-forms-and-inspector)
- [4.6 Reproduced cleanup gap: storeTree](#46-reproduced-cleanup-gap-storetree)
- [4.7 Where to intervene if…](#47-where-to-intervene-if)
- [4.8 Setup and tests: verified commands](#48-setup-and-tests-verified-commands)
- [4.9 Test layers and limits](#49-test-layers-and-limits)

## 4.1 Widget contract

A collection supplies grammar entries, custom-element registration and optional collection CSS. `webcomponent(name, options)` creates `_meta.webcomponent` and `render_tag='gnr-...'`. `BuilderBase._resolveCollections` incorporates these entries before a recipe is built or imported. Python's `WidgetTestBuilder` must also declare tags used in Python recipes. A JavaScript custom element alone does not make a Python tag available.

The renderer resolves attributes before handing them to the element. Most values become HTML attribute strings; true becomes presence, false/null/undefined are omitted. A widget must interpret presence and textual booleans consistently with its contract. Special paths keep richer values as properties: storeTree gets `.storeBag`, and null-aware inputs receive typed `.value`/`.checked` after attribute application. Do not serialize a Bag to `[object Object]` in an attribute.

A custom control writes through a composed bubbling event from its host. Standard value/checked controls use `input` or `change`; tree/layout commands can emit `gnr-set` with their resolved destination. Inside the Application, delegated input handling maps identity back to the source; it never infers a source node from the visual label. Widget-internal event handlers normally use widget scope. Source recipe actions use the separate recipe executor.

A disconnect must release **external ownership**: Bag subscriptions, document/window handlers, observers, timers and late async completions. Listeners attached only to a widget's own collectible input are a different lifetime concern from listeners stored on a retained external Bag. Reconnection should not double-subscribe or initialize a second editor over the first.

## 4.2 Current collections

| Collection / recipe tags | Implemented mechanism | Boundaries and tests |
| --- | --- | --- |
| `inputs`: `textBox`, `passwordbox` | Shadow native text/password input, host value property, label support, null state, change/input bridge | No universal validation dispatcher; D `widgets`, `writeback`, `input-null`, `widget-labels` |
| `numberTextBox` | Native number input; `valueAsNumber` when nonempty, explicit empty string otherwise, null separately | Full TYTX dtype coercion and general numeric formatting are absent; `input-null` |
| `dateTextBox`, `timeTextBox` | Native date/time controls through GnrInput | Accessors inherit string representation, not automatic Python date reconstruction; transport typing is separate |
| `checkbox` | Native checked state plus explicit null/indeterminate tracking | Null CSS currently overrides native checkbox appearance; conventional dash is still proposed; `input-null`, `widgets` |
| `comboBox`, `filteringSelect` | Dropdown/filtering, key/caption choices; constrained select rejects invalid choice while free combo allows text | Limited local validity/error presentation, not `genro.vld`; D `choices.test.js` |
| `horizontalSlider`, `verticalSlider` | Native range, typed numeric value, minimum/maximum or min/max, step/discreteValues; vertical variant | Bounds validation and intermediateChanges; no full legacy decoration/tick API; D `sliders-defaults.test.js`, P `test_slider_defaults.py` |
| `layout`: `panel`, `box` | Shadow container/slot and caption/layout styling | Generic box is not proposed legacy `labledBox` wrapper; `layout-containers`, `widget-labels` |
| `borderContainer` | Region layout and splitter interaction | Inspect pointer and disconnect handling; not all legacy/mobile semantics; `layout-containers.test.js` |
| `tabContainer`, `tab` | Child selection and visible tab content, selection writeback | Maintain live selected state across compatible patches; layout and label tests |
| `stackContainer`, `contentPane`, `stackButtons` | One selected content pane plus optional independent controls; selection/close/topic wiring | Separate selection source identity and tab UI; `stack.test.js` |
| `palette` | Floating panel, move/resize, close/open binding, optional keyboard handling | Keyboard movement opt-in, no complete dialog service; `palette.test.js`, labels tests |
| `storeTree` | One data-widget source node; direct Bag store, expansion/selection state; selectedPath writeback | No general remote lazy resolver/tree grid; **disconnect subscription defect below**; `storetree.test.js` |
| `colorpicker` | Native color control, shared labels and null state | Browser-native color behavior; no universal format service |
| `clipboard`: `copyButton` | Clipboard Promise, busy/status state, error handling, timer/generation cleanup | Capability/permission dependent; D `clipboard.test.js` |
| P `labEditors`: `codeMirror` | Versioned CDN editor or textarea fallback; value bridge and disconnect destroy | Development integration, not a required core widget; P CodeMirror/playground tests |

The Python gallery has one page per registered widget case. VerticalSlider is available in its grammar and covered by dedicated tests even though the gallery's historical file organization may not provide a separate vertical-slider page. Discover registered pages through `WIDGET_PAGES`, not by lowercasing class names or guessing URLs.

## 4.3 Labels, boxes and styles

`WidgetLabel` creates/reuses an internal `.labledBox` with label and content inside the widget's own shadow root. This class name does not expose a `labledBox(...)` recipe. For a control it creates an HTML label associated with a native input in the same root; for grouped content it creates a group with an accessible caption. It observes decoration attributes and can update the label without replacing the editor.

Supported placement codes are `L`, `R`, `TL`, `TC`, `TR`, `BL`, `BC`, `BR`. `lbl_position` chooses direction/alignment. `lbl_side`, `side` and a nearest `data-label-side` provide fallback, with left as the current default. Unsupported positions throw. Empty label text hides the label; box-only decoration is allowed. `lbl_*` and `box_*` are routed through shared HTML/CSS adaptation to their respective elements.

`HtmlAttributes` recognizes CSS roots such as `font`, `margin`, `grid`, `flex`, width/height and others; underscores become CSS hyphens. `html_<name>` escapes to a literal HTML attribute. `style_<property>` provides an explicit CSS route. Units remain author-provided: write `width='320px'` when pixels are intended. The simple style-string parser splits declarations on semicolons; it is not a full CSS parser. Malformed declarations without a colon throw. Although a comment describes fixed precedence, `_adaptStyle` iterates input order: verify collision behavior when mixing explicit `style` and individual kwargs rather than assuming CSS precedence from the comment alone.

Theme CSS custom properties can cross shadow boundaries through inheritance. Ordinary document selectors do not style arbitrary shadow inputs. Layout belongs partly to the outer host and partly to widget-owned internal containers; test both when moving grid placement or adding labels. `DomTarget` compares remembered recipe output with prospective output rather than blindly overwriting all live styles, so palette position and selected/hidden state can survive compatible updates.

The proposed legacy wrapper would route `lbl_*`, `box_l_*`, `box_c_*` and inherited `fld_*` defaults around controls, with its own layout/datapath contract. That is not implemented by the shared internal label helper. A refactor must preserve source target identity, child paths, focus, label association, explicit false/zero/empty defaults and container borders. Do not fix inherited wrapper semantics by sprinkling label overrides into individual pages.

## 4.4 Types, formatting, null and defaults

TYTX transport retains types of recipe/data values; native HTML controls have narrower representational abilities. The three boundaries are: typed wire decode, widget value parsing, and visual presentation. A date preserved through Python/JS serialization may be displayed as a string by a native date widget. A number widget returns a JavaScript number using native parsing; this is not a general Decimal arithmetic engine.

The renderer uses textContent for scalar content and ordinary attribute stringification. General legacy `_present_value`, masks, `format_*` and CSS macros are not implemented as a shared presentation engine. Where native controls or choice captions provide presentation, document those exact capabilities. Do not attribute `genro.format` or a locale/format service to Application without adding it explicitly in future work.

`InputNullState` holds an `isNull` bit independent of native input value. Fresh Backspace on an empty textual control (or scalar checkbox/range/color control) can assign null; repeated keys, composition and locked controls are guarded. It dispatches input and may defer change notification to blur under the default update policy. Null appearance and aria-description communicate the state. Native typing clears it. Explicit empty strings are preserved by the current null-aware input path, distinct from zero and false.

`RecipeDefaults` seeds **missing nodes/attributes only**, once per source node using a WeakSet. It recognizes `default` for a value binding and `default_<attribute>` for other pointers. Existing null, empty, zero and false survive. A redraw does not reseed a deleted data value on an already initialized node. A genuinely new source node can seed its missing target. Typed string defaults use TYTX decode when a non-text dtype is declared and throw for invalid decode. This is not the same behavior as a dataSetter, which intentionally writes its declared value during startup calculation.

The proposals for `blankIsNull`, a possible `empty_as_null` alias, `view_null`, independent invalid styling and a conventional checkbox null dash remain proposals at this snapshot. Native indeterminate is set, but the null stylesheet uses `appearance:none` and its own indicator. Do not describe this as completed native dash presentation.

## 4.5 Validation, forms and inspector

The code contains constrained choice validity and native input validity checks. It does not contain a shared ordered `validate_*` rule dispatcher, form-level aggregation, typed dirty baseline, save/reset controller or a database-independent memory form.

Legacy `GnrValidator.validationTags` orders select, notnull, empty, case, len, min/max, email, regex, call, gridnodup, nodup, exist and remote. Legacy `GnrFrmHandler` and form-store memory methods demonstrate that a form can operate on a Bag without a database. These are source comparisons, not runtime exports in D. The future design should separate parsing, normalization, transformations, validation, draft writes and persistence gating; an invalid draft policy requires a decision.

Current `InspectorEditor` supports string, finite number, boolean and null scalars; complex values remain read-only. It snapshots node identity/value/attributes, rejects stale drafts, parses all edits before applying, emits Bag API notifications, and attempts restoration if runtime mutation fails. Apply updates only the running instance; it does not save Python or JS source. Explicit Apply is implemented; automatic focus-out commit using the final typed field widgets is future work.

Its dirty state is local to the property-grid draft, not a generic form dirty tracker. Its snapshot comparison is shallow `Object.is`, not a deep baseline for Bags/Dates/records. Failed restore is reported explicitly. The editor's event listeners are disposed by the inspector, and the inspector owns subscriptions on both real page Bags and its own selection data.

## 4.6 Reproduced cleanup gap: storeTree

**Observed defect, not fixed by this documentation task.** D `collections/storetree.js:disconnectedCallback` and `_resubscribe` call `bag.unsubscribe(this._subId)` without options. Installed Bag JS `Bag.unsubscribe` defaults `update`, `insert`, `delete` and `any` to false; the call therefore removes no callbacks. Source-based tests passing do not establish leak-free cleanup for this case.

A diagnostic constructed a real Application with a Bag-backed tree under jsdom, counted calls to its `_render`, disposed the Application, then mutated the retained Bag. Result:

```json
{"detached": true, "renderCallbacksAfterDispose": 1}
```

The widget is detached but the Bag still retains and invokes its callback. Replacing the store can likewise leave an old-store callback. The maintenance action belongs to DOM's subscription calls, verified against the installed Bag contract; a future fix should assert no callback after disconnect and no callback from the old store after replacement. The exact diagnostic is saved in the verification record. No runtime/test source was edited here.

## 4.7 Where to intervene if…

| Symptom / task | Start here | Trace and verification |
| --- | --- | --- |
| Add a widget | D collection grammar and `defineComponents`; P `WidgetTestBuilder` | Import/register before require; Python → TYTX → JS test plus direct widget behavior |
| Add an attribute | Source schema / `HtmlAttributes` / widget observed attributes | Decide source-only metadata vs host attr vs CSS vs typed property; test change and removal |
| Binding resolves wrong data | `SourceBagNode.absDatapath`, handler root vs builder segment | Log source anchor and absolute path; use abs-datapath cases; check `main.` is not duplicated |
| A type disappears | Python SourceBag class and TYTX registry; JS `loadSource` | Inspect decoded node/value class before render; use typed-envelope and imported-source tests |
| Data changes but view does not | Bag notification → `_onDataEvent` → pointerMap → render queue | Check silent PUT/direct attr edits, passive `=`, missing `live`, wrong segment, data-widget own subscription |
| Old binding still responds | `_onUpdAttrs`, `_updatePointerMap`, inherited datapath changes | Inspect removed/registered keys and descendant readers; add a precise rebinding contract |
| Input loses focus | `_applyMutation` reason, target ID, `DomTarget._reconcile` | Self-write should skip origin; external/structural changes may replace; test actual element identity and selection |
| Label update loses draft text | `WidgetLabel`, `_reconcile` decoration branch | Hold focus with uncommitted text, change lbl/box, verify input object and draft |
| Style/layout wrong | `HtmlAttributes`, collection CSS, Pages theme | Inspect host vs shadow, source kwargs vs runtime styles, attribute order and units |
| Resource retained after removal | Bag subscription flags, widget disconnect, tool dispose | Retain Bag, remove widget, mutate; inspect callback counts. Known tree defect is an example |
| Python recipe differs from JS | Both grammars, typed SourceBag import, startup execution | Compare SourceBag class, nodeTag, `_meta`, values/attrs and client collection imports before comparing screenshots |
| Source mutation fails | `_copyImportedSource`, `_onSourceEvent`, renderer | Unknown tag, resolver, malformed style/default/range or wrong source type; inspector rollback is tool-specific |
| RPC response goes to wrong action | `RpcService.pending` and caller generation | Service ID correlation vs application stale-result policy; run RPC unit tests |
| Root mount works, prefix fails | `PageDocument`, `index` endpoints, raw collection imports, `_openChannel` | Requires coherent host URL contract; do not remove only the root-mount guard |
| CodeMirror missing | Browser network/import map; `connectedCallback` fallback | Check pinned CDN imports, fallback textarea and generation; Node stubs are not CDN verification |

A missing render diagnosis should compare **the stored data value, the evaluated runtime value, the emitted prospective DOM and the live DOM**. This localizes the fault to data/path, rendering or patch application. Looking only at the screenshot cannot distinguish those stages.

## 4.8 Setup and tests: verified commands

Run from the canonical Pages root:

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages
export GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908"
export PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src"
export PYTHONDONTWRITEBYTECODE=1
.venv/bin/python -m pytest tests/ -q --tb=short -p no:cacheprovider
GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908" \
  node --experimental-loader ./tests/lab_loader.mjs --test js/tests/rpc.test.mjs
```

Observed: 100 collected Pages tests; 99 passed in the restricted environment and the launched-server test was blocked by loopback bind permission. Rerunning that one test with local socket permission passed (1.22 s). This verifies all 100 cases across the two runs, not a claim that the initial run was green. The separate RPC suite passed 3/3; it uses a controlled Socket implementation and is not a real WebSocket test.

Run the DOM copy used by these integrations:

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages/temp/client-releases-20260908/genro-dom-js
node --test tests/*.test.js
```

Observed: 184 tests passed, zero failures. This deliberately exercises the active dependency assembly. To test D after editing it, use a documented isolated assembly or verify D's own dependency links first. D's package script is `npm test`, but its declared Node >=18 floor should not be taken as proof that jsdom 27 and the full suite work on Node 18; this run used Node 23.11.0.

The current demo launch syntax is:

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages
export GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908"
export PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src"
.venv/bin/python -m genro_pages --modules "$GENRO_CLIENT_MODULES" \
  --port 8014 --state-dir /tmp/genro-pages-channel
```

The CLI/options and launch behavior are verified by the real-server test using an automatically selected free port and private temporary state, not by restarting the user's existing 8014 server. Existing development notes document prior real-browser use on 8014. This draft does not claim a new visual/browser regression pass over all pages.

For a new machine, recreate a compatible Python environment and client assembly following P `docs/development-checkout.md`; the B override and dirty D snapshot are not reproducible from release version numbers alone. Do not advertise `pip install genro-pages` as a proven standalone deployment. Build/clean-wheel/editable-install validation remains part of the proposed release path.

## 4.9 Test layers and limits

D's jsdom tests exercise real DOM APIs and components in a simulated document, including source/data mutation and patch equality. They cannot prove CSS geometry, native popup behavior, actual device touch, browser focus selection or CDN availability. P pytest mixes Python route/serialization tests with subprocess Node integrations; `test_registered_server.py` is distinct because it launches the worker and uses actual HTTP/WebSocket traffic.

Manual browser review should cover JSON and MessagePack startup, native and component input edits, external updates while focused, label style changes, container selection and resizing, inspector conflicts, repeated mount/dispose, network failure/fallback and keyboard navigation. For mobile, use actual touch/hybrid hardware for pointer cancellation, virtual keyboard, scroll/zoom and coarse targets. These are remaining checks, not results of this documentation run.
