# Labeled box, validation and portable forms — contract proposal

Version: 1.0  
Last updated: 2026-09-08  
Status: 🔴 DA REVISIONARE — source findings are evidence; all new contracts, names and implementation steps below await owner review.

## Scope and recommendation

Use a shared labeled-container mechanism, a source-owned validation pipeline and a Bag-backed form controller with separate persistence adapters. Implement the same browser core for Python-authored and JavaScript-authored Pages. Python contributes recipe grammar and typed transport, not a second validator or form implementation.

This proposal addresses only labeled boxes, validation and forms. `blankIsNull` appears only as normalization before validation. Inspector, Rosetta, gallery, manual, general input redesign, database integration and repository reorganization are excluded.

Attached input: [original review](labeled-box-validation-form-review-20260908.md). Its unrelated recommendations and previously discussed directions do not authorize implementation here. Governing runtime reference: [runtime legacy contract](../docs/architecture/runtime-legacy-contract.md). That reference's historical gap list is not a current feature inventory.

## Checkout and evidence boundary

- Pages: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages`, branch `codex/hello-world`, HEAD `25a8f9bfb3398eca85c0127ecef8733935dbf7a5` plus existing working changes.
- DOM: `/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js`, branch `codex/python-js-alignment`, HEAD `eaaa0ac0a582cc8f9abada1cdddf699cd0e66bbc` plus existing working changes, including the untracked label helper.
- Legacy: `/Users/gporcari/Sviluppo/Genropy/genropy`, HEAD `919a3a572acf89b4e016b2b32fd5ec556a269533`; evidence describes files read in this local checkout, not all legacy releases.
- Read Pages and inherited CLAUDE instructions, organization/standardization/naming references, README, architecture records, development checkout and `.phased/roadmap.md`. Only archived `plan.md` files are present. No active phase is created or closed by this proposal. Both Pages pre-commit/pre-push hooks exist.
- Existing changes were preserved. No runtime code, dependency assembly, branch, roadmap or approved architecture record was changed. This document is a temporary proposal, not a commit or a new public API.

### Verified source map

Paths below are relative to the corresponding root above; line numbers refer to the inspected working files.

| Area | Legacy evidence | Current evidence and gap |
| --- | --- | --- |
| Explicit box | `gnrjs/gnr_d11/js/genro_widgets.js:834`, `gnr.widgets.labledbox.onBuilding`; Python example `projects/gnrcore/packages/test/webpages/gnrwdg/gridbox.py:189` | DOM `src/widget-label.js:1` shares widget decoration; no explicit `labledBox` collection declaration found. Pages `src/genro_pages/widget_test_builder.py` has no such declaration. |
| Automatic wrapper | `gnrjs/gnr_d11/js/gnrdomsource.js:1918`, `buildLblWrapper` | DOM helper decorates inside component shadow roots, including containers; it does not perform legacy source-tree expansion. |
| Paths/identity | Wrapper moves layout attributes and returns its content node | DOM `src/source-bag.js:194`, `src/builder-base.js:228`, `src/target-wrapper.js:80`: path resolution, reactive attributes and reconciliation already exist. `#FORM` recognizes `formId`/`form=true`, not a functioning form controller. |
| Field write | `gnrjs/gnr_d11/js/genro_widgets.js:1420` onward | DOM `src/application.js:172` reads `value`/`checked` on selected input/change event, then calls `_applyMutation`; no shared validation gate there. |
| Validation | `gnrjs/gnr_d11/js/genro_frm.js:2207–2539`, `GnrValidator` | No shared `validate_*` engine found. DOM `src/collections/inputs.js:183` has selection-specific native validity; number getter at 357 uses `valueAsNumber`, date/time retain text-style values. These are not a complete typed parsing contract. |
| Callback execution | `validate_call`, conditions and exit callbacks explicitly bind source context | DOM `src/services/recipe-runtime.js` provides source `this`, but `run` does not return callback results. It cannot yet serve directly as a value-returning validator executor. |
| Form | `genro_frm.js:28`, 382, 1298, 1780, 1979 | No portable form controller found in the examined DOM/Pages runtime. |
| Stores | `genro_frm.js:2541`, Base; 3093 SubForm; 3128 Item; 3248 onward Collection | Memory adapters are useful legacy precedent, not a ready standalone new-runtime implementation. |

