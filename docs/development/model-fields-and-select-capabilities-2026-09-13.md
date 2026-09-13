# Model-aware fields and selects: proposed GenropyPage capabilities

Date: 2026-09-13. Status: design proposal based on local legacy source inspection.
No API in this document is approved or implemented merely by appearing here.
The owner suggested that these capabilities could exist only on Genropy Pages;
this document develops that option rather than requiring a universal model API.

## The problem and the intended behavior

A product record can have identity `42`, code `01` and description `Lampada`.
These are three different roles. The user should be able to type `01` or
`Lampada`, recognize the result, select it and see `Lampada` in the closed field
and grid cell. The stored foreign key remains `42`. If the actual primary key is
`01`, the stored value is instead `01`; codes must not be coerced to numbers.

The editable-grid experiment currently reads the raw column value when rendering
a cell. Its dbSelect resolves a caption while editing, but the grid does not yet
retain and render that caption after confirmation. Adding more widgets does not
solve this missing identity/display contract.

The proposed authoring improvement is to use `field` in forms and `fieldcell` in
grid structures. Both derive suitable declarations from a database field, instead
of asking each page author to repeat model knowledge.

## What the inspected legacy actually does

`field()` calls `prepareFieldAttributes()`, resolves the table and column, and
uses `wdgAttributesFromColumn()` to choose an ordinary widget. It obtains label,
type, size, formatting, validation and widget attributes from the model. Relations
produce a dbSelect; enumerated values produce a filteringSelect. It creates the
relative value binding and also handles virtual fields and permission metadata.
This is authoring expansion, not a special alternative browser input.

`fieldcell()` uses `cellFromField()` to derive grid attributes. A relation may
produce a `caption_field`, such as `@prodotto_id.descrizione`, and metadata linking
the foreign key to the related column. The SQL-facing helper derives an alias;
the browser grid uses `field_getter` to read the displayed value while `field`
continues to identify the underlying value. Grid query-column collection includes
the caption, so descriptions are available before a cell is edited.

The select/grid integration also updates related values: `selected_*`,
`selectedCaption`, callbacks and a `related_setter` mapping carry values from the
chosen record into the row. This accounts for much of the complexity: a selection
can change several displayed columns, not just one caption. Programmatic updates
also have a legacy lookup path when no caption is supplied.

The legacy search distinguishes query columns, caption columns and supplementary
result columns. `getQueryFields()` uses explicit `columns`, then model
`queryfields`, then caption columns. A code is searchable only if the configured
search policy includes it; being the key alone does not establish that policy.

## Capability boundary

The recommended first scope is **model-aware authoring and database selection on
GenropyPage only**, backed by reusable existing Gramlot UI mechanisms.

| Responsibility | Proposed owner |
| --- | --- |
| Explicit widgets, Source, Data, bindings and validation lifecycle | Gramlot core/runtime |
| Select identity/caption/result contract and keyboard behavior | Shared select components |
| Rendering an explicit `caption_field` and atomically confirming a cell draft | Shared grid/store/editor |
| Model-aware `field()` and `fieldcell()` expansion | GenropyPage authoring capability |
| Resolving tables, relations, `queryfields`, labels and model defaults | GenroPy adapter |
| SQL selection, database stores and condition interpretation | GenroPy server capability |
| Record/field access and authoritative validation | Application and server policy |

A plain WebPage can still declare a dbSelect with its own endpoint, explicit
widgets and explicit grid columns. It need not expose model-aware `field` or
`fieldcell`, and must not acquire a GenroPy dependency.

The existing `GenropyPage` in `gramlot.contrib.fastapi_genropy` provides a concrete
starting point with invocation-scoped database access. This proposal does not
restore the old Genro ASGI layer or move database integration into core.

A future Django or schema adapter could implement equivalent authoring behavior.
That possibility is not a prerequisite for this slice: do not design or ship a
universal model-provider protocol solely to support it.

## Proposed authoring experience

Illustrative declarations, **not executable current APIs**:

```python
# Both containers have an explicitly established table/model context.
fb.field('prodotto_id')
cells.fieldcell('prodotto_id', edit=True)

# Per-use presentation/search overrides remain possible.
fb.field('prodotto_id', columns='$codice,$descrizione',
         rowcaption='$descrizione', auxColumns='$codice')
cells.fieldcell('prodotto_id', name='Product', width=200, edit=True)
```

The expansion should share the same model interpretation for label, dtype,
validation, relation identity, caption and selection policy. Form and grid
adapters then generate their own presentation. Existing `cell()` and explicit
widget authoring remain available for fields without model metadata.

Prefer explicit declaration overrides over model presentation defaults. Access
restrictions are not ordinary presentation defaults and cannot be bypassed by
setting an authoring option. Grid editability remains explicit; merely declaring
a `fieldcell` should not grant editing rights.

The exact mechanism for attaching a table context to GridStruct and Source
containers remains to be settled. Preserve legacy names where semantics match;
fail clearly when model-aware expansion has no model context.

## Selection options recovered from the legacy

These are inspected legacy capabilities, not a promise of current Gramlot parity.

