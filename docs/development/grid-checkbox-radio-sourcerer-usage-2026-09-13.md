# Grid checkbox and radio usage in Sourcerer

Inspection date: 2026-09-13. This supplements the [legacy source audit](grid-checkbox-radio-legacy-audit-2026-09-13.md). These are indexed source usages, not runtime telemetry or a guarantee that every application is indexed. No grid implementation is included.

## Method

Sourcerer's `code_search_code` was paginated to exhaustion for `.checkboxcolumn(`, `.checkboxcell(` and `userSets`, and searched for `addCheckBoxColumn`, `radioButtonSet` and `checkBoxSet`. The batch search endpoint failed internally; the ordinary code search worked.

The index returns repeated copies and source variants without revision identity in each result. Counts below therefore measure distinct `(repository, module path)` pairs containing an active declaration, not raw hits or execution frequency. Comments and definitions were excluded. Python call contexts were parsed as AST to identify keyword arguments without counting neighboring calls. One long Anaci call required a second search with more context. Different indexed variants of a file contribute the union of their options. Counts include framework consumers and examples as well as applications; copied applications remain separate repositories.

## Relative adoption

| Declaration | Distinct files | Interpretation |
| --- | ---: | --- |
| `checkboxcolumn(...)` | 112 | Dominant helper: external selection, Boolean fields and radio selection |
| `cell(..., userSets=True)` | 60 | Widely used external membership sets |
| `checkboxcell(...)` | 10 | Direct Boolean/three-state fields |
| `checkBoxSet(...)` | 6 | Five application files and the shared framegrid generator |
| `radioButtonSet(...)` | 1 | Shared framegrid generator; direct grouped checkbox columns are also used |

The counts overlap: a file can use multiple families. Low direct usage of a generator does not measure the number of generated controls or its indirect consumers.

## Options actually used

For `checkboxcolumn`, distinct files specifying each option:

| Option | Files |
| --- | ---: |
| `checkedId` | 71 |
| `radioButton` | 54 |
| `checkedField` | 50 |
| `remoteUpdate` | 21 |
| `edit` | 5 |
| `hidden` | 5 |
| `action` | 2 |

Presentation is predominantly `name` and `width`. `radioButton=True` occurs in 50 files; string groups (`'level'`, `'voto'`, `'mt'`) in five, with one file using both kinds. `checkedId` without `radioButton` occurs in 24 files. This makes both multiple-row selection and single-row selection essential candidates.

`checkedField` is not merely cosmetic: usages select `socio_id`, `persona_id`, `fornitore_id`, `code`, `filepath`, and other business identifiers instead of the row's primary key. An external selection path and an explicit identity field must remain separate concepts.

`remoteUpdate` is mostly literal `True`; one indexed variant uses `can_edit_sollecito`. No numeric delay was found in these parsed declarations. This is a substantial migration requirement even if database persistence remains outside the portable grid.

The long Anaci election declaration combines `radioButton=True`, `checkedField='id'`, `format_nullclass='radioHidden'`, a conditional `hidden`, `_customGetter` and an `action` which asks for a date and calls a domain RPC. This is a custom election workflow, not ordinary Boolean editing, and should be migrated explicitly.

For `userSets` cells, recurring options are `width` (17 files), `cellClasses` (11), `checkedId` (6), `hidden` (4), `userSets_caption` (4), and `userSets_group` (2). Most cells only name the set and enable `userSets`; the grid supplies the enclosing set path. The group cases implement language proficiency categories.

For `checkboxcell`, `threestate` appears in two files (`True` for permission cells and `'hidden'` for POS rows); `calculated` appears in one. The ordinary Boolean path dominates.

For `checkBoxSet`, five application files pass `columns` and `cells_width` for authorization tags. The shared framegrid generator passes `values`, `dtype` and `aggr`. Only that generator directly calls `radioButtonSet` in this search.

`addCheckBoxColumn` is mainly shared infrastructure: chart datasets use `field='enabled'`; the query tool uses `field='one_one'`, `position='>'`, `name='One'`; view configuration and invoice code reverse `trueclass`/`falseclass` for `hidden`/`disabilitato`; appointment grids use `checkedId`. Preserve it as an insertion convenience over the same column contract, not another state mechanism.

## Representative indexed source anchors

Paths here are Sourcerer repository-relative identifiers, not local checkout paths. Line numbers may differ between indexed variants.

