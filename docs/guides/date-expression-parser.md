# Date-expression parser

`parseDateExpression` is a standalone, dependency-free ES module inside the
Gramlot JavaScript package. It does not import the DOM runtime, access Data,
read the clock, perform requests, or convert timezones. Its syntax follows the
useful date/period vocabulary of legacy GenroPy, with the explicit rules below.
The initial API and ambiguity policies are implementation proposals for review.

## Import and result

From an environment resolving the local `gramlot-dom` package:

```js
import {parseDateExpression} from 'gramlot-dom/date-parser';

const context = {locale: 'it-IT', workdate: '2026-09-11'};
parseDateExpression('010325', context);
// {ok: true, kind: 'date', date: '2025-03-01'}

parseDateExpression('oggi+15', context);
// {ok: true, kind: 'date', date: '2026-09-26'}

parseDateExpression('2 trimestre', context);
// {ok: true, kind: 'period', start: '2026-04-01', end: '2026-06-30'}

parseDateExpression('da marzo', context);
// {ok: true, kind: 'period', start: '2026-03-01', end: null}

parseDateExpression('31/02/2026', context);
// {ok: false, error: {code: 'INVALID_DATE', message: '...'}}
```

For direct browser ESM loading, import the URL corresponding to
`js/dom/src/date-parser/index.js`, preserving its adjacent `civil.js` and
`locales.js` files. A bare package import needs a bundler or import-map entry;
the browser does not resolve npm exports by itself. The package is currently
private: this change does not publish an npm package or install a browser map.

Dates are **Gregorian civil ISO strings** (`YYYY-MM-DD`, years `0001`–`9999`),
not timestamps or JavaScript `Date` instances. This representation preserves
local calendar dates without an implied timezone. All period boundaries are
inclusive. An explicit range remains `kind: 'period'` even when both endpoints
are equal. Open endpoints are `null`; a fully open period has both endpoints
`null`. Consumers decide whether their field accepts periods or open endpoints.

## Context and interpretation rules

- `workdate` is required and must be a valid civil ISO string. It controls all
  relative expressions, omitted years, weekday selection and two-digit years.
  A caller wanting today's date must supply its own appropriate local workdate.
- `locale` defaults to `it-IT`. Supported Italian locales: `it`, `it-IT`, `it-CH`.
  English: `en`, `en-US`, `en-GB`, `en-AU`, `en-NZ`, `en-IE`. Underscores and
  case variants are accepted. Unsupported locales fail explicitly.
- Italian numeric dates use day/month/year. `en` and `en-US` use month/day/year;
  the other supported English regions use day/month/year. ISO stays year-month-day.
- Missing years always use the `workdate` year, even for future months.
  Each range endpoint follows this rule independently: `da dicembre a marzo`
  fails as reversed rather than inventing a year. Write
  `da dicembre 2025 a marzo 2026` to select the crossing explicitly.
- `twoDigitYearAhead` defaults to `20` (integer `0`–`99`). Two-digit years map
  to the unique year in `[workdate.year + ahead - 99, workdate.year + ahead]`.
  With workdate in 2026, `46` means 2046 and `47` means 1947. Unlike the legacy
  cutoff, this window is inclusive, follows workdate and crosses centuries.
- Weeks run Monday through Sunday. A bare weekday means that weekday in the
  week containing `workdate`; it does not mean the next occurrence.
- Parsing is case-insensitive, ignores accents, trims outside whitespace and
  collapses repeated whitespace. A single leading `/` is accepted as a
  convenience for expression editors and has no effect on the result.

## Supported syntax

| Meaning | Italian | English |
| --- | --- | --- |
| Relative day | `oggi`, `ieri`, `domani`, `oggi-3`, `oggi + 15` | `today`, `yesterday`, `tomorrow`, `today-3` |
| Calendar week | `settimana`, `questa settimana`, `settimana prossima`, `settimana scorsa` | `week`, `this week`, `next week`, `last week` |
| Calendar month | `mese`, `questo mese`, `mese prossimo`, `mese scorso` | `month`, `this month`, `next month`, `last month` |
| Relative offsets | `settimana + 2`, `mese scorso - 3` | `week + 2`, `last month - 3` |
| Named month | `marzo`, `mar`, `mar.`, `marzo 2025` | `march`, `mar`, `mar.`, `march 2025` |
| Quarter | `T2`, `2 trimestre`, `2° trimestre 2025` | `Q2`, `2 quarter`, `2nd quarter 2025` |
| Weekday | `lunedì`, `lun`, `lun.` | `monday`, `mon`, `mon.` |
| Year | `2025`, `25` | `2025`, `25` |
| Closed range | `da marzo a giugno`, `tra marzo e giugno`, `oggi;domani` | `from march to june`, `between march and june`, `today;tomorrow` |
| Open range | `da marzo`, `al giugno`, `marzo;`, `;giugno` | `from march`, `to june`, `march;`, `;june` |
| Fully open | `sempre`, `senza periodo`, `-`, `;` | `always`, `no period`, `;` |

All twelve full month names and all seven weekday names are supported in each
language, with their first three letters as abbreviations. Quarters accept
numbers 1–4 and an optional two- or four-digit year. Italian also accepts `2º`
and `2o`; English ordinal spellings are `1st`, `2nd`, `3rd`, `4th`.

Relative offsets are integer calendar days for day words, weeks for week words,
and months for month words. They also apply after next/last variants. Month
arithmetic selects the whole target month, so January 31 plus one month expression
correctly yields February's first and last day. Arbitrary named-date offsets,
fractional offsets, times and timezone expressions are not supported.

