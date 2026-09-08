# Rosetta specification — progressive binding gallery

The comparison frame is ordinary HTML shared by React, Vue and Genro Pages.
It owns implementation navigation, example selection and View source. Each
framework renders only the selected application inside an independent iframe.
The frame has no JavaScript framework or script of its own.

## Active example: Hello World

Each version contains a heading "Hello World", an italic description div
"Display a fixed text. Later examples will let you change it.", and a readonly field
with label "MyText" and value "Hello World". The greeting value will become editable in later examples. No input, dynamic style, order UI or business
API calls belong to this first example. A small shared CSS file supplies the same
basic text appearance to each isolated document.

The existing /react/, /vue/ and /pages/ URLs display the common frame. Example
URLs are /examples/{variant}/hello-world/. View source opens a separate tab showing
the actual individual recipe/component first. Bootstrap, host adapter and common
HTML frame are separately inspectable and measured as infrastructure.

Examples through Font style use a single Python main() or top-level JavaScript.
Local scope also uses one main(); Repeated panels introduces only the reused text_panel helper.

## Standby

Orders is removed from active navigation, routes and tests. Its authored files,
previous specification and tests are preserved under standby/orders from the
working f3ad84f baseline. Reintroduce it only when requested, as a separate example
inside the same HTML frame, stripping its previous comparison navigation.

## Later agreed directions, not part of this baseline

A minimal genro-asgi host should eventually run the
same frontend examples. The intended FastAPI adapter should ship with Pages;
this consumer demo does not establish that packaging yet. See docs/EVOLUTION.md.

The shared HTML frame always displays the selected implementation's source in a
second iframe: alongside the example on wide screens and below it on narrower
screens. Source navigation stays within that pane and does not replace the live
example. The standalone source link remains available. No frontend-specific code
or parent JavaScript is required for this layout.

Source inspection opens on the Page tab and displays only the selected page's
application file (recipe.py for Pages). Boilerplate contains framework-specific
startup and integration files. Common contains files shared by all three
implementations, never mixed into the page or boilerplate file lists. Tabs are
plain HTML links; the embedded viewer does not repeat framework navigation.

Use equivalent concise documentation across the three application sources. Avoid
redundant comments or docstrings that merely repeat the visible code.

## Pages JS live recipe

Pages JS is a fourth implementation at /pages-js/. Its authored recipe.js uses
DOM JS's fluent builder directly; it is not generated from the Python recipe.
The same Hello World content and shared visual contracts apply.

The Page source tab uses a locally bundled CodeMirror editor for this variant.
Manual mode is the default: Apply executes the current recipe. Live executes on
every document change, without a typing delay. Focus out executes when the editor
loses focus. Switching to Live also applies the current text. Syntax
and execution errors are displayed while the last successful preview is retained.
Reload restores the checked-in recipe; edits are not written to disk. This is a
local JavaScript playground, not an isolation boundary for untrusted programs.
Boilerplate exposes the runtime harness, and Common exposes the editor. The outer
HTML frame continues to contain no script. Other implementations remain read-only.

Both Pages variants expose an Inspector button in the common frame, outside the
recipe and preview content. A shared Pages bootstrap module mounts the library's
existing inspector against the running application's Data and Source Bags. It
rebinds after successful JS Apply and disposes the old inspector with its owner.
The shared integration is listed under Boilerplate for both Pages variants.


## First binding batch (implemented)

Every example is autonomous, with complete state, controls and logic in its own
source file. Each step retains the preceding behavior and adds the named feature:

1. hello-world: unchanged static introduction.
2. editable-text: text input commits when it loses focus.
3. text-color: adds an input-event text color picker, initially #223044.
4. background-color: adds an input-event background picker, initially #ffffff.
5. font-size: adds a continuous slider from 10 to 48 px, initially 14.
6. font-family: adds system-ui, serif and monospace choices; initially system-ui.
7. font-style: adds independent Bold and Italic checkboxes, initially false.

React, Vue, Pages Python and Pages JS implement the same observable behavior.
Pages examples use the library textBox, colorpicker, filteringSelect and checkbox
widgets with lbl, plus existing data/style binding. No lbl implementation is
added by the demo. MyText is a separate label without an implicit colon; output
is a readonly textBox, with an equivalent native readonly field in React/Vue. Styling affects the greeting, not its label.

Pages recipes include a brief Inspector → Data invitation. Numeric pixel size and
boolean weight/style are converted through existing dataFormula providers, which
run in the browser; Python only constructs their serialized declarations.

The routes /{variant}/{example}/ select a page. /{variant}/ remains a Hello World
alias. Switching variant preserves the selected example. Source tabs and raw
source preserve the example query parameter. The JS editor executes the selected
example's real recipe; reload restores its original code and state.

Two views sharing state, remote examples, Orders and all database examples remain
outside this batch. The editable inspector and widget lbl contract are consumed from the verified
local library assembly. They are not released dependencies.


## Verified widget integration and remaining gaps

The Pages coordinator authorized the current local DOM assembly and inspector.
The source remains in its owning libraries; Rosetta consumes it without patches.
All Page sources expose the actual widget declarations with lbl. The font choice
is an existing filteringSelect limited to the same three families as React/Vue.

horizontalSlider now uses minimum=10, maximum=48, step=1 and
intermediateChanges=True, with lbl="Font size". Its range and continuous updates
are verified in the demo for both Python and JavaScript recipes. numberTextBox localized readonly formatting
is also not available and is not demonstrated here.

The inspector edits Data/Source of the running instance; changes do not rewrite
recipe files. Demo tests exercise Data Apply updating input and readonly output
in both Python and JS authoring modes. The runtime now supports defaults and verticalSlider, but this gallery revision
adopts horizontalSlider; widget defaults initialize absent data nodes in each recipe.


## Local scope (eighth example)

`local-scope` retains every Font style control in a compact titled box. Font style
remains unchanged. Pages uses an explicit `labledBox(label="Text sample")` containing a
`formlet(columns=2)` with labels above the fields. React and Vue use an equivalent
two-column CSS grid. Pages declares `datapath="sample"` on the labeled box;
initial data paths and formula destinations begin with `.`, and bindings begin
with `^.`. Inspector shows text, styles and computed values under `sample`, with
no equivalent nodes at the root. Editing `sample.text` in Inspector updates both
text fields. React and Vue keep idiomatic component-local state and native HTML;
they do not emulate a path store. No database or new library API is involved.

Pages input examples initialize their data through widget defaults, preserving
existing values. Local scope declares derived formulas directly in main().
Its text field spans both formlet columns via grid_column="1 / -1"; colors,
size/family and bold/italic occupy paired rows. React/Vue mirror this layout.


## Repeated panels (ninth example)

Six instances repeat the Local scope panel, including defaults and formlet layout.
Python calls text_panel in range(6); Pages JS calls textPanel in a for loop.
Each container selects panels.panel_0 through panels.panel_5 and all internal
bindings remain relative. React maps to a TextPanel component with local state;
Vue uses v-for with a separate SFC, also exposed under Page in the source viewer.
The example is autonomous and does not import Local scope. Browser checks verify
that editing text, size, bold and color in one instance leaves the other five
unchanged and that Pages stores six independent branches without root leakage.


Repeated panels starts with Common settings. A label-position selector defaults
to TL and offers L, R, TL, TC, TR, BL, BC and BR. Pages panel captions and widget
labels bind lbl_position to the absolute ^common.position path; individual data
and formulas remain relative. React/Vue lift position to the parent and pass it
as a prop, with native CSS positioning. Browser checks exercise all eight choices
and verify that local text and style edits survive the shared presentation change.
