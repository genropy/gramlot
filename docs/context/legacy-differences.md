# Intentional differences from GenroPy legacy

Updated: 2026-09-10. Maintain this register whenever the owner approves a legacy
compatibility exception. Unimplemented legacy features and accidental behavior
gaps are not approved differences: track them in the development audits.

| Topic | Legacy | Gramlot decision | Decision / implementation status |
| --- | --- | --- | --- |
| Continuous input updates | intermediateChanges | Replace the name; liveUpdate or live proposed by the owner, live recommended by the assistant | Rename authorized; final spelling, alias policy and interaction with current updateOn remain unsettled. Not implemented. |
| Label placement on widgets | lbl_side with top/bottom/left/right | lbl_position with L/R/TL/TC/TR/BL/BC/BR | Implemented locally with no old-name compatibility alias; omitted placement defaults to TL. Active defaults and tests use lbl_position. |
| Label placement on explicit labledBox | side with top/bottom/left/right | label_position with the same eight values | Implemented locally with no old-name compatibility alias. Inherited formlet lbl_position is translated at the explicit-container boundary; unrelated side attributes are unaffected. |
| Default initialization | Legacy startup can replace null/blank values with a nonblank default | Initialize missing data only; preserve present null, empty string, zero and false | Earlier explicit owner decision, implemented in RecipeDefaults. Both default and default_value remain accepted. |
| Empty text normalization | blankIsNull normalizes empty text to null unless explicitly false | blankIsNull is optional and false by default; explicit Backspace on an empty editor requests null | Earlier explicit owner decision, implemented in the input/field pipeline. |

## Boundaries

Keep the existing ^ and = binding syntax and Source representation. No new
binding helpers or escape syntax are approved. Preserve the labledBox spelling
and the legacy label/box attribute-routing model except for the position naming
change above. No default/default_value rename or T/A-only textBox restriction
is approved.

This is the initial register of identified owner-approved differences, not an
exhaustive certification of legacy parity. Continuous-update naming must not be
reported as a final live decision until the owner selects it.

## Evidence and maintenance

- [Owner decision register](decisions.md)
- [textBox legacy audit](../development/textbox-legacy-audit.md)
- [Label/box audit](../development/label-decoration-audit.md)
- [Current contract proposal](../development/textbox-contract-proposal.md)

For each future exception, record the old behavior/name, the approved replacement,
compatibility/migration policy and implementation status. Update the status only
after the runtime, recipes, documentation and relevant checks agree.
