# Display formatting

Scalar HTML content supports `format`, `mask` and `locale`. These are presentation
options: the Bag, input model bindings and formula/controller arguments remain
raw typed values. Masks produce text, never HTML.

```python
root.div('^.day', format='long', mask='Due: %s')
root.div('^.day', format='^.date_style', mask='^.date_mask', locale='^.language')
```

The pipeline resolves the value and options, formats the value as text, then
replaces every `%s` in the mask with that text. Without a format, normal string
conversion applies. Null/undefined and empty string display as empty text; a mask
still applies (for example `[%s]` becomes `[]`). Zero and false are retained.
Without a mask the formatted text is displayed directly.

All three options accept literal values, reactive `^` pointers and passive `=`
pointers. Reactive changes rerender the consumer through the existing source
binding mechanism. Passive options are read afresh when some other dependency
causes a render; their own changes do not initiate one. Formatting is not applied
to CSS or arbitrary HTML attributes.

## Locale

An explicit nonempty node locale overrides the nearest source ancestor locale.
An inherited pointer resolves relative to its declaring ancestor, not the child.
The remaining defaults are `Application(..., {locale: 'it-IT'})`, then the page's
`document.documentElement.lang`, then the platform locale. Use source `locale='^...'
for reactive language changes; changing application options or the HTML `lang`
attribute alone does not initiate rendering. This adds no global locale watcher.

## Temporal formats

`short`, `medium`, `long` and `full` use `Intl.DateTimeFormat`'s standard styles.
A date uses `dateStyle`, a time uses `timeStyle`, and a datetime uses both. Exact
punctuation and wording are locale/runtime dependent. Independent datetime date
and time styles are not part of this alpha.

A deliberately bounded Unicode LDML pattern subset is also supported:

| Tokens | Meaning |
| --- | --- |
| `y`, `yy`, `yyyy` | Civil year |
| `M`, `MM`, `MMM`, `MMMM` | Month number or localized short/long name |
| `d`, `dd` | Day of month |
| `EEE`, `EEEE` | Localized short/long weekday |
| `H`, `HH`, `h`, `hh` | 24-hour / 12-hour hour |
| `m`, `mm`, `s`, `ss` | Minute, second |
| `a` | Localized AM/PM marker |

Use separators between adjacent different fields: `dd/MM/yyyy`, `HH:mm:ss`,
`dd/MM/yyyy HH:mm`. Quoted literals follow the form `'at'`; doubled quotes yield
one quote. Unsupported tokens (including week-year `YYYY`, timezone tokens,
fractions and compact adjacent fields such as `yyyyMMdd`) throw a `RangeError`,
rather than silently returning an incorrect date. Time tokens on date-only
values and date tokens on time-only values are rejected. Numeric formatting is described in [numeric display and editing](number-formatting.md);
masks work for all scalar values.

The formatter accepts actual JavaScript Date carriers used by TYTX. It uses
TYTX's type classification unless the display node supplies `dtype='D'`, `'H'`,
`'DH'` or `'DHZ'`. Explicit dtype is necessary for ambiguous Date values such as
midnight time or midnight datetime: JavaScript Date itself does not retain the
original TYTX suffix. Arbitrary strings are never guessed to be dates.

D/H carriers are formatted using UTC fields to retain their civil date/time in
all browser timezones. Existing DH/DHZ carriers are displayed in UTC, preserving
the transport's established timezone rather than applying a browser-zone shift;
long/full time styles may explicitly show UTC. This does not define a local
naive datetime transport or alter the local datetime editor/server conversion
contract. Such a carrier still needs an independent agreed representation.

## Scope and implementation

The reusable helper is `js/dom/src/display-format.js`; HTML rendering calls it
only for scalar node content. Existing pointer resolution registers dependencies.
Iterated rows containing presentation options use the existing row render path
instead of bypassing formatting with raw text cell patches.

Presentation metadata stored on Data nodes and its precedence are deliberately
not implemented: only explicit presentation node options are consumed. Inputs,
parsers and generic resolver semantics are unchanged. These boundaries keep
formatting from accidentally altering calculations or editable values.
