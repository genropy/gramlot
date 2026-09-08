# Labeled boxes, validation and memory forms — implementation record

Version: 1.0  
Last updated: 2026-09-08  
Status: 🟡 Approved behavioral decisions implemented in the experimental checkouts; implementation review and upstream release remain separate.

## Scope and approved decisions

The owner approved proceeding with `labledBox`, explicit `form(...)`, source
`getFormHandler()`, `store`, `controllerPath`, and `restoreBaseline()`.
`blankIsNull` defaults to false, is inherited, and never makes the comparator
loosely equate values. Local rules keep the legacy order, numeric limits are
strict finite numbers without implicit coercion/rounding, and email defaults to
a warning with an explicit severity override. Forms retain typed invalid drafts
but never save blocking errors or pending checks. Save does not automatically
resume when validation completes.

The implementation is in the authoritative DOM worktree and canonical Pages
checkout. Existing working changes were preserved; no repositories were moved,
no dependency releases were changed, and no commit was made over the pre-existing
mixed working tree. Inspector, Rosetta, gallery, manual and database features
were not extended. The temporary browser harness is a verification artifact.

Input documents: [original review](../labeled-box-validation-form-review-20260908.md)
and [contract proposal](../labeled-box-validation-form-contract-proposal-20260908.md).
The owner's subsequent approval selects the alternatives above; other hypothetical
aliases or services in the proposal are not implied public APIs.

## Implemented surface

The client builder requires the existing `inputs` and `layout` collections and
the new `forms` collection. Import their ES modules before mounting, as with the
other collections. `labledBox` belongs to `layout`; requiring `forms` selects the
portable `form` recipe rather than the generic HTML form element. `formId` on an
ordinary container remains a path marker and does not create a controller.

The current Pages Python authoring integration, `WidgetTestBuilder`, declares
both new container tags. Their metadata is resolved by the same JS collection
grammar after `loadSource`; Python does not construct hidden wrappers or run a
second validator. Custom Python builders can declare equivalent container grammar
through the existing builder mechanism.

```python
root.data("draft", Bag(dict(name="Alice", age=20)))
form = root.form(formId="contact", datapath="draft",
                 controllerPath="forms.contact", blankIsNull=True)
box = form.labledBox(label="Contact", datapath=".address",
                    box_border="1px solid silver", box_c_padding="8px")
box.textBox(value="^.city", lbl="City")
form.textBox(value="^.name", lbl="Name", validate_notnull=True)
form.numberTextBox(value="^.age", validate_min=0)
form.button("Save", action="this.getFormHandler().save();")
```

Native JS uses the same recipe names and keyword object notation. Recipe callback
bodies remain JavaScript in both authoring languages; Python callable objects are
not transported as executable callbacks.

### Labeled boxes

- Explicit boxes and automatic `lbl` decoration share `WidgetLabel`; they keep
  source identity and the original host/control rather than rewriting source nodes.
- Box `datapath` resolves once. The automatic decoration adds no scope. Relative,
  absolute and `#FORM` bindings continue to use the existing source resolver.
- `lbl_*` styles the caption, `box_*` the shell, `box_l_*` a label region and
  `box_c_*` the content region. Specific box prefixes are extracted first.
- Explicit boxes use `label`/`label_*`; caption style aliases `lbl_*` remain
  accepted with canonical `label_*` precedence. Conflicting `label` versus `lbl`
  texts and explicit `side` versus `lbl_side` are configuration errors.
- Automatic decoration retains left as fallback; explicit boxes use top.
  `lbl_position` wins over side selection. Inherited label defaults are evaluated
  in their declaring source context.
- `fld_*` supplies immediate child defaults (or defaults for the wrapped widget).
  Explicit local presence, including false, zero, empty and null, wins. Structural
  binding/identity defaults are rejected. Defaults do not rewrite child source attrs.
- Explicit box appearance is routed to the shell once; host sizing/placement stays
  on the host. CSS keyword properties override an explicit style string independent
  of attribute insertion order. `box_border` overrides unprefixed box border.
- A field's font does not grow its caption. Same-root native label association is
  retained, and multi-child boxes are named groups. This implementation does not
  add arbitrary cross-shadow-root labeling for unknown third-party controls.

### Validation

`genro.vld.validate(sourceNode, value, context)` returns a result or a Promise of
one. The normal recipe route goes through the registered field owner, which
handles presentation, writes, callbacks and stale results. Direct evaluator calls
do not register a field or commit effects.

