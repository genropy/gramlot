# 7. Closing addendum: concurrent form and validation implementation

Version: 0.1 · 2026-09-08 · 🔴 DA REVISIONARE.

[Return to manual](README.md)

## In this chapter

- [Why this addendum is necessary](#why-this-addendum-is-necessary)
- [Later source read at close](#later-source-read-at-close)
- [New Python/JS integration surface](#new-pythonjs-integration-surface)
- [Reading the rest of the manual after this change](#reading-the-rest-of-the-manual-after-this-change)

## Why this addendum is necessary

Another development task changed the authoritative DOM worktree during this documentation analysis. Initially D `src` and served assembly C `genro-dom-js/src` matched. At the closing comparison they differed, and D contained new form, validator, field-policy and labelled-box code. P also gained `form`/`labledBox` declarations and form integration tests. This manual must therefore describe **two observed states**, rather than falsely treating the worktree as frozen or promoting unverified new work to the tested baseline.

Chapters 1–4 describe the runtime read initially and tested in C. The 100 Pages, 184 DOM and 3 RPC results apply to that run and its collected tests. Newly added `tests/test_forms.py` was not in the initial collection of 100 tests. No existing test result in this document is evidence that the new form implementation passed its own acceptance criteria.

`observed-state.json` captures an earlier traversal of repositories; some concurrently created files already existed by that traversal. It is not an atomic checkout snapshot. `closing-state.json` separates C runtime hashes from current D/P hashes so this distinction survives the conversation. Direct links to D open its current, potentially newer source; consult C and the recorded hashes to identify the tested implementation.

## Later source read at close

| New / changed D module | Symbols read | Observed responsibility and state |
| --- | --- | --- |
| `src/forms/service.js` | `FormService.start/schedule/sync/commit/getForm/publishState/dispose` | Page-owned field/controller maps, Data/Source subscriptions, queued reconciliation, unique form identity checks and projected controller state |
| `src/forms/controller.js` | `FormController.initialize/load/save/restoreBaseline/state/dispose` | Bag scope, detached baseline, store interface, dirty/valid/pending/loading/saving state, operation serial and AbortController |
| `src/forms/field.js` | `FormField.sync/readCandidate/commit/render/dispose` | Source-owned field path/configuration, typed candidate parsing, validation issues, editor dirty state, async generation/signature protection and widget feedback |
| `src/forms/validator.js` | `Validator.validate/_run/_rule/_accept` | Ordered local rules, transformations and issues; custom async callbacks; explicit adapter requirements for DB/grid rules |
| `src/forms/value-snapshot.js` | `ValueSnapshot.copy/equal`, `MemoryStore.load/save` | Typed detached Bag/Date/array/plain-object snapshots, strict comparison and in-memory persistence; reject cycles/resolvers/unsupported instances |
| `src/collections/forms.js` | registered `forms` collection, `GnrForm` | `form` grammar maps to `gnr-form`, slot/group and validation summary |
| `src/recipe-policies.js` | `RecipePolicies.getAttributes/getValue` | Inherited label/blankIsNull policy and selected `fld_*` defaults, evaluated in declaring scope; blocks identity/path defaults |
| `src/application.js` | new `FormService` / `Validator` integration, `_writeMutation` split | Form/field participation before writes and at mount/dispose; no longer identical to C Application |
| `src/source-bag.js` | `getFormHandler`, changed policy attributes | Source access to form ownership and controller metadata |
| `src/services/recipe-runtime.js` | new `evaluate`, changed `run` | Value-returning source-scoped callback evaluation, callable support and expanded reserved-word filter |
| `src/collections/layout.js`, `widget-label.js` | changed label/container implementation | Labelled-box work accompanies the new policies; not covered by the old C label tests |
| Builder/handler/renderer/target/input modules | integration changes | Field-aware rendering and synchronization under active development |

The new service identifies a portable form by `nodeTag='form'` and `_meta.render_tag='gnr-form'`; a generic HTML form or mere formId marker is not automatically that controller. It rejects duplicate/missing form IDs, nested form ownership, a changed form datapath and a field outside the form's subtree in the inspected version. `controllerPath` projects state outside the form data and rejects overlapping paths. These are observed implementation checks, not ratified final API promises.

The controller separates dirty, valid, pending, editorDirty, locked, loading, saving and persistenceError. Save flushes editors, blocks invalid/pending/locked state, snapshots the actual saved draft, and updates baseline to that snapshot after success so later edits can remain dirty. Load can require explicit discard, checks operation identity and detects concurrent data changes. The default store is memory-backed. Dispose advances operation serial and aborts work. These mechanisms are present in source, but their comprehensive correctness and browser behavior were not established by this manual's earlier tests.

The validator follows the familiar ordered rule list but deliberately uses strict finite numeric checks for min/max and rejects database/grid rules without separate adapters. `remote` currently requires an injected function rather than an RPC method name. `call` and custom callbacks can return Promises; the field layer owns effects and staleness. This is already more than a design document, but remains new uncommitted work in D, not proof of complete legacy compatibility or integration into the active served assembly.

The new `ValueSnapshot` excludes specific transient validation/display metadata from persisted copies, retains scalar type distinctions, and has explicit supported object families. That is a more specialized contract than arbitrary Bag transport: a successful TYTX round trip does not prove a value is accepted by the form snapshotter.

## New Python/JS integration surface

P `src/genro_pages/widget_test_builder.py` now declares `form` and `labledBox` in addition to the earlier verticalSlider addition. New P `tests/test_forms.py` and `tests/forms.mjs` describe Python recipes crossing JSON and MessagePack to the common form lifecycle; D has `tests/forms.test.js`. The inspected Python test includes `formId`, `datapath`, `controllerPath`, `blankIsNull`, nested labelled box, local/callback/async validation and memory save.

Those files are **new work observed**, not examples declared executable with C as currently assembled. Merely adding the Python grammar does not load the DOM forms collection in GalleryBuilder or replace the active client snapshot. Before adopting it, verify the actual client module root, required collection import, direct DOM tests, both Python transport cases, source removal/disposal, async stale results, focus and baseline/save semantics.

## Reading the rest of the manual after this change

Statements such as “no general validator/form service exists” and “blankIsNull/labledBox are proposed” apply to the **tested C baseline**. They do not describe the newer D worktree globally. The original review document remains a proposal; the closing worktree now contains an implementation attempt for part of it. The owner's approval status, completion and release are not inferred from file appearance.

The proposed repository/adapter design in Chapter 5 remains independent of whether these form modules are accepted. A portable form would naturally stay in the browser GUI package, with persistence adapters optional. It must not introduce a database or WebSocket requirement into basic page rendering.
