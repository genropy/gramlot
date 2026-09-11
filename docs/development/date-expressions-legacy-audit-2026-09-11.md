# Date expressions and linked period fields: legacy audit

Date: 2026-09-11. Source inspection, not a runtime verification or implementation
plan. The owner requested investigation and suggested a leading `/` to activate
expression entry. That syntax remains a proposal.

## Verified source behavior

Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`.

- `gnrjs/gnr_d11/js/genro_widgets.js:4101` (`DateTextBox.patch_parse`) handles
  compact six/eight-digit dates in JavaScript by inserting separators, then
  interpreting the locale date order. Two-digit years use a moving cutoff with
  `pivotYear` defaulting to 20. This processing occurs when not focused.
- At line 4206, failure of the local parsing branch triggers
  `genro.serverCall('decodeDatePeriod', {datestr: original_value}, ...)`.
  The widget clears its current value before the request and marks `_waiting_rpc`.
  The callback applies `from` to the current field and, when `period_to` is
  declared, writes `to` through `sourceNode.setRelativeData` to that Data path.
  No slash prefix is required by this legacy mechanism.
- `gnrpy/gnr/web/_gnrbasewebpage.py:113` supplies a public Python method, using
  page `workdate` and `locale` when omitted. It delegates to
  `gnr.core.gnrdate.decodeDatePeriod` and returns a Bag including `from`, `to`,
  `valid`, `period`, previous-year dates and a caption. The widget callback shown
  above uses the endpoints rather than the `valid` flag.
- `gnrpy/gnr/core/gnrdate.py:107` and `:264` implement expression and interval
  parsing: relative days, Monday–Sunday weeks, calendar months, month/weekday
  names, quarters, years, explicit ranges and open-ended ranges.
- `gnrpy/gnr/core/gnrlocale.py:375` defines Italian/English keywords including
  oggi/ieri/domani, settimana prossima/scorsa and mese prossimo/scorso.
  Relative day offsets count calendar days; week offsets count weeks and month
  offsets count months. Month and quarter names come from Babel.

The executable example at
`projects/gnrcore/packages/test/webpages/inputfields/datetime.py:36` declares:

```python
fb.dateTextBox(value='^.date_from', lbl='Date from', period_to='.date_to')
fb.dateTextBox(value='^.date_to', lbl='Date to')
```

This is a directed Data-path link, not a special paired-widget registration.
For a decoded expression, the first field receives the beginning, and the second
receives the end. A single-day expression supplies the same date at both ends.
Without `period_to`, a period expression still supplies its beginning to the
current field. Ordinary locally parsed dates do not pass through this callback
and therefore do not automatically change the linked end date.

## Compatibility details requiring care

- The Python docstring's historical claim that missing years always select past
  periods does not fully match the current start/end inference branches. Specify
  desired behavior and use fixed-workdate examples before porting it.
- Quarter spelling is not arbitrary natural language: tests in
  `gnrpy/tests/core/gnrdate_test.py:226` cover `Q1` in English and `T1` in Italian;
  Italian long-form quarter tests are commented out with a Babel compatibility
  note. Literal `2 trimestre` is not established as supported by this audit.
- The inspected callback clears before decoding and has no visible request
  generation guard. These are historical mechanics, not requirements to retain.

No legacy Python tests were executed: Gramlot's `.venv` lacks Babel, so a
dependency availability probe failed. No dependencies or source checkouts were
modified. Findings above are based on implementation and existing test inspection.

## Proposed Gramlot direction for discussion

Use a shared browser JavaScript date-expression parser with explicit locale and
reference date (`workdate`). Return a date, a period (including supported open
endpoints), or a structured failure; parsing itself must not mutate Data.
Field/runtime integration owns validation and writes, including `period_to` if
that authoring contract is retained. Preserve invalid drafts and existing Data
until a result can be accepted. Define coordinated validation/commit behavior for
the two endpoints before implementation.

The owner's `/` proposal could distinguish ordinary date entry (`010325`) from
expression entry (`/oggi+15`, `/mese scorso`). Only a leading slash would switch
modes; internal slashes
in ordinary dates remain separators. The slash belongs to the editor, not the
stored date. A limited localized grammar is sufficient; no general-purpose code
evaluation is needed.

Native date inputs cannot hold this free-text draft. A text editor with a calendar
affordance, or a separate expression-entry surface alongside a native control,
requires a UI choice. The definitive `datetime-local` choice for dateTimeTextBox
remains in force and does not imply support for free-text expressions inside that
native input.
