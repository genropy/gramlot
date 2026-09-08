# Labeled boxes, validation and forms: legacy compatibility review

Version: 1.0  
Last updated: 2026-09-08  
Status: 🔴 DA REVISIONARE — findings verified against source; implementation recommendations remain proposals.

## Scope and outcome

Review of the local Genropy reference and the current experimental Pages/DOM runtime. This document does not implement the proposed refactor or declare legacy APIs supported. The useful portable unit is a form controller over a Bag, with registered fields, validation, change tracking and a replaceable persistence adapter. Database record machinery is a separate integration.

Reference root: `/Users/gporcari/Sviluppo/Genropy/genropy`.
Current DOM root: `/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js`.
Current Pages root: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages`.

## Source evidence

Paths in this table are relative to the legacy reference root. Line numbers describe the inspected checkout, not every historical version.

| Source | Relevant evidence |
| --- | --- |
| `gnrjs/gnr_d11/js/genro_widgets.js:834` | `gnr.widgets.labledbox`: label/content siblings, label and content styling, field defaults, mutable label/side |
| `gnrjs/gnr_d11/js/gnrdomsource.js:1918` | `buildLblWrapper`: automatic wrapping for lbl, attribute routing and layout ownership |
| `gnrjs/gnr_d11/js/gnrdomsource.js:2005` | Wrapper lookup and validation classes |
| `gnrjs/gnr_d11/css/gnrbase_css/19_gnr_labledbox.css` | Separate label/content layout and error presentation |
| `projects/gnrcore/packages/test/webpages/gnrwdg/gridbox.py:189` | Explicit Python `labledBox(...).textbox(...)` example |
| `gnrjs/gnr_d11/js/genro_widgets.js:1420` | Input write path: blankIsNull, validation, form/non-form behavior |
| `gnrjs/gnr_d11/js/genro_frm.js:2207` | GnrValidator and ordered validation rules |
| `gnrjs/gnr_d11/js/gnrlang.js:575` | isNullOrBlank means null, undefined or empty string; not whitespace, zero or false |
| `gnrjs/gnr_d11/js/genro_frm.js:28` | GnrFrmHandler scope, state and lifecycle |
| `gnrjs/gnr_d11/js/genro_frm.js:382` | Field registration/unregistration |
| `gnrjs/gnr_d11/js/genro_frm.js:1298` | Save gate and dispatch |
| `gnrjs/gnr_d11/js/genro_frm.js:1748` | Change comparison uses loose equality and null/blank equivalence |
| `gnrjs/gnr_d11/js/genro_frm.js:1989` | Form validity/status aggregation |
| `gnrjs/gnr_d11/js/genro_frm.js:2541` | Form-store adapter base |
| `gnrjs/gnr_d11/js/genro_frm.js:3143` | Item.load_memory and subsequent save_memory: forms already work with an in-memory Bag |

## Current implementation and agreed direction

Current DOM has shared label rendering in `src/widget-label.js`, null handling in `src/input-null-state.js`, and input adapters in `src/collections/inputs.js`. Labels are currently internal to the widget shadow structure; the font-size fix alone is not a full legacy wrapper implementation. Some controls have native validation, including filteringSelect validity, but there is no shared legacy validate_* dispatcher or portable form controller in the reviewed runtime.

Pages `js/src/inspector-editor.js` provides a typed property grid with explicit Apply, conflict checks and restoration on failed runtime mutation. That is not the future general validation engine.

Already implemented: keyboard-only null assignment, no Set null button, distinct scalar null state, preservation of explicit empty strings in the new input path. Owner directions still requiring implementation include native checkbox dash presentation, independent invalid styling, configurable empty-to-null normalization and view_null, and inspector focus-out commits through appropriate typed widgets. The current checkbox sets indeterminate but its custom null styling still needs adjustment to expose the requested conventional dash.

## Labeled box recommendation

Preserve the established recipe spelling `labledBox` for compatibility. Any corrected spelling should be an explicit alias, not a silent replacement. Explicit labeled containers and automatic lbl wrapping should share one implementation.

The legacy wrapper separates title, content and layout. It routes lbl_* to label_*, supports box_l_*, box_c_* and fld_* defaults, and moves grid placement to the wrapper. This is a better structural model than fixing inherited font properties individually. Widget font, color and size must affect the widget; label appearance must have its own attributes. A titled container may contain several children and its own datapath.

Required contracts before replacement:

- Resolve the container datapath once; keep child relative and absolute bindings unchanged.
- Preserve source/widget identity, action scope, subscriptions and focus during wrapping or label updates. Source inspection must represent the real structure consistently.
- Assign grid placement to the outer item and avoid duplicate container/wrapper borders.
- Preserve explicit child false, zero and empty-string attributes when applying fld_* defaults; do not blindly copy legacy null-or-blank fallback behavior.
- Document style precedence and inherited defaults. Legacy wrapper side defaults to top; do not silently change existing Pages left-label layouts.
- Define accessible labeling across shadow boundaries. An outer HTML label with a for attribute does not automatically label an input inside another shadow root.
- Show invalid state on the field and optionally its wrapper, while retaining distinct null styling.

## Validation compatibility inventory

The legacy validator runs rules in the following order. Preserve established names and meanings where supported; unsupported rules must produce a clear diagnostic rather than pretend to work.

| Rule | Legacy meaning | Proposed treatment |
| --- | --- | --- |
| select | Widget selection validity, including widget internals | Port contract through a widget capability; replace Dojo internals |
| notnull | Reject null, undefined and empty string | Portable core; zero and false remain valid |
| empty | Substitute a value for null/empty | Transformation; do not confuse with empty-to-null normalization |
| case | Upper/lower/title/capitalization | Portable transformation with specified string behavior |
| len | Exact length or min:max; skips falsy input | Portable; explicitly document empty handling |
| min / max | Numeric comparison rounded to nine decimal places | Portable intent; decide coercion, empty handling and rounding compatibility explicitly |
| email | Dojo email check, warning result by default | Replace implementation; preserve/document severity rather than silently making it blocking |
| regex | Pattern, optional leading ! negation | Portable; validate malformed patterns and explicit empty semantics |
| call | Custom validation callback | Use runtime callback/source scope contract |
| gridnodup | Duplicate detection within a grid | Later grid capability, not generic scalar validation |
| nodup / exist | Database existence/uniqueness through RPC | Service adapter; excluded from initial portable core |
| remote | RPC result may return error, warning, replacement value and data | Async adapter; no synchronous call assumption |

Also preserve or explicitly map validate_<rule>_if, _error, _warning, _iswarning and error-code-specific messages. Legacy evaluates validation attributes in source context, accepts transformed values, collects warnings and stops on the first blocking error. Parameter zero is meaningful and must not disappear in truthiness checks. onAccept/onReject and data changes require an explicit lifecycle; callbacks must run with the expected source context and without repeated side effects during revalidation.

### Empty normalization and null display

The legacy option already exists: **blankIsNull**, inherited from containers and enabled unless explicitly false. It converts empty string to null before validation in the input write path.

Retain this name for migration. The discussed empty_as_null option can be an alias, with documented precedence or a conflict diagnostic. It is not implemented yet. For current Pages, avoid silently changing existing empty-string behavior: a legacy-compatible container can explicitly enable normalization. The global default remains a compatibility decision.

view_null controls the visual/interaction distinction, not the stored type. The agreed proposed behavior is to default its special null presentation off when empty normalization is enabled, with explicit override possible. Backspace remains the gesture, without a Set null button. Checkbox null uses native indeterminate dash. Invalid and null classes remain independent; a null required field can carry both states. A subtle red background, aria-invalid and an associated message communicate invalidity without replacing the null indicator.

### Parsing, validation and writes are separate

Recommended sequence: raw editor text → typed parsing → empty normalization → transformations → validation → draft write policy → persistence gate.

Incomplete or unparseable numeric/date text stays in the editor and must not be stored as a fabricated typed value. A successfully parsed value may still fail a rule.

Legacy has a material policy distinction: inside a form, an invalid value can be written into its Bag while the form blocks save; outside a form, the inspected write path returns on validation failure. Define this deliberately instead of assuming all invalid writes must be rejected. A form draft can use the former policy. Inspector Source mutations still need rejection and restoration when they cannot produce a valid runtime structure.

Validation results should expose stable error codes, messages, severity and any proposed normalized value. Keep effects in the controller. Async validation needs pending state, cancellation or stale-result suppression, and field/source lifetime checks. Older results must never overwrite newer input. Dependency changes must revalidate cross-field rules without callback loops.

## Portable form concept

Legacy GnrFrmHandler is useful beyond database records. It owns form scope, registered fields, validation summaries, changed state, load/save operations, locking and focus on invalid fields. Its Item store already provides load_memory/save_memory.

Port the concepts in small modules behind the familiar runtime/source model:

1. A form controller scoped to a Bag datapath, with deterministic registration and disposal of fields.
2. Validation aggregation, warnings, pending state, field errors and form-wide errors; focus the first available invalid field.
3. Typed baseline/change tracking, including insertion, deletion and reverting changes.
4. Reset, load and save lifecycle with explicit hooks and operation state.
5. Memory storage first, then replaceable asynchronous load/save adapters that do not require a table, primary key or Genropy server.

**Change legacy equality:** its dirty tracking treats loosely equal values, and null versus empty, as unchanged. The new contract must retain type distinctions unless normalization intentionally made values equal. A change from null to empty is dirty in distinction mode; reverting to the baseline clears dirty. Specify comparisons for Dates, nested Bags and attributes, and which derived metadata is excluded.

Keep validity, dirty state, lock/read-only, loading and saving as distinct state dimensions. Prevent saves while validation is pending or blocking errors exist; warnings alone need not prevent save. Failed persistence retains the draft and dirty state. Changes made during an in-flight save must remain dirty relative to the snapshot actually saved.

Record clusters, relation expansion, database uniqueness/existence, record navigation, pkey conventions, grid editors and server RPC protocols belong to optional integrations. Subforms and grids can follow the scalar memory form. Do not bring legacy globals or synchronous RPC into the shared core.

## Suggested implementation order

1. Establish labeled-wrapper ownership, style and datapath conformance.
2. Complete shared input null/empty policy and independent invalid presentation.
3. Add typed parsing contracts and portable local rules with source-scoped callbacks.
4. Reuse these widgets in the inspector with focus-out commit; retain rejection/rollback for invalid Source changes. This does not require a database form.
5. Add the portable memory form: baseline, validity, reset and save callback.
6. Add asynchronous rules and persistence adapters, then optional grid/database integrations separately.

The next Rosetta example can extend the compact titled box with relative paths into a memory form: required text, a numeric range, normalization modes, invalid feedback, dirty state, reset and an in-memory save. Implement the same observable behavior idiomatically in Pages Python, Pages JS, React and Vue. No database is necessary.

## Acceptance cases for implementation

- Python and JS recipes exercise the same runtime behavior, including typed values crossing TYTX.
- Explicit and automatic labeled boxes preserve paths, IDs, actions, focus and layout; changing widget font size leaves label size unchanged.
- Empty string, null, zero and false survive binding correctly; inherited blankIsNull and per-field overrides work; alias conflict behavior is deterministic.
- Fresh Backspace on empty sets null; held keys, IME composition, readonly and disabled controls do not cause unintended writes. Checkbox shows dash for null.
- Invalid styling composes with null, clears after correction, and exposes an accessible reason.
- Rule order, parameter zero, conditional rules, warnings, transformations and first-error behavior have contract tests.
- Parsing failures remain local; configured invalid draft values are visible in Data and prevent save.
- Dirty state distinguishes types, clears on revert/reset, and survives failed or concurrent saves correctly.
- Late async results after a newer value, path change or source removal are ignored. Pending validation blocks premature save.
- Inspector focus-out changes notify through Bag APIs once, preserve types, reject invalid runtime mutations and handle external updates/removal without losing unrelated data.

## Decisions still to settle

Public aliases and attribute precedence; default normalization for new Pages recipes versus legacy compatibility; invalid-draft policy outside forms; exact coercion/rounding and email severity compatibility; form identity and controller-path conventions. These are proposal details, not implemented APIs.

This architecture can fit a future unified Python/JS GUI distribution, but this review authorizes no repository rename, move or dependency release. No runtime tests were rerun for this documentation-only review; earlier test results do not validate these proposed features.