### Important qualifications to the input review

1. Legacy automatic wrapping defaults to top; current DOM defaults to left. Explicit legacy boxes use `side`/inherited `label_side`, with CSS column layout as fallback. These are distinct entry paths.
2. Current `box_l_*`/`box_c_*` are not separately routed: the generic `box_*` extraction in `WidgetLabel` consumes them. Accepting an attribute is not implementing its meaning.
3. Legacy local transformations are interleaved with checks. `select, notnull, empty, case, len, min, max, email, regex, call, gridnodup, nodup, exist, remote` is the verified order. Moving `empty` ahead of `notnull` would change observable behavior.
4. Legacy email returns a truthy `iswarning` itself; merely setting `validate_email_iswarning=false` does not override that truthy result in the inspected merger.
5. `GnrFrmHandler.reset()` clears editor/change/invalid tracking; it does not itself restore a saved Bag snapshot. A baseline-restoring reset is a deliberate new contract.
6. Item memory load deep-copies data but strips node attributes; save walks current data and finally resets/reloads. This does not establish the proposed guarantees for typed metadata, deletion propagation or independent snapshots. SubForm copies fields into its parent, and Collection retains navigation/pkey machinery; neither belongs in the first scalar form.

## 1. Labeled box public behavior

### Authoring and structural ownership

Retain the legacy spelling `labledBox` as the proposed primary recipe name, accepting `label`, `datapath` and children. A corrected `labeledBox` alias is optional and must be approved. A box is a reusable titled container, not implicitly a form and not a persistence scope.

Illustrative NEW contract, not executable with today's grammar:

```python
box = pane.labledBox(label="Contact", datapath=".contact",
                    box_border="1px solid silver", box_padding="8px")
box.textBox(value="^.name", lbl="Name", font_size="18px")
```

```javascript
const box = pane.labledBox({label: 'Contact', datapath: '.contact',
    box_border: '1px solid silver', box_padding: '8px'});
box.textBox({value: '^.name', lbl: 'Name', font_size: '18px'});
```

The expected `.name` target is the same in both recipes, under the parent scope plus `.contact`. The explicit box introduces that scope exactly once. The automatic wrapper for `lbl` introduces no additional data scope. Absolute and marked paths continue to use the existing resolver; no string prefixing in a wrapper.

Recommended internal design: one decoration model with outer shell, label region, caption and content region, used by both entry points. Keep original source nodes and widget hosts stable. Automatic decoration is a rendering concern owned by the source node; it does not replace that node with a synthetic source identity. Explicit `labledBox` is an ordinary source container. Internal DOM regions are not independent recipe nodes. This is an intentional adaptation of legacy source rewriting, preserving its useful authoring behavior.

Adding/removing/changing a label or border must not recreate controls, lose selection/focus, change `node_id`/DOM id, change callback `this`, double subscriptions, or emit a data write. Disposal and path changes use existing source ownership. Generic HTML wrapping is not silently enabled by this change.

### Attribute routing and precedence (proposed)

| Attribute family | Automatic `lbl` on a field/widget | Explicit `labledBox` |
| --- | --- | --- |
| `lbl` | Field/group caption | Optional alias for `label`; conflicting values diagnosed |
| `label`, `label_*` | Keep widget-specific semantics, especially checkbox captions | Title text and title attributes, matching legacy |
| `lbl_*` | Caption attributes; `lbl_side` and `lbl_position` are layout directives | Alias for title attributes; `label_*` is canonical and wins with diagnostic on conflict |
| `box_*` | Outer decoration shell | Outer box; explicit prefixed values override equivalent unprefixed box styles |
| `box_l_*` | Label region around caption | Same label region |
| `box_c_*` | Content region | Same content region |
| `fld_*` | Defaults for wrapped field | Defaults for immediate content children; not an unrestricted descendant cascade |
| unprefixed font/color/style | Widget/control appearance | Box appearance; title and child field typography have their own defaults |
| grid placement/spans, outer sizing/margins | Original outer layout item owns them once | Explicit box owns them once |

