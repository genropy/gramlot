# Typed components: legacy and architecture review

Date: 2026-09-11. This follow-up tests the proposed component architecture
against `numberTextBox`, `dateTextBox`, and `dateTimeTextBox`. It is an assessment
with illustrative API alternatives, not an approved contract or implementation.

## Subsequent owner decision — local datetime

The owner selected one native `input[type=datetime-local]` for `dateTimeTextBox`.
It edits local date and time; the consuming server converts to UTC for storage.
This supersedes this assessment's UTC `DHZ` model, browser timezone conversion,
and two-control datetime recommendation below. All three pilots can use the
single-control branch. A composite-field base should wait for a concrete need.
The local datetime transport representation remains to be specified.
See [the decision register](../context/decisions.md#local-datetime-editor--owner-decision-2026-09-11).

The remaining text preserves the original assessment and its alternatives;
the owner decision above takes precedence wherever they conflict.

## Original recommendation

Use the pilots to prove two field shapes:

```text
FieldElement                         shared field/validation/decoration lifecycle
  SingleControlFieldElement          numberTextBox, dateTextBox
  CompositeFieldElement              dateTimeTextBox with date and time controls
```

Formatting and parsing belong in composed, stateless codecs selected by the model
type. Precision-aware decimal conversion belongs behind a numeric value adapter.
Validation coordination remains in the existing `FormField` and `Validator`.
This reuses field state, null state, labels, binding, event bridging, draft policy,
and cleanup without assuming that every field has one native input.

The authoring contract must distinguish model type, edit syntax/parsing, display
format, validation constraints, and value-changing quantization. One `format` or
`pattern` attribute must not carry all five meanings. GenroPy is the behavioral
and documentation reference, but formal continuity with its confusing formatting
vocabulary is explicitly not required.

## Sources and current status

The legacy checkout inspected was
`/Users/gporcari/Sviluppo/Genropy/genropy` at commit
`418b4454a6e08445817e858a1b5d2a2c91c2dbf5`. Legacy paths below are relative to
that checkout. They establish evidence, not a requirement to copy Dojo or server
dependencies.

Gramlot currently declares number, date, and time fields, but no date-time field
([`src/gramlot/grammar/inputs.py`, lines 25-32](../../src/gramlot/grammar/inputs.py)).
Number uses `input[type=number]` and returns `valueAsNumber`; date and time only
select their native input types
([`js/dom/src/collections/inputs.js`, lines 463-469](../../js/dom/src/collections/inputs.js)).
They inherit common null, decoration, disabled/read-only, event, and focus-draft
behavior from `GnrInput`; number is right aligned by shared CSS
([`inputs.js`, lines 37-47](../../js/dom/src/collections/inputs.js)).

`FormField` performs generic TYTX conversion only if a candidate remains a string
and slices JavaScript `Date` values for native date/time controls
([`forms/field.js`, lines 43-64 and 157-166](../../js/dom/src/forms/field.js)).
There is no active locale codec, decimal-place or rounding contract, configurable
date display, or datetime editor.

TYTX already preserves relevant model types. Gramlot's typed-envelope test carries
a Python `Decimal` and `date`
([`tests/test_typed_envelope.py`, lines 7-30](../../tests/test_typed_envelope.py)).
The current `valueAsNumber` editor path can therefore narrow a Decimal to IEEE 754
Number. That is a model-integrity gap for money and long decimals.

## Legacy number behavior

The Python declaration documents a numeric value and a `constraints` dictionary
with min, max, places, and pattern; currency is a separate widget
(`gnrpy/gnr/web/widgets/dijit.py`, lines 50-79).

The browser adapter removes top-level `format` and `places`, extracts
`min,max,pattern,round,currency,fractional,symbol,strict,locale` into constraints,
uses `format` as the pattern fallback, derives accepted places from that pattern,
and keeps places separately in `_parseDict`. It substitutes the locale decimal
separator while typing, maps blank to null, parses first with display constraints
and then `_parseDict`, and validates only after focus leaves
(`gnrjs/gnr_d11/js/genro_widgets.js`, lines 4308-4394).

The generic formatter overloads `format` further: it may be `decimal`,
`scientific`, `percent`, `currency`, a numeric pattern, semicolon-separated
positive/zero/negative forms, or even `meter`, `progress`, `bytes`, `epoch`, and
duration rendering. `places` overrides pattern precision and `round` uses a legacy
increment convention (`gnrjs/gnr_d11/js/gnrlang.js`, lines 1261-1325 and
following). Examples use `format='$ #,###.000'`, `format='#,###.000000'`, and
`format_pattern='##0.00000'`, while showing both raw and `?_formattedValue`
(`projects/gnrcore/packages/test/webpages/inputfields/numbertextbox.py`, lines
10-30).

This proves that presentation and stored values were conceptually separate, but
also why the vocabulary was confusing: a display format becomes a parse pattern,
implicitly controls accepted precision, and shares a container with constraints.

Current Gramlot has native numeric parsing, binding, null/empty, lock, validation,
and alignment. It does not forward numeric min/max/step to its inner input, parse
locale text, format on blur, preserve Decimal identity, or define precision and
rounding. Generic `validate_min`/`validate_max` do not replace an editor contract.

For locale-aware and exact decimal editing, recommend a text control with
`inputmode="decimal"`, a numeric codec, and a Decimal-aware adapter. Native
`input[type=number]` has browser-controlled syntax, no grouped edit language, and
forces `valueAsNumber`. It remains suitable when the actual model is a JS Number.

## Legacy date and datetime behavior

The Python declarations describe `dateTextBox` as a validating date with calendar
popup and min/max/datePattern constraints. `datetimeTextBox` is separate but only
documents min/max (`gnrpy/gnr/web/widgets/dijit.py`, lines 82-109).

The date adapter extracts `formatLength,datePattern,fullYear,min,max,strict,locale`,
can disable its popup, and supports datetime plus optional seconds
(`genro_widgets.js`, lines 4049-4085). Parsing accepts locale patterns, compact
digit dates, two-digit years with a pivot, and datetime time fragments. Date-only
editing preserves the previous time fields. Failed parsing calls server-side
`decodeDatePeriod` and may write `period_to`
(`genro_widgets.js`, lines 4101-4218). Natural-language periods and a second Data
write belong in an optional resolver/action service, not a core date codec.

Legacy `DatetimeTextBox` subclasses date but constructs a popup with separate date
and time fields, stores temporary `_date`/`_time` attributes on the bound Data node,
and combines them with a formula, producing `DHZ`
(`genro_widgets.js`, lines 4222-4276). Examples show `seconds=True`, `dtype='DHZ'`,
and manual date/time composition
(`projects/gnrcore/packages/test/webpages/inputfields/datetime.py`, lines 8-33;
`inputfields/timetextbox.py`, lines 11-15).

The formatter again overloads one name: date/time/datetime `format` may be
short/medium/long/full, a pattern, a special week form, or for datetime a
`datePattern|timePattern` pair (`gnrlang.js`, lines 1185-1239).

Gramlot currently has native ISO date/time edit strings and a minimal typed path.
It does not define civil-date versus instant semantics, datetime timezone,
localized parsing/display, calendar popup, seconds policy, two-digit-year rule,
period resolver, or min/max forwarding. Native date controls are useful initially
because their submitted value is ISO, but browsers own their visible formatting.

## Proposed contract

### Model values

| Component | Model | Draft states |
| --- | --- | --- |
| `numberTextBox` | TYTX Decimal for `N`; Number/integer only when explicitly selected | null, empty, incomplete, invalid, valid |
| `dateTextBox` | calendar date `D`, without time/zone semantics | null, empty, invalid, valid |
| `dateTimeTextBox` | UTC instant `DHZ` initially | null, incomplete parts, invalid, valid |

Actual typed Data should take precedence over redundant metadata. An initially
empty field may need an explicit `value_type='decimal'|'number'|'integer'|'date'|
'datetime'`; the exact name is unsettled. Existing `dtype` may remain transport or
schema metadata, but must not also choose display format.

Civil datetime and zoned datetime are distinct types. TYTX currently offers a
canonical UTC datetime. Adding civil or named-zone types requires a transport
decision outside the first slice.

### Codec boundary

Each codec is pure and returns structured state:

```text
parse(text, context) -> {status: empty | incomplete | invalid | valid,
                         value?, normalizedText?, issue?}
formatEdit(value, context) -> string
formatDisplay(value, context) -> string
```

It does not write Data, validate business rules, round, or call a server.
`FormField` chooses commit timing and retains invalid/incomplete drafts, consistent
with its current parsing lifecycle
([`forms/field.js`, lines 66-84](../../js/dom/src/forms/field.js)).

Numeric parsing should accept the locale decimal separator, optionally accept
grouping, reject ambiguous mixed separators, preserve trailing separator/zeros in
the focused draft, and construct Decimal from a canonical string without a Number
round-trip. The first date codec should map typed `D` to native `yyyy-mm-dd`.
Localized text dates and explicit two-digit-year pivot are later options.

### Explicit display vocabulary

Use `Intl.NumberFormat` and `Intl.DateTimeFormat` for locale-aware named styles.
Custom pattern languages should wait for a need structured options cannot express.
Illustrative flat attributes are:

```python
root.numberTextBox(value="^.amount", value_type="decimal",
    display_style="decimal", display_locale="it-IT",
    display_min_fraction_digits=2, display_max_fraction_digits=4)

root.dateTextBox(value="^.due", display_date_style="medium",
    display_locale="it-IT")

root.dateTimeTextBox(value="^.created", display_date_style="medium",
    display_time_style="short", display_locale="it-IT",
    display_timezone="Europe/Rome")
```

These names are verbose but unambiguous and fit the current flat reactive
attribute pipeline. A nested alternative is cleaner:

```python
display={"style": "decimal", "locale": "it-IT",
         "minimum_fraction_digits": 2, "maximum_fraction_digits": 4}
```

but requires a specified structured-attribute transport and reactive sub-key
behavior. `format='#,##0.00'` is not recommended because it recreates legacy
ambiguity. All spellings remain owner choices.

Display formatting is a pure projection and never changes Data. A focused text
control shows edit format; an unfocused one may show display format. Native date
controls cannot guarantee a configured display. The first date slice should
document native display and defer custom display, or later add a separate display
layer. It should not change a live input's type as a formatting trick.

### Decimal places and rounding

Keep three concepts separate:

- display fraction digits: projection only;
- accepted decimal places: field constraint which rejects excess scale;
- quantization scale plus rounding mode: explicit value transformation.

Illustrative syntax:

```python
root.numberTextBox(value="^.tax", value_type="decimal",
    edit_max_decimal_places=4,
    quantize_decimal_places=2, rounding_mode="half_even",
    display_min_fraction_digits=2, display_max_fraction_digits=2)
```

Recommendation for the first slice: implement display min/max digits and accepted
maximum decimal places, but no quantization. Excess scale remains a clear field
issue and the exact model is unchanged. Quantization waits for owner decisions on
trigger (input, blur, commit, or save) and modes. Never infer stored rounding from
display digits. When added, Decimal values require Decimal arithmetic; names such
as `half_even`, `half_up`, `down`, `floor`, and `ceiling` are clearer than the
legacy increment syntax. Number display rounding is not exact quantization.

### Constraints and shared services

Min/max and requiredness reject typed candidates. Codecs parse; `Validator`
checks; `FormField` owns drafts, async sequencing, and writes. Native validity may
mirror constraints for UI but is not a second authoritative engine.
`blankIsNull`, `InputNullState`, and `WidgetLabel` keep their existing owners.
Reactive display changes reformat only an unfocused field and preserve host/control
identity and focused draft sovereignty.

## Architecture across all pilots

```text
FieldElement
  owns field adapter, WidgetLabel integration, validation presentation,
       host locked state, connection disposers

SingleControlFieldElement
  owns one control, draft guard, composed input/change bridge, optional
       InputNullState, codec interaction
  NumberFieldElement -> NumericCodec + NumericValueAdapter
  DateFieldElement   -> DateCodec (+ CalendarPopup later)

CompositeFieldElement
  owns ordered controls, aggregate focus/draft, one public value/event bridge,
       aggregate disabled/error/described-by state
  DateTimeFieldElement -> DateCodec + TimeCodec + DateTimeComposer
```

This corrects the earlier proposal: `ControlElement` cannot be the universal field
base. Shared validation/decoration/binding lifecycle belongs on `FieldElement`;
one-control bridging belongs below it. Menus and buttons remain outside this
family. Codecs are composed services because editors, grids, read-only displays,
and inspector can reuse them without DOM inheritance. A thin `Validatable(Base)`
may install the field adapter but must not contain codec or validator engines.

Proposed hooks:

```text
FieldElement: readFieldDraft(), writeFieldValue(), setFieldState(), focusField()
SingleControlFieldElement: createControl(), createCodec(), read/writeControlText()
CompositeFieldElement: createParts(), read/writeParts(), composeParts(), focusPart()
```

`dateTimeTextBox` should expose one bound value and keep its part drafts inside the
component. It should not recreate legacy `?_date`/`?_time` Data attributes or an
internal formula. With two native controls, focus moving between parts stays in
one edit session; one host change occurs when both parts compose validly.

A single text control is simpler but needs a locale datetime grammar and is poorer
on mobile. Native `datetime-local` models a civil datetime, not a UTC instant.
Recommendation: two native controls inside one composite field, with an explicit
display timezone used to split/combine the UTC instant. This cannot be implemented
until timezone and daylight-saving ambiguity policy are selected.

External Data updates reformat unfocused fields; focused drafts remain sovereign.
Locale/timezone policy changes during editing must not reinterpret a draft
silently. Defer them until commit/cancel or surface a policy-change state.

## First bounded slice

Start with `numberTextBox`:

1. introduce private `FieldElement` and `SingleControlFieldElement` bases behind
   the existing `inputs` collection;
2. add `NumericCodec` and an adapter preserving TYTX Decimal without Number;
3. support Decimal/Number model selection, locale decimal editing, pure display
   formatting, right alignment, null/empty, min/max, and explicit maximum decimal
   places;
4. exclude quantization, custom patterns, currency semantics, scientific notation,
   formula entry, and legacy `?_formattedValue` attributes;
5. preserve Source binding, validation, decoration, lifecycle, and the public tag;
6. test long Decimal identity, locale separators, focused drafts, display-only
   rounding, excess scale, min/max, null, reconnect, reactive format options, and
   form save barriers.

Then apply the bases to `dateTextBox` with native ISO editing and typed `D`. After
timezone semantics are selected, `dateTimeTextBox` proves the composite branch.
Colorpicker remains evidence for later extraction, not the selected pilot.

## Unsettled owner choices

- Canonical public spelling (`dateTimeTextBox` in the current discussion versus
  legacy `datetimeTextBox` casing).
- Flat explicit display/edit names versus structured option objects.
- `dtype` versus a clearer model-type declaration for empty fields.
- Decimal/Number coexistence and inference rules.
- Whether grouping is accepted during editing.
- Whether excess decimal places are a parse issue or validation issue.
- Quantization availability, trigger, and rounding modes.
- Currency/percent as number styles or later semantic components.
- Native date display versus separate display layer or locale text editor.
- Two-digit-year, calendar, natural-language period, `period_to`, and date bounds.
- UTC datetime default, display timezone, daylight-saving ambiguity, and future
  civil/zoned types.
- Composite versus single-control datetime and seconds/fraction defaults.

## Classification

Existing implementation: minimal native number/date/time fields; common input,
null, decoration, binding, validation, and typed TYTX transport.

Verified legacy evidence: attributes, parse branches, formatter overloads, period
fallback, datetime composition, and examples anchored above.

Proposed: the field/single/composite bases, codecs, value adapters, explicit
edit/display/quantization concepts, illustrative names, and migration sequence.
All require owner review. No tests were run for this documentation-only assessment.