| Options | Role | Proposed treatment |
| --- | --- | --- |
| `columns`; model `queryfields` | Fields searched, including code and description | First slice, server side |
| `rowcaption` | Description of the chosen record | First slice |
| `auxColumns` | Extra visible dropdown columns, such as code | First slice; reusable dropdown rendering |
| `hiddenColumns` | Returned fields not shown in the dropdown | First slice for caption and selected fields |
| `alternatePkey` | Alternative identity to store, not an extra search field | Explicit relation/selection contract |
| `condition`, `condition_*` | Filtering and bound parameters | GenropyPage server policy |
| `exclude`, `excludeDraft` | Omit records | GenropyPage server policy |
| `order_by`, `preferred`, `limit` | Ordering, preferred rows and result limit | Server selection options |
| `weakCondition` | Retry with a relaxed optional condition | Later; never relax access constraints |
| `selectedCaption`, `selectedRecord`, `selected_*` | Copy selected data to bindings | Shared behavior, with grid draft coordination |
| `selectedCb`, `selectedSetter` | Selection and assignment hooks | Later compatibility review |
| `selectmethod`, `applymethod` | Custom search and result processing | Server extension points |
| `emptyLabel`, `emptyLabel_first`, `emptyLabel_class`, `notnull` | Empty choice presentation | Shared presentation plus server result policy |
| `invalidItemCondition` | Mark invalid choices | Requires explicit UI and commit semantics |
| `hasDownArrow`, `searchDelay`, `autoComplete`, `firstMatchDisabled` | Interaction options | Shared widget behavior |
| `switch_*` | Recognize text prefixes and attach special behavior | Later, separately specified |
| `_storename`, `dbstore`, `ignorePartition`, `subtable` | Database-specific selection context | Adapter only; not generic UI contracts |

The legacy default search tries progressively broader matching across configured
fields; it also special-cases digit-only input. Reproducing every heuristic is a
separate compatibility decision. The first acceptance requirement is that both
code and description searches work. Exact-code ranking, ambiguous codes and
fallback matching must be stated and tested rather than inferred from the UI.

## Grid data and edit lifecycle

A resolved relation should supply both the stored key and its display caption in
the row result, with a declared `caption_field`/getter. The caption does not need
to be a persisted column of the underlying database table.

1. Load keys and captions together, using the adapter's query projection. Avoid
   a request per rendered cell, especially under virtual scrolling.
2. Open an editor bound to a detached draft of the key and affected related data.
3. Search with code/description policy; obtain identity, caption and requested
   related values in the selection result.
4. Confirm key, caption and related changes together after validation. Update
   them through the normal store API so other Data readers observe the result.
5. Escape discards all draft changes. Invalid or unresolved text cannot replace
   the committed key or leave a caption belonging to another record.
6. Scrolling reconstructs display from row state; it must not lose the caption.

Clearing a relation must clear its caption and the defined dependent values.
External identity changes require invalidating/re-resolving the caption, with
stale responses discarded. Conflicts must cover affected related fields as well
as the key. Selecting a record must not write `selected_*` directly into the live
row before the grid session confirms.

For static filteringSelect values, the shared grid can map keys to labels using
the declared list without a database lookup. The free text of a comboBox remains
free text. Sorting/filtering by key versus caption needs an explicit policy; the
caption renderer alone does not settle those semantics.

## Bounded implementation proposal and acceptance

First implement the explicit identity/caption grid contract and exercise it with
the current Python demo. Then add GenropyPage-only model expansion and the server
selection configuration necessary for code/description lookup. Add visible
auxiliary columns and draft-aware selected fields once the basic relation works.
Do not make a full legacy callback or database-policy migration a prerequisite.

Acceptance scenarios:

- Typing `01` or `Lampada` finds the same record; its caption remains visible after
  selection and its actual key is stored. Leading zeros survive.
- Loading existing rows already displays captions without opening editors.
- Form `field` and grid `fieldcell` infer matching relation, type and validation
  defaults; explicit presentation overrides work in both.
- Duplicate captions remain distinguishable through code; ambiguous input does
  not silently imply an exact identity match.
- Tab, mouse selection and confirmation update the correct caption; Escape,
  invalid input, clearing and scroll preserve key/caption consistency.
- External key changes and delayed responses cannot restore stale descriptions.
- Related field changes are committed or discarded with the selection.
- GenropyPage capability use without model context fails clearly; plain Gramlot
  installations remain independent and explicit widgets keep working.

Open decisions: context declaration/inheritance; initial search heuristics and
exact-code preference; relation result projection/aliases; sorting by caption;
which selected-field mappings belong in the first slice; how application access
rules are supplied to generated selection endpoints. None is approved here.

## Source evidence and related work

Inspected checkout: `/Users/gporcari/Sviluppo/Genropy/genropy` on 2026-09-13.
Paths below are relative to that checkout; line numbers are inspection anchors,
not immutable revision references.

- `gnrpy/gnr/web/gnrwebstruct/dojo11.py:866`: `field`, attribute preparation and
  widget inference; relation and enumeration handling follows at line 979.
- `gnrpy/gnr/web/gnrwebstruct/gridstruct.py:247`: `fieldcell` expansion.
- `gnrpy/gnr/web/gnrwebstruct/_helpers.py:44`: `cellFromField`; relation caption
  derivation at 118 and getter/SQL alias derivation at 148.
- `gnrjs/gnr_d11/js/genro_grid.js:81,1868`: caption projection and display getter.
- `gnrjs/gnr_d11/js/genro_widgets.js:4536,4888,5344`: selected data, resolver
  options and grid-related setters.
- `gnrjs/gnr_d11/js/genro_wdg.js:1580,1736`: caption lookup/update and editor binding.
- `gnrpy/gnr/web/gnrwebpage_proxy/apphandler/db_select.py:55,268`: selection options
  and default search implementation.
- `gnrpy/gnr/sql/gnrsqltable/query.py:200`: query-field precedence.

Current Gramlot context: [grid editor experiment](../examples/grid-editor/README.md),
[dbSelect prototype](dbselect-prototype-2026-09-12.md), and
[legacy dbSelect audit](dbselect-legacy-contract-2026-09-12.md).