Extract `box_l_*` and `box_c_*` before generic `box_*`. Partition caption/field typography so `font_size` of the field cannot grow the label. Label-region inherited CSS is only a fallback to explicit caption styling. Outer border styling must not duplicate the same decoration border inside; an explicitly authored field border remains independently meaningful.

For each target: theme defaults < applicable inherited defaults < local declarations. Explicit child presence wins over `fld_*`, including null, false, zero and empty string. Null on a local attribute suppresses a default/removes that local style; it is not absence. Removing an attribute makes the nearest default eligible again. This differs from legacy's null-or-blank fallback.

Within a style target, propose explicit CSS kwargs over a `style` string, independent of recipe attribute order; diagnose conflicting aliases. The current `HtmlAttributes._adaptStyle` iterates object entries, so this deterministic precedence needs implementation and tests, not just documentation.

Retain current `lbl_position > lbl_side > side > inherited label side > left` for automatic decoration. For explicit boxes propose `lbl_position > side > inherited label_side > top`, with `lbl_side` an alias of `side`; contradictory same-level side aliases produce a diagnostic. Same rendering mechanism does not require changing historical defaults. Whether a separate compatibility profile is warranted remains open.

Restrict decorative prefixes to presentation attributes: do not allow `box_datapath`, `lbl_node_id` or `fld_value` to silently rewrite binding/ownership. The accepted `fld_*` set should include visual defaults and approved field policies such as `blankIsNull`/`validate_*`, with source-level evaluation. Unknown structural defaults receive a diagnostic.

### Accessible labeling and invalid display

A single field gets its accessible name on the actual focusable control. Prefer a real label/control relationship within the same shadow root. A caption outside a control's shadow root must be passed to its labeling capability; a cross-root `for` string is not sufficient. A multi-child box gets a group name, not an implied label for every child. Checkbox's own caption remains distinct.

The field exposes blocking invalid state, its message and pending state through a widget capability. Propose `aria-invalid` on the focusable control, a persistent associated message in the appropriate root (`aria-describedby`, preserving existing help references), and restrained live announcements when messages change. Warnings are described without marking the field invalid. Color is supplementary; null and invalid styles coexist independently. Exact capability names and browser/assistive-technology support tests are still to approve.

## 2. Validation contract

### Processing and writes

The controller receives a parse outcome: successfully typed value, incomplete input, or parse error. Parsing belongs to the widget/type adapter, not individual validation rules. Incomplete/unparseable input stays in the editor; the Bag keeps the last parsed value and save is blocked even when that Bag value is valid. Do not coerce bad number/date text into null, zero, NaN or a guessed date. Existing date/time widgets need a narrow, explicit type adapter before claiming typed date validation; a general editor redesign is outside this work.

For successful parsing: normalize empty values, execute the ordered rule pipeline (including transformations), publish the result, then apply the draft write policy. `blankIsNull` converts only `''` to null, never whitespace, 0 or false. Resolve nearest explicit field/container value. Recommendation: default false in new Pages to preserve current behavior; migration recipes explicitly opt into true. No new alias is needed initially.

Use the same normalization for initial/load values and field commits before capturing a baseline. A loaded empty string is therefore null when policy is enabled; with policy disabled the distinction remains. Dynamic policy changes must not silently rewrite the baseline: recommend refusing such a change while the form has edits, pending validation or an operation, and requiring an explicit reload/reinitialization. Direct external Bag writes also require validation; normalization corrections must be owner-tagged and converge without recursive writes.

Recommended write policies:

- Inside a form: store parsed, normalized candidates even when rules reject them; retain blocking messages and prevent persistence. Raw parse failures remain editor-local.
- Outside a form: initially preserve legacy reject-on-error behavior; keep the invalid editor draft and message while leaving the Bag unchanged. A configurable alternative needs a named API later.
- Warnings permit writes and saves. Pending async checks permit a typed form draft write but block save; outside a form, retain the candidate until validation accepts it.

### Rule compatibility inventory

