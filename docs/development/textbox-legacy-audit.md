# textBox legacy compatibility audit

Date: 2026-09-10. Read-only source comparison; no browser execution or runtime
change. Owner decisions supersede legacy behavior where explicitly recorded.

## Evidence boundary

Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`, HEAD `418b4454a6`.
Findings refer to the working files read, not a certification of a clean commit.
Legacy source paths below are relative to that checkout. The widget layer is
`gnrjs/gnr_d11/js/`; inherited Dojo behavior was inspected in
`dojo_libs/dojo_11/dojo_src/dijit/form/`. This does not establish which Dojo
version every deployed legacy application loads. The Python legacy authoring
layer and exhaustive validation/label machinery were not audited in this pass.
Gramlot evidence refers to the current local working tree.

## Defaults: retain both names

Legacy `genro_src.js:stripDataNode` (around line 584) selects
`nodeattr['default'] || nodeattr['default_value']` for value pointers, and
`default_<attribute>` for other pointers. It handles both `^` and `=` pointers,
converts string defaults using dtype, and can write a nonblank default when the
current value is null/blank. The `||` expression means precedence depends on
truthiness, not merely the presence of `default`.

Gramlot `js/dom/src/recipe-defaults.js:initializeNode` also accepts both names,
but an explicitly present `default` wins even when false, zero, empty or null.
It initializes only missing nodes/attributes. Preserving present null, empty,
zero and false is an explicit recorded owner correction; do not undo it as an
incidental compatibility fix. Legacy also has a new-record form reset path for
`default_value` in `gnrdomsource.js` around line 1546; startup seeding alone is
not full form-default compatibility.

Outcome: retain both names. No canonical-name migration, alias removal, new
rejection of simultaneous attributes, or rejection of inert defaults is justified.
Document precedence and the already approved initialization difference.

## Bindings: passive does not imply readonly

Legacy `gnrdomsource.js:isPointerPath` recognizes `^` and `=`. Its
`registerNodeDynAttr` subscribes only `^`; `attrDatapath` strips either prefix.
`genro_widgets.js:connectChangeEvent/onChanged/_doChangeInData` writes to that
value path without requiring a reactive prefix or readonly passive controls.
Thus the draft's passive-value readonly restriction is not supported by the
source. Passive describes refresh subscription, not a prohibition on writeback.

Gramlot `source-bag.js:pointerType/runtimeToObserve` and
`application.js:_mutationWrite` retain this distinction: both pointer modes can
supply a write destination, while `^` registers observation.

Legacy also recognizes `==` formula attributes in
`gnrdomsource.js:getAttributeFromDatasource/registerNodeDynAttr` (around lines
607 and 903). They must not be accidentally rejected or conflated with ordinary
passive paths by a future schema. Full Gramlot formula parity remains unverified.

Outcome: retain existing strings and Source representation. No helpers, tagged
objects, new escape or readonly restriction. Keep literal type checking separate
from binding/formula recognition and resolved-value handling.

## dtype: no evidence for a T/A-only restriction

Legacy TextBox uses ValidationTextBox and does not declare a T/A whitelist.
Shared widget creation converts truthy `default_value` with dtype
(`genro_widgets.js` around line 182); startup seeding also performs conversion.
Plain TextBox change handling passes the editor value to shared data handling;
this does not prove arbitrary dtype parsing on every edit. Dedicated date/time
widgets have their own typed handlers.

Gramlot `_typedValue` retains a non-text conversion TODO outside forms, while
`forms/field.js:readCandidate` decodes non-text dtype through TYTX.

Outcome: record the existing inconsistency rather than forbid non-text dtype.
Exact legacy conversion expectations need focused execution before changing
writeback. A typed default alone does not certify a typed editor.

## Text editing options omitted from the initial draft

Legacy `genro_widgets.js:TextBox.creating` sets `trim` true unless explicitly
false. The inherited Dojo TextBox filter implements trim, uppercase, lowercase
and propercase; its attribute map forwards maxLength to the focus node.
`_BaseTextBox` also handles shortcuts, switch_* and _autoselect. TextBox supports
multivalue/multivalueCb and creates a tooltip child internally. Shared code
handles format/mask/displayFormattedValue.

Gramlot `collections/inputs.js:GnrTextBox` is a thin GnrInput subclass. The
inspected input implementation does not implement those text filters or forward
maxLength to its inner input. Accepting a keyword in Source does not make that
option operational. Do not confuse internal tooltip children with permission
for arbitrary authored children: the latter remains to be verified.

Dojo `_FormWidget` declares intermediateChanges false and uses it in change
notification; TextBox commits on blur. Gramlot's `Application._enableInput`
uses updateOn for text inputs and currently applies intermediateChanges only to
sliders. A legacy textBox recipe using intermediateChanges therefore lacks that
policy in the inspected Gramlot handler. Exact event timing across input, paste
and composition requires browser regression cases.

Outcome: preserve legacy option names in the contract inventory. Prioritize
trim and intermediateChanges as a small compatibility implementation candidate;
do not claim the other options already work or replace them with invented names.

## Null and validation: explicit exceptions and remaining scope

Legacy `_doChangeInData` converts empty text to null unless inherited
blankIsNull is exactly false. Gramlot `forms/field.js:validate` normalizes only
when blankIsNull is true. Gramlot's default false and explicit Backspace-null
interaction are already recorded owner decisions. Keep these exceptions visible.

The legacy shared change path calls validationsOnChange, records issues and
interacts with the form. Gramlot has its own field/validator pipeline. This
pass does not certify equivalence of all validation rules, callbacks, ordering,
async results or save behavior. Earlier approved form behavior remains in force.
Do not narrow valid validation names using a newly invented text-only whitelist.
Unavailable database/remote adapters remain explicit implementation gaps.

## Shared attributes: a closed list is premature

Legacy `gnrdomsource.js:_doBuildNode` extracts nodeId, gnrId, onCreated, tooltip,
connect_*, subscribe_*, selfsubscribe_* and formsubscribe_* before creating the
widget. Shared widget creation also processes onEnter, autocomplete and further
families. This is broader than the draft's four proposed attribute sets.

The proposed node_id vocabulary must not silently replace legacy nodeId.
A complete mapping needs the Python authoring layer, runtime naming and label/
formlet inheritance together. Keep explicit widget parameter documentation, but
do not reject the unclassified shared vocabulary before that inventory exists.

## Result and implementation boundary

No indispensable syntax or name change was found. The original proposal's
renames and restrictions should not be implemented. Build the contract from
verified behavior and classify each feature as implemented, missing, explicitly
corrected by the owner, or not yet verified.

Next bounded implementation candidate: legacy trim and intermediateChanges for
textBox, with Python/JS examples and tests for blur/live writes, trim=False,
null/empty and existing defaults. First verify the legacy event path and its
interaction with validation so this does not become an accidental form redesign.
Full dtype, formula, shared-attribute and authoring parity remain separate work.
