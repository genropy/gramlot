# Legacy grid checkbox and radio mechanisms

Date: 2026-09-13. Source audit of the local GenroPy checkout; not a runtime
verification and not implemented Gramlot APIs. Paths below are relative to
`/Users/gporcari/Sviluppo/Genropy/genropy`.

## Entry points

| Entry point | Purpose |
| --- | --- |
| `rows.checkboxcell(...)` | Boolean cell with a click formatter, optionally three-state |
| `rows.checkboxcolumn(...)` | Grid-aware check column with checked IDs, actions and radio behavior |
| `rows.cell(..., checkBoxColumn={...})` | Lower-level form of checkboxcolumn |
| `grid(..., addCheckBoxColumn=True)` or a settings dictionary | Automatically insert a check column |
| `gridWidget.addCheckBoxColumn(settings)` | Insert the column at runtime |
| `rows.radioButtonSet(...)` | Generate choice columns with one selected choice per row |
| `rows.checkBoxSet(...)` | Generate choice columns aggregating several choices into a row field |
| `rows.cell(..., userSets=True)` with grid `userSets` | Membership in external sets of row IDs |

These mechanisms are separate from the ordinary highlighted grid-row selection
and from opening a normal checkbox as a cell editor. A Boolean dtype or radio
icon alone does not imply any of the selection policies below.

## checkboxcell: direct Boolean value

Signature in `gnrpy/gnr/web/gnrwebstruct/gridstruct.py:183`:

```python
checkboxcell(field=None, falseclass=None, trueclass=None, nullclass=None,
             classes='row_checker', action=None, name=' ', calculated=False,
             radioButton=False, threestate=None, **kwargs)
```

Without `field`, uses `_checked` and marks it calculated. It generates a normal
cell with dtype B, `format_trueclass`, `format_falseclass`, `format_nullclass`
and a `format_onclick` recipe that writes into the row Bag/attributes.

- Default: Boolean toggle.
- `threestate=True`: false -> true -> null -> false.
- `threestate='disabled'`: null displays a dimmed icon and cannot be toggled.
- `threestate='hidden'`: null icon is hidden; this does not itself implement the
  explicit click guard used by the disabled variant.
- `radioButton=True`: changes default icon classes to radio icons. The generated
  click handler still toggles this cell only; it does **not** enforce exclusivity.
- `trueclass`, `falseclass`, `nullclass`, `classes`: appearance customization.
- Checks whether the owning form is disabled, publishes `checked_<field>` with
  `{row, pkey, checked}`, and executes the optional action fragment.

This direct formatter route differs from grid-editor-managed field validation
and persistence. Do not treat it as equivalent merely because both draw checks.

## checkboxcolumn: coordinated grid behavior

Signature at `gridstruct.py:169`:

```python
checkboxcolumn(field=None, checkedId=None, radioButton=False, calculated=True,
               name=None, checkedField=None, action=None, action_delay=None,
               remoteUpdate=False, trueclass=None, falseclass=None,
               value=None, **kwargs)
```

It builds `checkBoxColumn` configuration; `value` becomes `assignedValue`.
`getCheckBoxKw` in `gnrjs/gnr_d11/js/genro_grid.js:4185` supplies dtype B, default
20px width, icon classes and the `onCheckedColumn` click route. The constructor
recomputes `calculated` according to whether a model field exists / remoteUpdate;
the Python signature default is therefore not the entire effective policy.

Options and interactions:

- `field`: Boolean row field, normally `_checked` for an auxiliary selector.
- `checkedId`: external comma-separated list of checked row identities; empty
  checked-ID output is an empty string in this legacy path, not null.
- `checkedField`: field providing those identities; defaults to the row identifier.
- `getCheckedId` / `setCheckedId`: project checks to IDs and apply IDs to rows.
  They support Bag-row and attribute-row storage. They operate on the available
  store contents; do not assume a resident scan covers unloaded server rows.
- `checkedOnRowClick`: wires a row click to the check action in the subscription
  path. This is inspected in the JS settings path, not evidence that every
  Python helper forwards that option unchanged.
- `action(changes)`: callback with identity/value entries plus `_idx`, `_row`,
  `_fields`; `action_delay` batches pending actions.
- `remoteUpdate=True` with a grid table: installs `app.updateCheckboxPkeys` and a
  default 1000ms action delay; a numeric value supplies the delay. This performs
  database writes and a commit, not just local editing.
- Emits `<gridId>_row_checked` when the grid has a nodeId.
- Skips rows with `disabled` in their node attributes. Honors disabled parent
  forms unless `parentForm=False` bypasses that check.
- Uses GridEditor setters where available, otherwise writes to the store.
  Updates totalizers when configured and a change manager is present.
- For ordinary checks, clicking within the highlighted row selection applies
  the operation to that selection; otherwise it acts on the clicked row.

`addCheckBoxColumn` exposes runtime insertion with `position` (default first).
The grid's `addCheckBoxColumn` declaration invokes this at creation.

### Two distinct radio modes

`radioButton=True` selects one row in that column: clears a previously checked
row and sets the clicked row true. Clicking it again does not deselect it. The
implementation stops after finding the first prior check, so it assumes an
already consistent single-selection state.

`radioButton='group_name'` links several columns within a row. It clears sibling
choice columns in that group. When a column has `assignedValue`, it writes that
value into the group field and maintains `_status_<group_name>`. Clicking an
already assigned value can clear it back to null. The older grouped-Boolean
form also exists without assigned values.