| Rule | Preserve / adapt / defer |
| --- | --- |
| `select` | Preserve selection-validity intent through widget capability; no Dojo internals. Unsupported widget capability must report a configuration error. |
| `notnull` | Preserve rejection of null/undefined/empty string; 0 and false valid. Required checkbox truth is a separate predicate, not `notnull`. |
| `empty` | Preserve replacement of null/empty, at its legacy position after `notnull`. Parameter zero is enabled; absent/false configuration is not confused with zero. |
| `case` | Preserve upper/u, lower/l, title/t, capitalize/c names. Recommend deterministic string transformation; legacy title/capitalization consults old field value and is not a pure normalizer. This difference needs approval. |
| `len` | Preserve exact or min:max syntax and codes. Recommend skip null/empty but type-check other inputs; do not silently treat scalar 0/false as strings. Document JS string length semantics. |
| `min`, `max` | Recommend finite typed numbers, no JS coercion; skip empty unless required. Legacy rounds both operands to 9 decimal places and can coerce. Choose strict comparison or explicit compatibility rounding before implementation. |
| `email` | Preserve warning default; replace Dojo implementation with a documented local rule. Recommend explicit severity override wins, intentionally fixing the legacy merger's inability to force an error. |
| `regex` | Preserve leading `!` negation; validate pattern at configuration time. Specify skip-null/empty and string-only matching. |
| `call` | Preserve source-context custom predicate and legacy return adaptation; support value-returning and later Promise results. |
| `gridnodup` | Inventory only: depends on grid membership/edited row. Later capability, not generic scalar core. |
| `nodup`, `exist` | Inventory only: database field/table, `getRecordCount`, relative conditions, current-record identity and RPC. No implementation here. |
| `remote` | Preserve validation-result intent through an injected asynchronous service; do not port synchronous `remoteCall` or assume database/server access. Legacy result can carry replacement value/data. |

Retain `validate_<rule>_if`, `_error`, `_warning`, `_iswarning`, code-specific messages and parameter zero. First blocking failure stops the pipeline; prior warnings accumulate. Retain legacy return adaptation: null/true means accepted, false means generic failure, a string is a failure code, an object can contain value/errorcode/message/iswarning. Detect a replacement by key presence, including null/false/0/empty. Malformed configuration or callback exceptions produce a blocking diagnostic, never silent acceptance.

Message precedence: result message > `validate_<rule>_<code>` > selected severity message > other severity fallback > stable code. Proposed severity precedence: explicit `_iswarning` > result severity > warning-only configuration > rule default. This is deliberate new behavior where legacy differs.

Proposed logical result (member names provisional): candidate typed value, modified flag, ordered issue list (rule, code, severity, message, field identity/path), phase (parse/local/async), and run revision. Pending belongs to the field controller; it is not a successful result. Keep derived state outside persisted data. Legacy `_validationError`/`_validationWarnings` can eventually be read projections, not a second source of truth.

### Callback context, dependencies and async lifecycle

Conditions/custom checks evaluate current recipe parameters with `this === sourceNode`; wrapper nodes never replace that context. Callbacks use ordinary functions/compiled recipe bodies, not rebound arrows. Extend the executor seam to return values/Promises and preserve thrown errors; today's fire-and-forget `RecipeRuntime.run` is insufficient.

Keep `validate_onAccept`/`validate_onReject` and their legacy argument order `value, result, validations, rowIndex, userChange` where meaningful (no grid row in the scalar core). Propose execution after committed write/rejection and state publication, once per current user commit, on a scheduled turn. Passive revalidation/load/save-gate checks do not replay effect callbacks. Unlike legacy's loosely timed delay, ordering and cancellation must be tested. Rule callbacks should be pure; any proposed data patch must be returned, scope-checked and applied by the controller only for the current run. Automatic application of arbitrary remote data patches is deferred from the initial core.

Subscribe to reactive `validate_*` parameters and declared dependency paths resolved through the source node. Custom `GET` reads require explicit declared dependencies initially; do not promise automatic dynamic dependency discovery. Candidate names: `validate_depends` or `validate_dependencies`. Batch and deduplicate invalidations, suppress self-origin echoes, and detect non-converging transformation/dependency cycles with a blocking diagnostic. A dependency change invalidates current results even if the field value did not change. Removal/rebinding cleans subscriptions and registered issues.

