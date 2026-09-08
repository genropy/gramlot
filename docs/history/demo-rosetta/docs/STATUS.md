# Active baseline: progressive binding gallery

Nine autonomous examples are available in React, Vue, Pages Python
and Pages JS: static Hello World, editable text, text color, background color,
font size, font family, bold/italic, a compact Local scope box, and six independent repeated panels. Text commits on blur; visual controls
update during interaction. Each example includes its actual source.

The shared HTML frame preserves example selection across implementations.
Page, Boilerplate and Common separate application code from shared context.
Pages JS retains the dark CodeMirror editor with Live, Focus out and Manual
modes. Both Pages variants retain the library Inspector and include a brief
invitation to observe Data in the interactive examples.

Validation: both frontend production builds, 16 Python tests, Ruff and all 49
browser tests passed. Browser coverage checks every progressive example's behavior,
source text, mobile overflow, and existing editor/inspector contracts. A direct
inspection also verified that the Data tree holds the value committed by input.

No library changes or new widgets were introduced by the demo. Pages now consumes
the coordinator-verified widget lbl contract and editable inspector from the local
assembly. textBox/colorpicker/filteringSelect/checkbox replace native controls;
horizontalSlider now replaces the native range with verified bounds, step and
intermediateChanges behavior.
Orders remains in standby. Dual-view state sharing, minimal Genro ASGI hosting
and remote examples are later work.

Local scope uses the existing Pages box with datapath="sample" and relative data,
formula destinations and bindings. Dedicated browser checks verify no root
leakage and bidirectional Inspector edits in both Pages variants.


## Public preview — 2026-09-08

Published under genropy/demo-rosetta. Setup fetches immutable Pages `0683f5d`,
Builders `25ae619` and DOM `d888cef` commits. Python GUI recipes use `formula`,
matching the JavaScript runtime. The FastAPI environment has no genro-asgi.
Both frontend builds, 16 Python tests, Ruff and 49 browser tests pass with these
fetched dependencies. Browser coverage includes all four implementations, repeated
panels, form validation/save/restore and responsive formlet layout.
