# Hello World experiment

Date: 2026-09-05. Implemented and observed locally; not a general page protocol.

For the current checkout, environment and start command, see the
[relocation record](development-checkout.md). Commands and versions below
record the original experiment.

## Dependencies used

| Repository | Commit | Role |
| --- | --- | --- |
| genro-asgi | a434a23d23af000ba87d57491f0035023bed7a5d | Server |
| genro-builders | e4efb187cf0a75efa5e85055ee5279691ae13d9c | Python HtmlBuilder |
| genro-bag | 1b13b1ef15f8caa772275e5329a7e033af11bab4 | Python source serialization |
| genro-tytx | 80529f7a9ef26d8fbfac4c5b52423e9a51818f52 | Python/JS typed codec |
| genro-bag-js | 005b01d | TYTX tag/type alignment |
| genro-dom-js | e5540e0 | Source loading and reactive activation |

The JS repositories are isolated worktrees under
`/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees`. The genro-tytx sibling
there is a symlink to the original checkout. No library code is vendored into
pages. Existing untracked files in the original repositories were not modified.

## Original local start command (historical)

```sh
PYTHONPATH=/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-pages/src:/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-builders/src:/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-bag/src:/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-tytx/src \
/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-asgi/.venv/bin/python \
-m genro_pages --modules /Users/gporcari/Documents/ChatGPT/genro-pages/worktrees --port 8010
```

This uses the existing ASGI development environment (Python 3.14); automated
pytest validation additionally ran with Python 3.12.9 and source paths for the
same repositories. JS DOM tests used Node 23.11.0 and jsdom.

## Evidence

The in-app browser loaded http://127.0.0.1:8010/ and displayed Hello World,
two paragraphs and the readonly Genro Pages input. Expanding the recipe
control displayed the server's TYTX rows, including semantic tags, nested
parent paths, `hidden: false`, `readonly: true` and `tabindex: 2`.
The HTML shell contains no h1/content recipe: the visible page is built after
fetching `/main`, calling `loadSource`, and mounting the existing Application.

Two integration tests passed. They verify the actual ASGI response through
jsdom and the real aligned runtime, including SourceBagNode identity and
builder/handler references. The underlying dependency branches separately passed
505 Bag tests, 111 DOM tests and six Python/JS/Python round trips.

The initial sandboxed bind was refused by the OS; the authorized local server
was then started successfully. No deployment or remote push was performed.

## Limits and next experiment

Ordinary HTML and primitive typed attributes only. Each main request constructs
a fresh recipe. No Python-to-JS function transport, websocket page context,
initial data transport, reconnection, remote fragments, resolver transport or
widget-collection integration is claimed. The two client stores retain the
existing JS architecture; the datastore-root question is tracked separately at
https://github.com/genropy/genro-builders/issues/37.

Next: one existing web-component collection and initial data transport, after
confirming datastore root and addressing semantics.

## MessagePack follow-up

The same server now supports `/main?transport=msgpack`. On 2026-09-05 the browser
received 289 binary bytes, displayed the same Hello World and attributes, and
showed the decoded Bag in the inspector. The first bytes were
`81 a4 72 6f 77 73`, a MessagePack map containing `rows`.

The server was restarted with `/Users/gporcari/.pyenv/versions/3.12.9/bin/python`
in place of the ASGI venv interpreter in the command above: that environment
already contains Python msgpack 1.1.2. JavaScript uses @msgpack/msgpack 3.1.3
from genro-tytx/js/node_modules and the existing TYTX extension codec.

Three integration cases pass (JSON, MessagePack, shell/assets). The browser's
programmatic navigation to a URL with a query was blocked by its client;
reloading the original page and selecting the in-page transport button worked.
The MessagePack branch was then directly observed through its decoded content
and binary byte count, not inferred solely from Node tests.

## Source inspector

The inspector now shows `builder.source.toXml({pretty: true})` from the mounted
JavaScript builder, replacing the transport dump. It refreshes after mounting
and when the disclosure is toggled. The transport remains TYTX JSON/MessagePack;
XML is a readable view of the client source, not the DOM or the wire payload.


## Pages and menu

The CLI now runs `DemoApplication`. Page recipes live in
`src/genro_pages/pages/` and inherit from `WebPage`; they are explicitly registered
under `hello` and `about`. `/` defaults to Hello World. `/?page=about` opens the
second page. The original `genro_pages.hello_world.HelloWorldPage` remains a
compatibility entry point for the one-page experiment.

`DemoMenu` is a separate recipe using `branch(label=...)` and
`webpage(label=..., filepath=...)`. `/menu` serializes its source Bag with TYTX,
accepting the same JSON/MessagePack transport parameter as `/main`. Navigation
uses ordinary links and full document loads; page state is not retained between
pages. There is no directory discovery, resource cascade or dynamic menu resolver
yet. The architecture discussion is in `temp/pages-resources-menu.md` (review draft).
# Typed SourceBag integration — 2026-09-06