Async checks use a run token covering owner lifetime, binding path, value revision, rule configuration and dependency revision. Superseding input/config/path/load/reset/disposal invalidates the token immediately; cancellation is best-effort, token comparison is mandatory. A late response cannot change data, state, callbacks or another run's pending count. Promise rejection/timeout becomes a blocking service issue; aborted superseded work is silent. Async transformations must be rechecked locally and converge before clearing pending. Parallel independent checks may execute together, but issue ordering follows declaration/rule order. The first implementation may run checks sequentially for simplicity.

## 3. Portable form contract

### Ownership, scope and public surface proposal

A form controller belongs to one source node and one resolved Bag subtree, with no required table, primary key, network or host server. Reuse `formId` and `#FORM` semantics; do not reinterpret existing `#FORM.x` as `#FORM.record.x`. A form may explicitly choose a `.record` subtree, but it is not mandatory.

Recommend retaining `formId` as a scope marker and making controller creation explicit through a form declaration/attachment, so old marked containers do not acquire lifecycle side effects merely by upgrading. Candidate entry points: `form(...)` versus a `formHandler` declaration on a container. Neither is approved or implemented. Controller ids must be unique within one page and may repeat across separate page runtimes.

| Public responsibility | Provisional candidates, not existing new-runtime signatures | Semantic contract |
| --- | --- | --- |
| Source-relative access | `getFormHandler()` (legacy) / `getForm()` | Nearest owning controller, or absence; no page global singleton |
| Reusable validation service | `genro.vld.validate(...)` (legacy vocabulary) / `genro.vld.validateField(...)` | Evaluate a field through the common engine, with owned lifecycle |
| Controller commands | retain `load`, `save`; `reset` / `restoreBaseline` | Promise outcomes; reset meaning explicitly approved |
| Current state | `state` / `formState` | Observable snapshot, distinct from record data |
| Persistence selection | `store` (legacy vocabulary) / `persistence` | Inject adapter or resolve registered adapter name |
| State binding scope | `controllerPath` (legacy) / `formStatePath` | Optional Bag projection outside draft subtree; no dirty feedback loop |
| Widget capabilities | `readCandidate` / `getEditValue`; `setValidationState` / `applyValidation` | Typed parse outcome and accessible rendering; focus/dispose hooks |

New names must be selected by the owner before publishing grammar or exports. Keep low-level field registration internal unless an actual custom-widget consumer requires it.

Register participating value/checked bindings in the nearest form, keyed by stable source identity plus property, not only data path. Multiple controls may edit one datum; aggregate all their issues without duplicate writes. Reject implicit participation for bindings outside the form subtree. Containers provide scope without becoming fields. Field removal clears owned issues and pending work; it does not delete data. Nested independent form controllers sharing/overlapping draft ownership are deferred and should be diagnosed initially.

Proposed state dimensions: dirty, valid, pending count, ordered field issues, form-wide issues, loading, saving, locked/read-only, and unsynchronized editor edits. `valid` is false until required current checks complete; warnings alone leave it true. Dirty compares data to baseline; unparseable editor text can leave dirty false but still blocks save and counts as an unsaved edit. Lock/read-only does not erase errors or data. Focus-first-invalid skips unavailable/hidden/disabled controls and otherwise focuses an accessible form summary.

### Baseline, equality and mutation

Maintain detached typed snapshots: persisted memory value, live draft and baseline must not share mutable nested Bags/attributes. Initialize baseline after normalization; validating initial data may reveal errors without making the form dirty. Reset restores baseline including insertions/deletions and discards editor-local drafts, invalidates async runs, then revalidates. Reset can therefore restore invalid baseline data and still block save.

Recommend structural typed equality: distinguish null, empty string, 0, false, numeric strings and missing nodes; compare ordered Bag nodes recursively by label, type, value and persisted attributes. Compare dates by their declared kind/value (including date-only versus datetime), not formatted display; equivalent separately allocated dates/Bags are equal. Scalar signed-zero and unsupported/nonfinite values require an explicit codec/type policy; do not silently stringify them. Derived validation/display/runtime metadata is outside this comparison. Persist user attributes by default, with a documented exclusion set; do not copy Item.load_memory's blanket attribute stripping.

