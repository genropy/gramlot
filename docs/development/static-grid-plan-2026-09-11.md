# Static Bag grid: incremental implementation plan

Status: proposed plan, not implementation. Owner direction as of 2026-09-11:
start with a complete resident Bag, no data paging. The grid talks to a store
contract; IndexedDB and remote page providers are future alternatives. Rendering
only visible rows is independent of paging and belongs to this plan.
This plan supersedes the initial delivery sequence in
`grid-architecture-proposal-2026-09-11.md`.

## Scope and architectural commitments

One grid renderer, two authoring forms: explicit reusable structure and quickGrid
with inline column declarations. Both Python and JavaScript normalize to the same
reactive structure. Reuse component descriptors, shared formatting, Gramlot input
editors, validation and the genro topic coordinator.

Keep five responsibilities distinct: structure, Bag-backed store/view projection,
viewport, edit session and calculation service. Headers, groups, body and footers
share column geometry. Stable row keys and column IDs must not depend on visible
position. UI actions change models, never only rearrange DOM.

The Bag adapter owns row representation and notifications. Rendering requests
visible ranges through the store surface, never walks the entire raw Bag or
rebuilds one Source node per record. Local view projections use keys to express
filtering/ordering without deleting or rearranging the original dataset.

No IndexedDB, workers, remote transport, replication, database schema grammar,
virtual-store editing or full Dojo multi-view layout in this implementation.
Do not simulate a paged backend as a prerequisite. Future adapters may extend
loading/error/capability semantics without exposing storage internals to cells.

## Phase 1 — First usable read-only grid

Deliver the component, descriptor/Python grammar and matching JS authoring, a
minimal structure normalizer and Bag store. Start with Bag-valued records;
encapsulate field extraction so attribute-backed rows can be added separately.
Define stable identity and detect duplicate keys. Proposed default is the row
node label, with an explicit identifier field option; confirm its public spelling
against the existing store discussions before coding.

Support explicit columns with field, name, dtype, width, format, mask, locale and
places, null/empty states and reactive data updates. Single selection writes back
and accepts external selection; focus is a row-key/column-id pair. Include an
onSelectedRow node topic with a documented payload. Support headers, scrolling
and a bounded row viewport from the beginning. Initial viewport uses fixed row
height; variable-height/wrapped rows are later work. Keep header/body/footer
geometry in a shared model, even before grouped headers are exposed.

Acceptance: executable Python and JS examples produce the same behavior; insert,
update, delete and whole-store replacement update correctly; selection survives
unrelated changes and is reconciled when its row is deleted; empty/null values
remain typed; disposal removes subscriptions. A 50,000-row/32-column synthetic
case has bounded DOM size and records first render, scroll and memory behavior.
Do not claim timing targets before measuring a baseline.

## Phase 2 — Live structure, groups and footer layout

Expose reactive structure changes, hidden columns, width changes, column drag
reorder, columnsets and explicit footer rows. Normalize both struct.view().rows()
.cell() and quickGrid.column() authoring into the same model; preserve a reusable
Python struct callback. Decide how the explicit JS structure is authored using
the same model, without a second renderer. Column IDs are distinct from field
names so repeated representations of one field remain possible.

Footer cells can show literals or Bag bindings; aggregation comes later. Proposed
noncontiguous group behavior is splitting the group into contiguous runs after
reorder. Offer a non-drag reorder path for keyboard use. Retain the original
structure for Reset, separate from the live customized structure.

Acceptance: resize/reorder/hide keep group spans and footer cells aligned;
external structure edits work like UI actions; column removal reconciles focus;
structure copy/restore preserves data types and stable IDs. Gallery cases show
all combinations, including horizontal scrolling.

## Phase 3 — Local sort, SearchOn and filterset

Implement typed local sorting and a composable view filter. SearchBox provides
field selection and Auto across configured fields; numeric/date comparisons use
shared locale-aware parsing. Specify literal versus regex mode explicitly and
surface malformed input without dropping the last valid filter accidentally.