Numeric forms include exact ISO `2025-03-01`, local `1/3/2025`, `1-3-25`,
`1.3.2025`, `1 3 2025`, and compact `010325`/`01032025` in Italian. Separators
must match within one date. Two-part `1/3` uses the reference year. A bare two-
or four-digit number denotes a **year period**, not a partially entered day;
call this parser on confirmation, not to decide whether to switch editing mode.
Compact eight-digit input follows locale order; use hyphenated ISO for an
unambiguous year-first date.

Range endpoints may themselves be periods: take the start of the left period
and the end of the right period. Italian range prefixes include `da`, `dal`,
`dalla`, `tra`, `fra`; separators include `a`, `al`, `alla`, `e`. English accepts
`from`/`between` and `to`/`and`. A semicolon is the language-independent separator.
Commas are intentionally not range separators.

## Failures and integration boundary

An unsuccessful parse returns `ok: false` and an `error` with a stable `code`
and an English diagnostic `message`. Codes are `INVALID_CONTEXT`, `INVALID_INPUT`,
`EMPTY_EXPRESSION`, `UNRECOGNIZED_EXPRESSION`, `INVALID_DATE`, `INVALID_RANGE`
and `REVERSED_RANGE`. Applications can localize messages using these codes.
Nonexistent dates and arithmetic outside years 0001–9999 fail without rollover.

This is a parser of complete expressions: `1`, `01/`, `oggi+` and `1 T` return
`UNRECOGNIZED_EXPRESSION`. It does not claim to classify every incomplete prefix.
A widget owns its draft buffer, confirmation, cancellation, validation and atomic
application to one or two Data paths. Failure never changes the existing field
value. These responsibilities are outside the parser library; the dateTextBox
integration below composes it. Datetime-local/server UTC responsibilities are
unaffected.

## Provenance and verification

Behavioral sources inspected: legacy `gnrpy/gnr/core/gnrdate.py`
(`decodeOneDate`, `decodeDatePeriod`), `gnrlocale.py` (keywords and year decoding),
and `gnrpy/tests/core/gnrdate_test.py`. See the
[legacy audit](../development/date-expressions-legacy-audit-2026-09-11.md).
The JavaScript implementation is independent; it does not port Babel/Python
internals or claim full compatibility. Deliberate differences include explicit
workdate, fixed missing-year semantics, rejection of reversed ranges, the
workdate-based two-digit window, natural Italian quarters, optional leading
slash, no comma separator, no time parsing, and no automatic min/max clipping.

Run the focused suite from the repository root:

```sh
node --test js/dom/tests/date-parser.test.js
```

Tests cover the public package subpath in a DOM-free process, IT/EN equivalents,
locale ordering, Gregorian leap rules, century/year/month boundaries, periods,
open ranges, invalid input and unchanged caller context.

## Experimental dateTextBox integration

Opt in with `symbolic=True` in Python or `symbolic: true` in JavaScript:

```python
root.dateTextBox(value='^.day', symbolic=True, locale='it-IT',
                 workdate='2026-09-11', dtype='D', lbl='Date')
```

All date fields now use a normal text input, with free caret movement, selection,
paste and deletion. There are no native date segments, mode switches or slash
controls. Ordinary fields accept compact, local and ISO dates; `symbolic=True`
also enables the parser's expressions and periods.

Enter or leaving the combined textbox/tool focus region accepts a parsed date
and formats it for the selected locale.
Escape restores the previous committed value. Invalid expressions remain editable
with an accessible error. Date fields commit on confirmation, even with `live=True`
or `updateOn='input'`; draft strings never enter Data. Form validation uses the
existing editor-candidate hook. Accepted values use TYTX `D` Date carriers;
formatting explicitly uses UTC to preserve their civil date across timezones.

The calendar icon sits inside the field border and uses the shared `ControlTools`
capability. It opens a reusable `gnr-datecalendar` with month navigation, day
selection, Today and Clear. Selection changes the text draft and leaves the popup
open; Data remains unchanged until confirmation. Clicking or moving focus outside
the combined textbox, tool buttons and popup confirms through the usual parsing
and validation path. Moving between those controls does not confirm. Escape
cancels the draft and closes the popup; Enter in the textbox confirms explicitly.

Alt+Down opens the calendar. Its icon is excluded from the sequential Tab order,
so Tab from the textbox moves to the next field and confirms the draft. Arrow keys move by day/week, PageUp/PageDown change
month, and Enter/Space select a provisional day. Disabled and readonly fields
prevent editing and opening. Popup layout and dismissal belong to the shared tool
helper, not the date parser or calendar.

The standalone `dateCalendar` recipe belongs to the `inputs` collection. Its
`value` and `workdate` attributes are civil ISO strings and `locale` controls labels.
JavaScript consumers can call `configure({value, workdate, locale})`; the component
emits `date-select` with `event.detail.value` (ISO or null). It performs no Data
writes. This keeps calendar selection independent from field validation.

A period supplies its starting date, matching the legacy unpaired date field.
An open-start period is rejected. `period_to` remains unimplemented.
`locale` defaults to the document language (then `en`); `workdate` defaults to
the local calendar date. Parser context is captured when the draft starts.
Supply both explicitly for repeatable demonstrations.

This is an alpha: the calendar starts weeks on Monday, and only parser-supported
Italian/English locales are supported. Native browser date controls are no longer
used by dateTextBox. Mobile/IME and assistive-technology verification remain
outstanding; datetime editing is unchanged.

Try teaching example `12-symbolic-date` in the local preview.