Reverting to baseline clears dirty. Insert/delete/reorder/attribute changes count when they affect persisted structure. The comparator never uses loose `==`. Null and empty can compare unchanged only because the active normalization produced the same stored type/value on both sides; no unconditional comparator exception. On external Bag events recompute affected state; before save, re-read the complete snapshot to catch silent writes or changes to unregistered data. Unsupported lazy/resolver values must be rejected or explicitly materialized, not fetched implicitly by the comparator.

### Load, save and persistence ordering

Proposed adapter protocol, semantic pseudocode with provisional operation names:

```text
load(context) -> Promise<{ data: detached Bag, revision?: opaque token }>
save(detachedSnapshot, context) -> Promise<{ revision?: opaque token }>
```

Context includes operation identity and cancellation signal; adapter instances can own their memory location. The initial adapter promises to save the exact supplied snapshot. Adapter-side canonicalization/returned replacement records is a later explicit contract, not a silent merge. No record envelope, pkey sentinel, HTTP or RPC requirement.

Memory load returns a deep copy; memory save replaces its stored snapshot with a deep copy, so deletions persist and later editing cannot mutate stored data. The controller owns baseline changes. Failure leaves live draft and baseline intact; report persistence failures separately from field validity and allow retry. Memory can resolve immediately but follows the same Promise interface.

Load while there are unsaved data/editor edits returns a needs-discard outcome unless caller explicitly requested discard. Loading excludes save and editor commits; also compare data revision before installing a reply so programmatic writes cannot be overwritten silently. Failed/stale load leaves the current draft intact. Successful load installs normalized data and baseline together, resets editor drafts and starts validation.

Save performs this ordered gate:

1. Request commit/parse of active editors; do not rely on blur having fired. Capture the current data/config/dependency revision.
2. Validate the full participating draft, including untouched required fields and external changes. Parse failures, blocking field/form issues or current pending checks return a blocked outcome; the adapter is not called. Async completion enables a later explicit save; no surprise deferred persistence.
3. Once checks are current, capture an immutable snapshot and ensure no revision changed between validation and capture. Reject a concurrent save as busy. Lock/read-only also blocks persistence. Warnings do not block.
4. Save that snapshot. On success, use exactly it as the new baseline. If data changed during the request, preserve those edits and compute dirty against the saved snapshot. On failure keep the prior baseline. Owner disposal prevents later callbacks/state changes even if the adapter cannot undo an already completed write.

Recommend allowing edits during an in-flight save but refusing overlapping load/reset/save until that operation settles. A successful save of revision A must not clear errors or edits introduced in revision B. A no-change save can return an unchanged outcome without invoking the adapter. Legacy `allowSaveInvalid` is intentionally not part of this core: it contradicts the requested persistence gate.

## 4. Implementation order and acceptance contracts

This is an implementation sequence to review, not a new `.phased/` workflow or authorization to code. Each step adds public behavior only after its relevant decisions below are approved.

| Step | Deliverable / owner boundary | Required proof |
| --- | --- | --- |
| 1 | Approve spelling, routing, source ownership and state/adapter entry points | Contract cases written before runtime changes, distinguishing current behavior from new behavior |
| 2 | DOM common decoration and explicit box; matching Python grammar in its owning builder integration | Multiple relative children, one datapath application; automatic/explicit routing, 18px field versus unchanged label; dynamic captions/borders; focus/selection/id/event ownership; grid/flex sizing and nested boxes |
| 3 | DOM parse-result seam, `blankIsNull`, ordered local validation, accessible issues | null/empty/0/false; parse failure versus typed invalid draft; zero rule parameters, conditions, severity/messages, first error, transformation order, source context, executor return values |
| 4 | DOM Bag form controller and memory adapter; Python declaration support | Registration/removal; initial invalid data; typed equality/revert/delete/attributes; baseline reset; memory independence; load failure; save block including focused editor text; warnings-only save |
| 5 | Dependency revalidation, async validation and adapter races | Stale value/path/config/dependency/owner replies ignored; pending save blocked; rejection/timeout; no duplicate effects; edits during save remain dirty; duplicate saves busy; late load cannot overwrite edits |
| 6 | Complete cross-language conformance and browser checks for these three features | Same observable scenarios in JS-authored and Python-serialized recipes, JSON and MessagePack; no runtime behavior inferred from grammar acceptance alone |