`/main` now serializes the SourceBag through the generic TYTX encoder: `XS`
identifies source, `X` identifies ordinary data Bags. The browser decodes with
`fromTytx`, then binds the detached source to its HtmlBuilder. JSON and MessagePack
use the same runtime. Existing untyped row recipes still load through the legacy
import path; their missing source/data distinction cannot be recovered.

This slice needs the matching local Bag and builders worktrees in addition to
the JS worktrees and TYTX 0.14.0. The consumer changes are not released yet:

```sh
PYTHONPATH=src:../genro-builders/src:../genro-bag/src:../genro-tytx/src \
python -m genro_pages --modules .. --port 8010
```

The contract test `tests/test_typed_envelope.py` sends a SourceBag, an ordinary
data Bag and RAW bytes through a WSX-shaped JSON envelope to the JS runtime and
back. It verifies mixed branch classes, exact decimal/date values, attributes,
node order, empty branches, null, RAW bytes and the original `_loadedValue` after
a client data edit. The recipe renders under jsdom and retains focus-out binding.
This is a codec/DOM test, not a live WebSocket or automatic data synchronization.

Unknown or missing parent branches now produce a decoding error instead of
silently moving descendants to the root. Preserving unknown branch classes as
generic containers is a separate pending policy choice.

## Widget laboratory — 2026-09-06

The demo menu now includes one page for each of the 14 implemented components
in the inputs, layout, colorpicker and storeTree collections. Open
`http://127.0.0.1:8010/?page=widgets/textBox` to start.

Recipes live in `src/genro_pages/pages/widgets/`, one Python file per component.
The shared `WidgetTestPage` discovers sorted `test_*` methods, displays their
docstrings and Python source, and gives each case its own data path. This follows
the legacy `gnrcomponents/testhandler:TestHandlerFull` pattern. Add a `test_03_*`
method to a page to extend its examples; register additional pages explicitly
in `WIDGET_PAGES`. No directory discovery or legacy mixin loading is introduced.

Each page starts with a basic case and a second isolated instance. The browser
loads the existing JS collections through a gallery builder; source import merges
the collection metadata so semantic recipe tags become actual Web Components.
The Python gallery grammar is local to this experiment.

The 28 gallery integration checks mount every page with JSON and MessagePack.
The textBox check also edits one instance and verifies that the other retains its
value. All 36 pages integration tests pass. These are initial mounting and binding
checks, not a completed legacy compatibility, accessibility or theme audit.
Bootstrap integration, additional legacy widgets, exhaustive event/parameter cases,
and the legacy single-case selector remain future work.

## JavaScript laboratory — 2026-09-06

`/?page=playground` provides a CodeMirror 6 JavaScript editor loaded from esm.sh,
with pinned state/view versions shared by the editor and language modules.
The initial recipe is already mounted. Run executes synchronous JavaScript in
`app.live()` with `root`, `data` (the experiment's data segment), `source`,
`builder`, `app` and `Bag`. Successive runs preserve the existing experiment;
Reset creates a fresh instance. Errors are displayed, without rolling back any
mutations already performed. This is a local developer console with ordinary
browser privileges, not a sandbox for untrusted code or an async execution API.

Data and Source XML views subscribe to the actual Bags. They are read-only views,
not yet the planned floating palette with node selection and attribute editing.
If the CDN is unavailable, a textarea keeps execution available. The contract
checks cover construction, data and source changes, input writeback, errors,
reset and Bag notifications. CodeMirror loading was also observed in the browser.

The laboratory XML panes now use read-only CodeMirror XML views. A diagnostic
projection wraps them in `data`/`source` elements and represents object attributes
as escaped JSON, preserving metadata instead of displaying `[object Object]`.
This presentation does not mutate the live Bags or change the TYTX wire format.
The outer demo source inspector is hidden on the playground page.

The laboratory interface itself is now a `PlaygroundBuilder` recipe in
`resources/playground-page.js`. Buttons, checkbox, editor hosts, preview host and
XML editors are SourceBag nodes. Code, auto mode, status and XML documents are
bound to the laboratory data Bag. `codeMirror` is a local collection component
whose implementation owns the third-party editor DOM and destroys it on detach.
The experiment still has its own builder and data segment, separate from the
laboratory UI. The controller wires actions; it no longer creates UI elements.

The full laboratory recipe has now moved to `src/genro_pages/pages/playground.py`,
including title, toolbar, Auto, CodeMirror nodes, preview and XML views.
`playground-page.js` only declares the client collections required to import that
source. `playground.js` attaches behavior to the already mounted Python recipe;
it no longer creates a second UI builder. The integration test serializes the
Python SourceBag through TYTX and mounts it before exercising the controller.

## Floating palette experiment

`/?page=widgets/palette` provides two Python-authored floating containers. Open
one with its checkbox, move its title bar, resize its corner handle, and close
with the button or Escape. Arrow keys on the title/corner move/resize in 10px
steps (Shift: 1px). Each palette binds visibility through `value` and emits
`change` on close. Its content is retained on visibility-only updates. The
DOM target accepts an optional component `updateFrom()` reconciliation hook;
other replacements retain the previous behavior. Changes to recipe content or
style fall back to replacement. Docking and a full Data/Source inspector are
not implemented in this slice.
