# First static grid alpha — 2026-09-11

Implemented the bounded first attempt requested in the static-grid handoff, using
two Sol agents for the collection engine and executable gallery, with root-owned
authoring, renderer integration and review. No commit or publication was performed.
Pre-existing CSS declarations and unrelated local work were preserved.

## Delivered contract

- `quickGrid(value=...)` normalizes to `grid(store=...)`; inline `column()` and an
  explicit columns list share one component and geometry model.
- A resident Bag adapter uses stable labels or an explicit identifier field,
  detects invalid/duplicate keys and owns mutation subscriptions.
- Typed display uses shared formatting. The viewport mounts a bounded range of
  fixed-height rows; it retains the component across Data/structure replacement.
- Single selection writes through `selectedKey`, accepts external changes,
  clears deleted keys and publishes `onSelectedRow` on the Source node.
- Two gallery cases run in both Python and JavaScript, including 50 mixed-type
  rows, null/empty values, external selection and a reactive amount update.

## Verification

- `node --test js/dom/tests/*.test.js`: 321 passed.
- Focused Python/grid/teaching checks: 7 passed, including Python TYTX hydration,
  the gallery catalogue and paired Python/JavaScript fixture comparison.
- Gallery hydration covers 62 cases across 30 component pages.
- In-app browser: checked Python and JavaScript first-row dates, reactive amount
  update to 9,999.99, external selection r037, click selection r002, keyboard
  selection r003, a 330px viewport, and scrolling through the fully visible last
  row r050. At the bottom, 13 data rows plus the header were mounted.
- Gallery JavaScript Run and Reset both reported `Changes applied`. During
  gallery loading the browser also logged a MutationObserver target error whose
  origin was not established; the standalone examples and tested gallery
  controls worked. This is not a claim of an error-free gallery console.
- `git diff --check` passed.

Tests cover insert/update/delete, whole-store replacement, old-store isolation,
disposal/reconnection, duplicate identifiers, invalid replacement rollback,
focus preservation and node-topic writeback. The Python fixture uses Decimal;
the JavaScript fixture uses exactly representable multiples of 1.25 as Number.
Their civil dates match through UTC date construction in the JavaScript fixture.

## Remaining scope

This is the 50-row first attempt, not completion of the entire incremental plan.
Editing, filters/search/sort, grouped headers/footers, calculations, configuration,
legacy nested struct grammar, IndexedDB and remote/paged stores are unimplemented.
The adapter indexes the resident data on changes; no large-data performance claim
or 50,000-row benchmark is made. Real mobile devices and other browsers remain
unverified. External selection does not automatically scroll into view.

The implementation guide is [static-grid.md](../guides/static-grid.md).