Thus a radio across rows and a radio across columns have different data models.

## radioButtonSet and checkBoxSet

`gridstruct.py:125–142` provides higher-level columnset generators:

```python
rows.radioButtonSet(code='vote', name='Vote', values='Y:Yes,N:No,A:Abstain')
rows.checkBoxSet(code='features', name='Features', values='a:Alpha,b:Beta')
```

These are illustrative legacy declarations. Both accept `code`, `name`,
`values`, `dtype`, `columns`, and additional columnset options. `checkBoxSet`
also accepts `aggr`. `_collist` creates fields such as `vote_01`, derives captions
and converts assigned values through the dtype catalog. Explicit `columns`
can replace that generated list.

- Radio sets use the per-row grouped-radio mode and assign one scalar value.
- Check sets use `checkBox=<target field>` and `assignedValue` for each column.
- String assignments add/remove codes, sort the list and join using the
  configured aggregator/separator (comma by default); empty becomes null.
- Numeric assignments use `+` by default, or the multiplication/division branch
  when another aggregator is supplied. These historic arithmetic paths need
  explicit initialization and round-trip tests before any port.
- Both coordinate `_status_<target field>` and the projected Boolean columns.

A real consumer is `resources/common/gnrcomponents/framegrid.py:643`,
`_evlg_struct`, which chooses checkBoxSet when `aggr` is present and otherwise
radioButtonSet; it can include a hidden or visible value column and totals.

## userSets: checks stored outside records

At grid level `userSets` identifies the set-state path. A struct cell with
`userSets=True` is calculated and uses `getNewSetKw` / `onChangeSetCol` rather
than the ordinary Boolean setter. Its display getter checks row-ID membership.

- `checkedId`: explicit set binding; otherwise `<userSets path>.<field>`.
- `checkedField`: member identity field.
- `userSets_caption`: also maintains a parallel caption list through
  `checkedCaption` (derived from the userSets path).
- `userSets_group`: when adding membership, removes those IDs from sibling sets
  in the group. This is mutual exclusion between sets, not a radio across rows.
- `<field>_disabled` on a row blocks that row's set action.
- Normal click uses selected rows when the clicked row belongs to the selection;
  otherwise only the clicked row. Shift uses `getAllPkeys` from the store.
- External set changes refresh the membership projection. IDs are represented
  as comma-separated strings and tested through regular expressions in the
  inspected implementation; escaping and identifier types deserve review.

The `radioButton` option also appears in this path's visual configuration, but
`onChangeSetCol` does not implement the `radioButton=True` single-row algorithm.
Do not infer exclusivity from its icon.

## Compatibility cautions from inspection

- `checkboxcell(radioButton=True)` is cosmetic, not a radio group.
- `checkedRowClass` is read into a local variable in the ordinary click routine;
  no use of that variable was found there. Do not promise a working option from
  its name alone.
- `setCheckedIdSubscription` contains a suspicious `typeof(getCheckedId)` check
  rather than testing its local `checkedInStore` result. Initialization should
  be tested, not copied blindly.
- The string assigned-value custom getter references `this.checkBox` even in a
  condition also admitting radios. Generated radio projections need runtime
  verification before claiming complete parity.
- No general header select-all checkbox was established by these inspected
  helpers. The verified bulk routes are highlighted rows and Shift in userSets.

## Source and usage anchors

- `gnrpy/gnr/web/gnrwebstruct/gridstruct.py:125,131,169,183`: public helpers.
- `gnrjs/gnr_d11/js/genro_grid.js:756,1814,1872`: userSets setup and struct dispatch.
- Same file `3962–4145`: check actions, radio modes, aggregation and callbacks.
- Same file `4146–4258,4296`: column insertion and checked-ID synchronization.
- Same file `4644–4750`: userSets configuration and membership operations.
- `gnrpy/gnr/web/gnrwebpage_proxy/apphandler/misc.py:434`: persisted checkbox updates.
- `projects/gnrcore/packages/test/resources/tables/_packages/glbl/comune/th_comune.py:13–34`:
  radio across rows and separate radio groups across columns.
- `projects/gnrcore/packages/test15/webpages/gnrwdg/includedview_externalchanges.py:33`:
  ordinary and virtual-set grids with external changes.
- `resources/common/gnrcomponents/framegrid.py:643`: generated choice matrix.
- `projects/gnrcore/packages/adm/resources/tables/user_config/th_user_config.py:216`:
  three-state permission cells.
- `projects/gnrcore/packages/adm/resources/tables/install_checklist/th_install_checklist.py:28`:
  remoteUpdate example.
- `resources/common/gnrcomponents/tag_matrix_grid.py:355`: checkbox-cell matrix usage.

## Implication for Gramlot (proposal only)

See the [Sourcerer usage survey](grid-checkbox-radio-sourcerer-usage-2026-09-13.md)
for measured adoption and revised priorities: ordinary userSets and the
remoteUpdate migration are more common than the initial local examples suggest.

Preserve authoring names, but specify four separate contracts before porting:
Boolean cell editing; row-ID selection (including single-row radio); per-row
choice groups; external user sets. Share rendering, keyboard and store updates,
not a single ambiguous radio flag internally. Database persistence belongs to an
explicit adapter/service and must not follow from adding a visual checkbox.