Python integration begins with each step, not only at step 6. Shared DOM logic must run without importing Python/Pages host modules; Pages contributes integration and transport verification. Do not vendor sibling source or reorganize repositories. Database/grid stores and host transports remain separate later work, not dependencies of memory forms.

Minimum fixture matrix for future contract tests:

- A parent scope, explicit titled `.contact` box, automatic labeled children, absolute and `#FORM` bindings, dynamic label style, multiple controls and a checkbox caption.
- Required text, case transformation, min=0/max, conditional rule, warning email and custom cross-field predicate. Include `notnull + empty` to lock down ordering and a returned replacement of false/0/null.
- Two forms with different `blankIsNull` policies: clear text, load empty text, revert, reset; distinguish missing node, null, empty, false, 0 and `'0'` without normalization.
- Delayed checks resolve in reverse order; delete/rebind the field, change a dependency without changing its value, load/reset, dispose form; no stale state or Bag writes.
- Snapshot A saved while draft B is edited; success/failure, nested deletion, typed attributes, active unparseable editor, direct data write and adapter rejection.
- Python serializes actual SourceBag via TYTX; JS uses `loadSource` and the same Application/collections. Callback bodies/registered names remain serializable declarations, not attempted Python function transport. Both languages use the same result assertions. Verify attribute case/boolean/zero preservation and rejection of unsupported rules.
- Browser checks: computed styles, outer layout and focus continuity; actual accessible name/message relationships within/across shadow roots and a keyboard/screen-reader pass. jsdom alone does not prove these presentation/accessibility outcomes.

## 5. Decisions to approve before new APIs

| Decision | Recommendation | Alternative / tradeoff |
| --- | --- | --- |
| Box spelling and source mechanism | `labledBox`, rendering-owned automatic decoration; optional corrected alias later | Explicit source expansion resembles legacy but risks identity/path churn |
| Prefix/alias/default precedence | Routing table above, child presence wins, retain per-entry left/top defaults | One uniform default breaks at least one existing authoring path |
| Empty normalization | Inherited `blankIsNull`, default false; normalize load and commits before baseline | Default true eases legacy migration but changes current Pages empty values |
| Invalid drafts | Allow typed invalid data inside forms, reject outside; parse text never fabricated | Configurable outside-form drafts need a further public policy |
| Validation compatibility | Keep rule order; pure case transforms, typed comparisons, overridable email severity | Exact old coercion/rounding/case history needs an explicit compatibility mode |
| Callbacks/dependencies | Pure evaluation, explicit dependencies; accept/reject effects only for current commits | Replaying effects on every revalidation risks loops; automatic dependency capture needs more machinery |
| Form creation/state access | Explicit controller creation; retain marker semantics; state outside record | Automatic creation from every existing formId is convenient but changes behavior |
| Reset/equality | Restore typed baseline; structural equality; metadata exclusions explicit | Retaining legacy reset name with legacy meaning requires a separately named restore command |
| Save pending/races | Pending returns blocked; edits during save allowed; no overlapping operations | Save can await validation, but then must guarantee validation of the final saved revision without surprise writes |
| Public names | Select among candidates in section 3 and dependency names in section 2 | Do not add aliases/exports merely to postpone the naming decision |

## 6. Verification performed for this proposal

Source review plus existing focused tests only; no new feature implementation or tests written.

- Authoritative DOM worktree: `node --test tests/widget-labels.test.js tests/abs-datapath.test.js` — **44 passed**.
- Canonical Pages: existing `tests/test_widget_labels.py`, using the documented `GENRO_CLIENT_MODULES=temp/client-releases-20260908` assembly and experimental Builders PYTHONPATH — **2 passed**, JSON and MessagePack. These tests build a real Python recipe, deserialize into JS, mount it and assert label/control identity and reactive updates. That assembly is a disposable experimental DOM snapshot, not an upstream release.
- Tests were run with pytest cache and Python bytecode writes disabled. No full-suite, new-feature, actual-browser or assistive-technology validation was performed in this task. Passing existing label/path checks does not establish explicit boxes, common validation, normalization policy or forms as implemented.