Results carry `value`, `modified` and ordered `issues` (rule, code, severity,
message). Field-owned state adds identity/path and pending status. Warnings do
not block writes or save. Rules stop on the first blocking failure.

Supported: selection capability, notnull, empty replacement, deterministic case
conversion, length, min/max, email format warning, regex including `!` negation,
and custom call. Preserve conditional `_if`, severity/message overrides, code
messages, and zero parameters. `empty` remains after `notnull`. The email rule
is a deliberately small local format check, not delivery or RFC certification.
Length uses JavaScript string length. Numeric strings are not silently coerced.

`validate_call` may be a JS function or a serializable JS body returning the
legacy true/null/false/code/result-object forms, synchronously or asynchronously.
Callback `this` is the source node. Function arguments are `(value, parameters,
signal)` for custom rules; rule parameters include the current validation config.
`validate_remote` accepts an injected function; string RPC method names are rejected.
Database `nodup`/`exist` and grid `gridnodup` produce explicit unsupported-adapter
errors. Arbitrary returned data patches are rejected rather than applied implicitly.

`validate_depends` accepts an array of paths or a comma-separated path list.
Reactive validation parameters are also reevaluated. Custom reads must declare
such dependencies; dynamic GET tracking is not claimed. Dependency transformations
reconcile in bounded passes and non-convergence becomes a blocking issue.
`validate_timeout` is in milliseconds (default 10000). Rejection/timeout blocks save.

Every async completion checks source membership, generation, binding path, value,
configuration and dependencies. New typing invalidates old work before blur;
removal, rebinding, load, restore and disposal also invalidate it. Superseded replies
cannot write data, clear newer pending state or invoke callbacks.

`validate_onAccept`/`validate_onReject` execute on a scheduled turn only for current
user commits, with `(value, result, validations, rowIndex, userChange)`; scalar
forms have no rowIndex. Passive checks do not replay these effects. Rule callbacks
are expected to be pure; application effects belong in exit callbacks.

Parsing precedes normalization and validation. Numeric `badInput`/nonfinite editor
values stay local. Native selection editors expose selection validity. Explicit
`dtype` conversion uses TYTX; date/time values get appropriate editor text.
`blankIsNull=True` converts exactly the empty string, before validation and baseline
capture. A normalization-policy change on an existing form requires explicit load
or `restoreBaseline()` before editing/saving can continue.

Blocking invalid state and a persistent message are attached to the actual input,
with `aria-invalid`, `aria-busy` and an owned `aria-describedby` entry preserving
other help associations. Error background composes with the existing null state.
Removing validation ownership removes its messages, attributes and listeners.

### Form and persistence

`this.getFormHandler()` returns the nearest explicit controller or null. Controller
commands return Promises with outcome objects:

- `save()`: saved, unchanged, blocked, busy, failed, disposed or obsolete.
- `load({discardChanges: true})`: loaded, needs-discard, conflict, busy, failed,
  disposed or obsolete. Discard must be explicitly requested for unsaved edits.
- `restoreBaseline()`: restored, busy or disposed; restores data and revalidates.

`state` exposes dirty, valid, pending count, errors, warnings, loading, saving,
locked, editorDirty and persistenceError. `formErrors` is an observable Bag for
form-wide blocking messages. `controllerPath` optionally projects state into a Bag
outside the draft. Warning/error/pending state is not persistence data.

A form requires a page-unique formId and a Bag subtree. Overlapping/nested form
ownership and fields outside their form subtree are rejected. `#FORM.x` continues
to address x under the form scope; no implicit `.record` level is introduced.

The default `store='memory'` keeps detached snapshots. A custom JS store provides:

```javascript
load({signal, operationId}) // Promise<{data: Bag}>
save(snapshot, {signal, operationId}) // Promise<result>
```

Save persists the supplied snapshot exactly; returned canonicalized records are
not silently merged. Memory save replaces its snapshot, so deletions persist.
The baseline advances only on success to the snapshot actually saved. Changes
made during save remain dirty. Failed persistence leaves draft/baseline intact.
Concurrent load/save/restore commands return busy. Starting a load cancels older
field validations and disables participating editors; concurrent programmatic
writes make the load result a conflict instead of overwriting them.

