# Numeric format and places: legacy evidence

The owner requested an editable format combo and a practical numberTextBox example
with decimal places and formatting, grounded in GenroPy legacy.

## Verified legacy behavior

In `gnrjs/gnr_d11/js/genro_widgets.js:4308–4394`, NumberTextBox removes top-level
`format` and `places`, uses format as the constraints.pattern fallback, and
retains places in a separate parsing dictionary. If places is absent it derives
an accepted decimal range from the pattern. Parsing tries display constraints
and then the separate dictionary. Blank becomes null; zero is retained.
Validation is deferred while focused. A locale-dependent key handler substitutes
the locale decimal separator for a dot.

In `gnrjs/gnr_d11/js/gnrlang.js:1261`, the numeric formatter explicitly defines
places as a fixed number of displayed decimal places overriding the pattern.
Named styles include decimal, scientific, percent and currency; other formats
are interpreted as patterns. The formatter also has additional legacy special
formats, which do not define the scope of the current alpha.

`projects/gnrcore/packages/test/webpages/inputfields/numbertextbox.py` exercises
an editor and a div sharing format/mask, a currency-pattern editor, and a
long-decimal editor alongside the original raw number.

All paths above are relative to `/Users/gporcari/Sviluppo/Genropy/genropy`.

## Gramlot implementation direction

Keep `format`, `mask`, `locale` and `places` as distinct options. The shared
formatter is presentation-only: changing displayed precision must not rewrite
Data, including when an unchanged editor receives and loses focus. Actual edits
use the editor's parsing and validation path. A rounded display must not become
the source for an unchanged edit commit. Decimal carriers must never be silently
narrowed to binary Number.

This separates the legacy display meaning of places from its additional parsing
constraints. It does not define a quantization policy for stored values.
