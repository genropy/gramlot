# Source slider

The executable source is `recipe.py`, rendered as read-only Python in the preview.
Python authors the page and its HTML `script` declaration; that script installs
`window.contactDemo` in this example's isolated iframe. The button and controller
call its functions to generate Data and change Source. This is an example namespace,
not a new Gramlot component-method registration contract.

Legacy reference: `gnrpy/gnr/web/gnrwebstruct/base.py:832` in the GenroPy checkout
at `418b4454a6e08445817e858a1b5d2a2c91c2dbf5` declares
`script(content='', **kwargs)` as an HTML script child. Gramlot's inherited HTML
grammar and DOM renderer already support this use; no runtime change is required.

The preview adapts iframe height to the content through a ResizeObserver and
origin/source-checked messages. The outer page handles scrolling. Code is not
editable and no Run/Reset controls are offered for this lesson.

Verification: teaching tests cover Python serialization, read-only preview markup,
random generation, repeated counts, Data preservation and retained card identity.
jsdom disables native scripts, so that test explicitly evaluates the transported
script; browser checks additionally verify native script execution, generation,
hide/show preservation, read-only CodeMirror and inspector opening.