Dirty comparison is structural and typed over detached Bag values/attributes,
including node order, insertions and deletions. It distinguishes a missing node
from an explicitly written null, null from empty, false from zero and numbers from
numeric strings. Reverting clears dirty. Dates compare by time plus carried own
metadata; node dtype attributes are retained. The existing TYTX codec can infer
Date kind from its value, so preserving distinctions not carried by that codec
requires explicit dtype metadata; this task does not change TYTX.

Runtime `_validationError`, `_validationWarnings`, `_displayedValue`,
`_formattedValue` and `_loadedValue` attributes are excluded from snapshots.
Other user attributes remain. Resolver-backed values must be materialized explicitly;
unsupported object classes/cycles are rejected. Custom-widget parsing capabilities,
subforms, grids, database stores and server-specific protocols are not implemented.

## Files and reproduction

DOM root: `/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js`.
New modules are `src/forms/{service,controller,field,validator,value-snapshot}.js`,
`src/collections/forms.js` and `src/recipe-policies.js`. Integration updates the
existing application/source/renderer/label/collection modules. Public behavior is
covered in `tests/forms.test.js` alongside the existing suites.

Pages root: `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages`.
Changes: grammar in `src/genro_pages/widget_test_builder.py`, plus
`tests/test_forms.py` and `tests/forms.mjs`.

The isolated test assembly is
`/Users/gporcari/Documents/ChatGPT/genro-pages/temp/forms-client-20260908`.
It contains a disposable copy of authoritative DOM src/tests and uses the existing
released Bag JS/TYTX artifacts and node_modules. A direct DOM-worktree symlink was
replaced because non-loader tests otherwise loaded two different Bag constructors.
The existing demo assembly and running demo configuration were not overwritten.

```sh
# From authoritative DOM:
node --test tests/*.test.js

# From canonical Pages:
PYTHONDONTWRITEBYTECODE=1 \
GENRO_CLIENT_MODULES=/Users/gporcari/Documents/ChatGPT/genro-pages/temp/forms-client-20260908 \
PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src" \
.venv/bin/python -m pytest tests/ -q -p no:cacheprovider
```

The full Pages suite includes a local worker/socket test, which requires permission
to bind loopback ports. Browser verification used a narrowly served, isolated
static copy and a real Python-generated TYTX recipe, not a reconstructed JS recipe.
Observed: required-field save blocking, correction and memory save, restore to saved
value, incomplete `-` number retaining the old Bag value, native label focus, and
computed field/label font sizes of 18px/12px. Screen-reader and mobile device testing
remain distinct from this browser/AX inspection and were not performed.

## Verification outcome

- Standalone DOM full suite: **204 passed** (including 20 new form contracts).
- Canonical Pages full suite: **102 passed**, including the new Python form
  contracts for JSON/MessagePack and the existing worker/socket test.
- A final caption-style alias merge was checked with the focused label/form
  contracts and the Python integration checks after refreshing the disposable copy.
- Ruff on modified Python files and Git whitespace checks passed.
- Browser/AX evidence is recorded above; no screen-reader certification is claimed.
- Task-only DOM patch (against the initial working files, excluding pre-existing
  edits): `genro-dom-js/temp/forms-20260908/task.patch`. Original src files are
  backed up under the adjacent `before/` directory.

## Rosetta integration follow-up — 2026-09-08

The owner subsequently authorized connecting demo-rosetta. Its environment and
host defaults now select `forms-client-20260908`; a shared RosettaBuilder selects
`forms` in addition to the existing GalleryBuilder collections. Both bootstraps
use it, and source inspection/metrics expose the shared integration. Existing
comparison recipes remain unchanged.

Browser verification exposed delegated button commands inside slotted form
containers. The owning DOM runtime now locates the command button in the event's
composed path, preserving source-node lookup and disabled/hidden guards. The
selected dependency snapshot includes that fix; no runtime patch lives in Rosetta.

Final checks: 205 DOM tests, 16 Rosetta Python tests, 45 Rosetta browser tests,
and Rosetta Ruff passed. The two new browser tests feed actual serialized Python
source or a native JS recipe through their respective bootstraps. They verify
relative labeled-box scope, validation after field commit on focus change,
invalid-save blocking, memory save and baseline restoration. Test callbacks that
update presentation data asynchronously use `genro.live(...)`. Server restarted
on localhost:8026. Changes remain uncommitted and unreleased.
