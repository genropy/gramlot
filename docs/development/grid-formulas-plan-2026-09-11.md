# Grid formulas: implementation plan

Status: implemented by the delegated Sol agent; coordinator browser review remains.

## Goal and compatibility contract

Support legacy-style `r.cell(..., formula='quantity * price', calculated=True)`
in the Data structure Bag. Results belong in the record store, not only in DOM
cells. Preserve the current resident-store boundary and server independence.

Primary evidence to re-read before implementing:
- Legacy `gnrjs/gnr_d11/js/genro_grid.js`: setChangeManager, approximately 3890–3950.
- Legacy `gnrjs/gnr_d11/js/genro_wdg.js`: GridChangeManager, approximately 2014–2340.
- Local legacy root: `/Users/gporcari/Sviluppo/Genropy/genropy`.

## Work sequence

1. Confirm the precise legacy contract for formula, calculated, formula_* parameter
   resolution, dependencies, initial calculation and store/structure changes.
   Record verified behavior separately from intentional differences.
2. Implement a grid change manager over the existing collection-store API. Compile
   expressions once per definition. Evaluate with row fields, legacy parameters
   and context where supported; write via updateRowNode in bag and attr modes.
   Handle formula chains deterministically; reject dependency cycles without
   infinite updates. Avoid unchanged writes and reentrant recalculation storms.
3. Connect lifecycle and reactive changes: fields, inserted/deleted rows, store
   replacement, structure changes, hidden formula columns and dynamic parameters.
   Remove subscriptions on replacement/disposal and retain viewport/selection.
4. Cover the verified legacy special forms (`+=field`, `%=field`, `#`) for resident
   stores, including order/total changes. Verify legacy rounding and index semantics;
   do not invent apparently compatible behavior. Document any unsupported case.
5. Resolve numeric semantics explicitly. Python Decimal values reach JavaScript as
   decimal.js objects: native arithmetic operators do not guarantee decimal
   precision. Reuse available expression/numeric facilities when suitable; do not
   silently convert exact inputs to Number and claim precision preservation.
   Keep familiar legacy formula syntax where feasible and document any limitation.
6. Add an executable gallery example using ordinary grid plus
   GridStruct().view().rows().cell(), with inputs and calculated totals. Demonstrate
   both Bag-valued and attribute-backed records in Python and JavaScript. Preserve
   the two-page small/large gallery organization and existing working examples.
7. Run focused formula/store/transport/gallery tests and the DOM regression suite.
   Rebuild preview assets and perform a coordinator review/browser check.

## Acceptance checks

- Initial and changed inputs produce stored results in both datamodes, including
  off-screen rows; null/invalid expression behavior is explicit and tested.
- Chained formulas, cycles, unchanged results and reactive formula_* parameters
  have meaningful regression coverage.
- Structure edits/removal and replacement, store replacement, insertion/deletion,
  hidden cells and disposal do not leave stale recalculation subscriptions.
- Resident running totals and percentages respond to relevant data/order changes.
- Decimal policy is backed by a value exceeding IEEE-754 exact integer precision
  and a fractional arithmetic case; no unsupported precision claims.
- Gallery source matches executed code and displays result changes in Data.

## Scope boundaries and review

No remote stores, server formulas, SQL formulaVariant, cell editing subsystem,
selection-mode expansion, sorting UI or unrelated refactors. Preserve unrelated
working-tree changes. No commit or push requested. If a legacy feature cannot be
replicated safely within this resident-grid layer, report it precisely instead
of silently substituting an API. Sol implements and tests; the coordinator
reviews the diff and verifies the browser example before reporting completion.

## Implemented contract and verification

`GridChangeManager` now reads every formula definition from the structure Bag,
including hidden cells, compiles each expression once per structure revision and
writes results through the resident `BagRows.updateRowNode()` API. Formula fields
are ordered by their dependency graph. A dependency cycle rejects the structure
instead of entering a reactive loop. `calculated=True` retains its verified legacy
meaning: calculate the complete resident store when the structure or store is
installed; a formula without it leaves an existing initial value alone but still
reacts after one of its referenced fields changes.

The resident implementation deliberately corrects three legacy weaknesses:

- removing, inserting or moving rows recalculates `#`, `+=field` and `%=field`,
  because all three depend on store membership or order; the legacy delete path
  updated totalizers but did not rerun formula columns;
- formula chains use a deterministic topological order and cycles are rejected;
  the legacy manager depended on nested update notifications and had no explicit
  cycle contract;
- Decimal operands use a small Decimal-backed arithmetic evaluator rather than
  JavaScript coercion. It supports identifiers, numeric literals, parentheses, unary signs
  and `+`, `-`, `*`, `/`, `%`, `**`. Other JavaScript expressions still work for
  ordinary values. If one of their referenced operands is Decimal, an expression
  outside this grammar stores null and records a formula error instead of silently
  losing precision.

Null operands in ordinary formulas, and blank operands in Decimal arithmetic,
produce null. Invalid or throwing expressions also store null, matching the
legacy failure result. Aggregate
special forms ignore null/blank members; percentage of a zero or empty total is
null. `#` is the zero-based index in current resident Bag order. Display `places`
and `format` do not round stored formula results; this follows Gramlot's existing
separation between stored values and presentation rather than legacy `Math.round10`
coupling.

Store writes are batched so a 5,000-row initial calculation rebuilds the adapter
index and renders the viewport once. Reactive ordinary row formulas recalculate
only the changed row; parameter, structure, store and aggregate/order changes run
the necessary full-store pass. Replacement and disposal release store, structure
and parameter subscriptions.

Automated checks cover both datamodes, off-screen attribute rows, exact values
above IEEE-754 integer precision, fractional arithmetic, dynamic `formula_*`, a
hidden formula, chains declared out of order, cycles, unchanged writes, invalid
expressions, replacement/disposal and every resident special form. The generated
gallery now executes paired Python/JavaScript calculated examples on both grid
pages. The complete DOM run passes 338 tests. The grid/gallery/teaching Python
selection passes 8 tests. A complete Python run reached 107 passed and 1 skipped;
its only failure is the unrelated manual CLI server test because this sandbox
rejects binding even an ephemeral localhost port with `Operation not permitted`.
Assets and the 24-lesson/31-gallery-page preview were rebuilt. Final browser review
belongs to the coordinator, which owns the already-running preview browser.
