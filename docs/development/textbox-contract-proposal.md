# textBox declaration contract proposal

Updated: 2026-09-10. Revised after owner corrections and the
[legacy source audit](textbox-legacy-audit.md). This is a development proposal,
not approval of a new API or a claim of complete compatibility.

## Governing decisions

Preserve GenroPy legacy syntax, names and behavior unless a change is absolutely
indispensable. Modernization, consistency and implementation convenience are
insufficient reasons to break compatibility. Existing explicit owner corrections
remain in force. Discuss any indispensable incompatibility before implementation.

Keep `^` and `=` strings and their Source representation. No bind/read/literal
helpers or tagged value objects. A future escape may be considered if needed;
none is specified now.

## Purpose

Use textBox as the first documented Python/JavaScript widget contract. Explicit
parameters, inherited/shared attributes, binding-aware validation and generated
reference documentation should describe the supported legacy vocabulary. They
must not turn an incomplete attribute inventory into arbitrary rejection rules.
Generic Builders owns reusable grammar/schema mechanisms; Gramlot owns its
binding interpretation, widget behavior and browser conformance.

## Contract direction supported by the audit

| Concern | Direction | Current status |
| --- | --- | --- |
| Binding | Preserve ^ reactive and = passive syntax; passive values are not forced readonly | Both modes have a write path in inspected legacy and Gramlot sources |
| Defaults | Keep default and default_value, plus default_<attribute> | Both names exist; truthiness precedence differs |
| Initialization | Preserve existing null, empty, zero and false; initialize missing only | Explicit owner correction already implemented in Gramlot |
| dtype | Preserve the name and accepted usage; do not impose T/A-only authoring | Conversion differs between initialization, plain edits and form edits |
| Text filters | Retain trim, uppercase, lowercase and propercase vocabulary | Legacy implementation found; Gramlot input lacks these filters |
| Commit policy | Preserve intermediateChanges | Gramlot currently honors it for sliders, not textBox; updateOn already exists |
| Null policy | Preserve the explicit Gramlot default blankIsNull=False and Backspace-null decision | Deliberate recorded exception to legacy default normalization |
| Shared attributes | Inventory legacy names and families before enforcing a closed schema | Initial four-set draft was incomplete |
| Formula attributes | Account for legacy == expressions | Full cross-runtime parity not verified |
| Documentation | Distinguish working features, gaps, owner exceptions and unverified behavior | Do not present accepted kwargs as implemented behavior |

Existing syntax examples, without new helpers:

```python
pane.textBox(value="^.name", default="Ada", lbl="Name")
```

```javascript
root.textBox({value: '^.name', default: 'Ada', lbl: 'Name'});
```

These examples do not approve a new signature, namespace or transport schema.

## Withdrawn assumptions from the original draft

Do not introduce a canonical-default rename or remove aliases. Do not reject
simultaneous defaults, inert options, editable passive values, non-text dtype,
shared events or attributes merely because the original draft omitted them.
No strict resolved-type rejection policy or authoring child restriction has been
approved by this review. Legacy behavior must be established first.

Named attribute sets and portable schema export remain useful architectural
candidates. Their composition syntax, full contents and collision policy are not
finalized. Collection isolation defects identified by the
[grammar audit](grammar-foundations-audit.md) remain technical follow-ups; this
review did not repair them or change generic Builders.

## Next bounded work

1. Use the legacy audit as the compatibility baseline, completing the relevant
   execution checks before each behavioral change.
2. Start with textBox trim and intermediateChanges, preserving legacy names and
   the existing explicit null/default corrections. Verify blur/live updates,
   trim=False, validation interaction and Python/JS example parity.
3. Document supported parameters and observable gaps without claiming complete
   grammar coverage. Keep numeric conversion, formula parity, advanced text
   features and shared-attribute inventory as explicitly scoped follow-ups.
4. Introduce stricter declaration validation only when the accepted vocabulary
   and legacy extension behavior are known. Do not patch dependencies or publish
   a release as an incidental part of this work.

The [audit](textbox-legacy-audit.md) gives source locations and verification
limits. No runtime change or test-suite execution was performed in this review.

## Common decoration follow-up

See [label and box audit](label-decoration-audit.md) for the legacy mapping of
lbl/lbl_*/box_* to explicit labledBox and current Gramlot differences. These
belong to the shared contract, not a new textBox-specific syntax.

The owner explicitly permits renaming intermediateChanges, suggesting liveUpdate
or live. The assistant recommends live; the final spelling and handling of
existing updateOn/intermediateChanges have not been implemented or settled.
This is the explicit naming exception to the general legacy policy.

Owner follow-up: prioritize legacy behavior for label/box placement, attribute
routing and shorthand/explicit composition. Current Gramlot differences are
compatibility work, not alternative public semantics to preserve by default.

## Superseding owner decision: position-only label syntax

The owner selected lbl_position for widget decoration and label_position for
explicit labledBox (L/R/TL/TC/TR/BL/BC/BR), replacing label-placement lbl_side/side
without compatibility aliases. Earlier side mappings above describe the audited
legacy/current implementation, not the target syntax. Migrate affected recipes
and shared inherited defaults along with runtime, documentation and tests. Do
not change unrelated side attributes. Runtime migration remains pending.

## Widget reference scope

Keep the textBox reference focused on its own parameters and basic label usage.
Link to the dedicated labeled-container reference for the shared decoration
attributes; do not duplicate lbl/box history, routing or the complete catalogue.
