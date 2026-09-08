# Inspector focus-out correction

Date: 2026-09-08

The existing property editor kept input changes in a draft until Apply. It now commits on leaving a property row through the same typed validation, Bag notifications and runtime rollback path. Moving between name/value/type within the row keeps the edit open. Discard remains exempt from automatic commit. Controls remain mounted during commit to preserve the focus transition.

The disabled ARIA state now applies to the property cells, not their shared ancestor with the tree: empty selection must not make the tree inaccessible.

Verification: tests/test_inspector_editing.py passes for Python and JavaScript authoring (2 tests), including blur propagation to native and custom inputs, invalid-value rejection/correction and Source attribute rendering. The new blur regression failed before the correction. Browser verification on Rosetta Pages Python local-scope: editing sample.text to “Inspector aggiornato” and clicking Properties updated both Text and readonly MyText without Apply.

Existing tabs retain loaded JavaScript until reloaded. The user's original tab was left intact; browser verification used a separate tab. Apply remains available for explicit draft application. This change does not yet replace native editor controls with type-specific Genro widgets.
