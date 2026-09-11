# Numeric display and editing

`numberTextBox` uses an ordinary text input. `format`, `places` and `locale`
control presentation, while the committed value remains a Number or Decimal.
The same formatter handles scalar HTML content such as `div`.

```python
from decimal import Decimal

root.data('amount', Decimal('1234.56789'))
root.numberTextBox(value='^amount', dtype='N', format='#,##0.00',
                  places=2, locale='it-IT')
root.div('^amount', format='decimal', places=2, mask='Amount: %s')
```

`places` is a fixed displayed decimal count from 0 to 20. It overrides the
fraction precision specified by a pattern. For example `1234.56789` displayed
with two places rounds visually, but Data retains all digits. Changing options
and focusing/blurring without edits never quantize the stored value. This is
presentation precision, not a maximum allowed editing scale or storage rounding
policy. See the [legacy comparison](../development/numeric-format-places-legacy-audit.md).

All three options accept literal values, reactive `^` and passive `=` pointers.
Locale inherits source ancestors and the page as described in
[display formatting](display-formatting.md). Reactive presentation changes preserve
a focused draft and its captured parsing locale. Passive option changes take
effect on the next render triggered by another dependency.

## Formats

| Format | Purpose |
| --- | --- |
| `decimal` | Localized decimal display; default |
| `percent` | Display underlying fraction as a percentage |
| `scientific` | Scientific notation |
| `0`, `0.00`, `0.###` | No grouping, required/optional decimal digits |
| `#,##0`, `#,##0.00`, `#,##0.###` | Localized grouping plus fraction precision |

Patterns use ASCII `.` and `,` as syntax; locale determines displayed separators.
Required fractional `0` positions must precede optional `#` positions. This is
a deliberately bounded LDML numeric subset, not every legacy pattern. Currency,
positive/negative/zero sections, accounting, symbolic prefixes and custom rounding
modes are not implemented. Use `mask` for text around a formatted display value.
Without explicit precision, presets retain up to 20 displayed fraction digits;
this still does not change Data. Grouping behavior follows Intl locale data.

Unsupported formats produce a visible error. The editor retains its prior text;
scalar displays retain their last valid text with an error message. An invalid
format cannot abort rendering other components. Pure formatter helpers throw
`RangeError` to allow callers to handle the failure themselves.

## Editing

On focus, the input shows the full ungrouped value using the locale decimal
separator. For percent, this is the underlying fraction: type `0.15` in English
or `0,15` in Italian to display 15%. Input is provisional until Enter or blur;
Escape restores the committed value. Invalid drafts stay available for correction,
including after blur/refocus, while Data remains unchanged. This editor confirms
on change even if the general field setting requests continuous input updates.

The alpha accepts ASCII digits, a sign, the locale decimal separator and optional
scientific exponent. Grouping separators in pasted/typed text are deliberately
rejected instead of guessed; remove them before confirming. Non-Latin digit entry
is not supported yet. An emptied numeric field preserves the shared empty-string
semantics; a fresh Backspace while empty sets null. Zero remains zero.

`min` and `max` validate the underlying value. An explicit positive `step` checks
increments relative to `min`, or zero when no minimum exists. Without `step`,
fractional values are allowed. `places` never validates scale. Invalid candidates
do not write Data. `dtype='L'` requires a safe integer.

## Decimal integrity and browser packaging

`dtype='N'` or an existing Decimal value uses a Decimal constructor directly from
the canonical draft string. No Number conversion is used for the committed value
or exact bound/step comparison. The browser runtime now exposes the already
installed `decimal.js` dependency through its TYTX require shim, including the
FastAPI adapter. Its ESM file and license are packaged with the assets. This fixes
the earlier browser fallback that could hydrate N as a boxed, narrowed Number.

Formatting passes the exact decimal string to modern Intl.NumberFormat. Runtimes
without exact decimal-string support report an error rather than narrow it. A
missing Decimal backend rejects N editing. Infinite/out-of-Number-range values
are not supported by this numeric presentation alpha. Decimal arithmetic policy
and server-side quantization remain outside the editor.

The runnable lesson `13-number-format` includes editable format/locale combos,
a places control, a Decimal field and a Result group box comparing display with
the stored value.