Filterset controls share a Bag model with options and selected codes. Use an
existing suitable reusable choice control or implement the minimal generic one;
do not bury a second button system inside the grid. OR within a group, AND across
groups and with SearchOn. Define All as clearing that group's restriction.
Raw records stay intact. Document visible/total counts and selection when filtered
out (proposed: retain selected key, hide highlight until visible again).

Acceptance: combined filters, typed comparisons, empty search, sorting ties,
external data updates and filter reset behave deterministically. Measure scans
at 50,000 rows; batch/debounce work as needed before considering a worker.

## Phase 4 — Editable cells and local edit session

Expose edit=True and explicit editor configuration, using existing controls.
Draft text remains outside typed Bag values until successful confirmation.
Enter/Tab confirm and navigate; Escape cancels. Editor-owned popups belong to
the same focus scope. Version asynchronous validation and ignore stale results.
Keep an active editor mounted when its row leaves the viewport rather than
silently discarding it; define the visual overlay behavior in browser tests.

Maintain typed baseline and dirty changes by row key, with changesets for inserts,
updates and deletes. Add/duplicate/delete and reset use the same session API and
node-scoped commands. Explicit local accept establishes a new baseline; it is
not a claim of persistence. Parent-form integration reuses the session.

Proposed filtering policy: keep the old committed row in the view during editing,
then reapply sort/filter after a successful commit. Invalid drafts neither alter
filtering nor disappear. External changes to the edited field raise an explicit
conflict; changes to unrelated fields can update normally.

Acceptance: text/number/date/boolean editing, Decimal precision, invalid input,
popups, async validation cancellation, scrolling, filter exclusion after commit,
row deletion, reverting to baseline, and external changes while editing. No RPC
or autosave implementation required yet.

## Phase 5 — Formulas and aggregate footers

Implement row formulas and formula_* dependencies with cycle detection and
ordered, batched recalculation. Reuse/extend the existing expression facilities
following a capability review. Never infer all dependencies solely by regex.
Specify null/error/division semantics and preserve Decimal arithmetic independent
of display precision.

Proposed default: formula columns are read-only derived view values and are not
included in user changesets; explicit materialization into the Bag can be added
as a documented option. This differs from inspected legacy write-back and needs
owner agreement before this phase. Formulas may depend on other derived fields.

Add sum/count and totalize compatibility with explicit aggregate scope. Proposed
default footer scope is filtered rows, with all-rows scope selectable. Sorting
must not change ordinary totals. Add progressives and percentages only after
ordering/scope semantics are tested; legacy +=, %= and # are syntax to evaluate,
not mandatory shortcuts in the first formula release.

Acceptance: formula chains/cycles, external parameters, edits, row insert/delete,
filtered versus all totals, null values and rounding. No invalid draft contributes
to totals. Recalculation cannot emit recursive update storms or create dirty
user edits by itself.

## Phase 6 — Grid configurator and named views

Build an independent configuration palette using the grid and public structure
operations: columns, labels, widths, visibility, format, formulas and columnsets.
Provide Reset and import/export of versioned configuration, with validation of
unknown fields. Drag and palette changes converge on the same live structure.
A persistence hook can support named views; browser DB/server persistence remains
outside this plan. Configuration saving is separate from record saving.

Acceptance: round-trip a customized view, reopen the palette, restore base view,
handle missing fields after schema changes, and verify group/footer alignment.
Reuse grid editing rather than implementing a parallel configuration editor.

## Per-phase delivery and review

Each phase delivers focused contract tests, real-browser interaction checks where
needed, a short guide and gallery cases built from executable Python/JS recipes.
Begin gallery coverage in phase 1 and extend it; add tutorial lessons when the
public syntax stabilizes. Run the existing relevant tests to catch regressions.
Review the visible result and naming before widening the next phase.

The first implementation target is phase 1, not the entire plan in one pass.
Before its first changes, inspect actual store/form/component APIs and agree the
small shared store surface and row identity spelling. Later-phase decisions are
recorded proposals to resolve before their dependent code, not reasons to block
the read-only grid.