- `anaci:packages/anc_base/resources/tables/societa_socio/th_societa_socio.py`: `checkedId='#FORM.record.amministratore_id'`, `checkedField='socio_id'`, `radioButton=True`.
- `pansotti:packages/ciak/resources/tables/progetto_produttore_partecipazione/th_progetto_produttore_partecipazione.py`: reference-person radio selection through `persona_id`.
- `anaci:packages/anc_base/resources/tables/candidato_socio/th_candidato_socio.py`: persisted `sollecitato` with `remoteUpdate`.
- `anaci:packages/anc_fnz/resources/tables/organo_carica/th_organo_carica.py`: custom derived-role election callback and getter.
- `community:resources/tables/hobby/th_hobby.py`: several columns with `radioButton='level'`.
- `genrojobs:resources/tables/lingua/th_lingua.py` and `contractmanager:resources/tables/lingua/th_lingua.py`: grouped `userSets` with captions.
- `pansotti:packages/ts_studio/resources/assegnazioni_component.py`: `checkBoxSet('tag_pkeys', ..., columns=columns)`.
- `cusl:webpages/pos/vendita.py`: checkbox cells with hidden null state.
- `genropy:common/gnrcomponents/framegrid.py`: indirect checkbox/radio-set generator.
- `genropy:common/js_plugins/chartjs/chartjs.js`, `common/th/th_querytool.js`, `common/th/th_viewconfigurator.js`: dynamic column insertion.

## Revised implementation priority — proposal

### Historical qualification from Git

Local GenroPy Git history was inspected with pickaxe searches and commit diffs,
including the older `genro_widgets.js` implementation. Earliest verified
introductions in the inspected paths are:

| Date | Commit | Change |
| --- | --- | --- |
| 2010-05-06 | `02959838a3` | Adds Python `checkboxcell`, directly toggling a row attribute |
| 2010-10-06 | `6e2bb561b5` | Adds `addCheckBoxColumn` runtime insertion and `_checked` toggling |
| 2012-02-20 | `0a0daf0d9c` | Adds Python `checkboxcolumn` with `checkedId` and `radioButton` |
| 2012-03-06 | `5e9fdb4510` | Adds `action`, `action_delay` and `remoteUpdate` to that helper |
| 2012-09-21 | `7c436eb5fa` | Introduces the `userSets` grid attribute and membership getter over an external Bag; refines pre-existing set routines |
| 2016-04-25 | `7279989334` | Moves grid code from `genro_widgets.js` to `genro_grid.js`; not the birth of these features |
| 2022-06-14 | `17ce383a9d` | Adds assigned-value support to `checkboxcolumn` |
| 2022-06-16 | `e547dbaf94` | Adds `radioButtonSet` and `checkBoxSet` for evaluation grids, generating checkbox columns |
| 2023-03-02 | `148d53687f` | Extends userSets with explicit per-cell `checkedId` subscriptions and per-cell disabled checks |

The raw usage ranking therefore mixes generations. `checkboxcell` is the oldest
simple cell mechanism; `checkboxcolumn` is a later coordinated interface over
column machinery that already existed in 2010. `userSets` is a subsequent
external-membership design, still enhanced in 2023. The 2022 set helpers address
per-row choices and build on checkboxcolumn; they are not general replacements
for row selection. The inspected diffs do not establish a formal deprecation of
the older APIs.

For Gramlot, external membership is the preferable conceptual basis for row
selection, while a Boolean field remains ordinary record editing. This is a
design inference, not a claim that Git documents an official replacement plan.
Keep compatibility spellings as translations onto those explicit contracts;
do not choose an internal architecture solely from historical call counts.

1. One shared column engine with explicit internal modes: Boolean field editing, external membership selection, and single-row selection. Keep familiar Python helpers. Support `checkedId`, `checkedField`, and bidirectional Bag updates from the start, with stable identity across sorting and virtualization.
2. Include ordinary `userSets` semantics in that external-selection engine. Its adoption is too broad to treat it as an obscure extension. A compatibility authoring layer can translate the old declarations without duplicating state.
3. Provide an explicit persistence service/adapter for the common `remoteUpdate` migration. It must respect validation, permissions and failure handling; a visual column must not implicitly acquire database authority. Existing applications using immediate save need deliberate migration if this is not in the first implementation.
4. Implement per-row single/multiple choice groups over one canonical value. Retain `radioButtonSet`/`checkBoxSet` authoring where practical; support `columns` for tag matrices. Avoid duplicating generated Boolean fields and `_status_` as independent state.
5. Handle custom getters/actions, grouped user sets, three-state variants, numeric aggregation and icon inversion as explicit compatibility cases after the common contracts. Do not silently ignore an unsupported option.

This revises the earlier priority suggestion: ordinary `userSets` and the persistence migration deserve early design attention. It does not require copying the legacy implementation or every overloaded option into the portable core.
