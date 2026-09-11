# Handoff: component architecture and Python Source slider

Date: 2026-09-11. Owner-requested handoff for the next conversation.
Read `docs/context/README.md`, `decisions.md`, and `open-work.md` first.
This supersedes the immediate next-action section of
[the earlier September 11 handoff](handoff-dry-menus-resolvers-2026-09-11.md),
which remains the reference for resolver discussion, lesson 10, and earlier work.

## Free text date editor alpha — latest owner correction

`dateTextBox` now always uses an ordinary text input. This supersedes every
native/text-switch description below. `symbolic` enables expressions; ordinary
compact/local/ISO dates work without it. Drafts stay outside Data until Enter,
blur or form commit. Invalid drafts stay editable; Escape restores the committed
locale-formatted civil date. Typed initialization remains preserved.

The reusable `gnr-datecalendar` in the `inputs` catalogue emits civil ISO
`date-select` events and never writes Data itself. The date field composes it
with the same acceptance path. The popup has month navigation, day/keyboard
selection, Today/Clear, readonly/disabled handling and outside/Escape dismissal.
It uses Popover when available and stays within its document viewport, including
iframe boundaries. Teaching hosts need sufficient iframe height for the popup.
The calendar starts weeks on Monday; mobile/IME/screen-reader checks remain open.
Datetime remains unchanged. No paired `period_to` integration was added.

Validation: 276 DOM tests passed; 12 targeted Python tests (teaching, catalogue,
grammar and developer guide) passed. Seven focused date tests also passed in
America/Los_Angeles and Pacific/Auckland. Assets, teaching preview and component
handbook bundle were rebuilt. No dependency change or commit was made.

## Subsequent teaching correction — injected sample data

Latest inspector presentation correction: teaching lessons now follow the active
Gramlot Rosetta host (`/Users/gporcari/Sviluppo/genro_ng/gramlot-rosetta/shared/frame.js`).
A discreet external `🔍 Open inspector` tool sits below the example iframe;
the iframe launcher and original inspector are hidden. `preview-inspector.js`
creates a floating inspector in the parent document using the example realm's
constructor and live application, adopting before initialization. Frame reload,
application disposal and page exit dispose the external inspector. This
supersedes embedded presentation and the custom eye button described below.
Four teaching tests pass; browser opening showed the floating Data/Source
inspector outside the frame with the live `day` node. Server 64326 was restarted.

Parent-scope follow-up: the controller is now a child of the cards formlet,
which no longer needs `node_id`. It accesses `wrapSource(this.parentNode)`;
the existing exported authoring wrapper is now available in controller script
context. The raw parent does not directly expose grammar methods. Existing panel
enumeration excludes the controller itself. The four teaching tests pass after
this change; the preview was rebuilt.

Latest owner correction: the controller now contains its JavaScript body inline,
with `contacts="^contacts"` and `visible="^visibleContacts"` parameters. It measures
the Bag first, ignores descendant field edits, checks the triggering node through
`_triggerpars.kw.node`, and chooses Bag length for Data changes or the slider count
(capped at Bag length) for slider changes. It removes excess Source children and
iterates the selected Bag nodes with `forEach`, building only missing panels.
The script now contains one function, `window.contactPanel`, including its fields.
Extra slider positions no longer create rows absent from the Data Bag. The
example generator still uses stable `c1`, `c2`, etc. keys; this is not a store or
arbitrary-key collection reconciliation contract.

Ordinary Source controllers now receive `_triggerpars` with the original Bag
event in `kw` and the pointer relationship in `trigger_reason`, plus `_reason`
as that relationship (`node`, `child`, `container`). Startup/manual executions
receive null context. These names follow the inspected legacy vocabulary;
this does not implement all historical subscription/row-rule trigger semantics.
The handler passes event context through builder execution to LogicRuntime.

Validation of this correction: five teaching/local-logic Python tests and 19
focused JavaScript logic tests passed. Chrome generation and slider hide/show
preserved the contact values. One existing Python asyncio deprecation warning.

The owner requested keeping random generation and population outside the displayed
recipe so lesson 11 concentrates on dynamic Source cards. These functions now
live in `docs/examples/teaching/assets/contact-data.js`. The manifest selects this
support module; the host imports its content-hashed URL and installs
`window.contactData` before mounting the recipe. The Python button calls its
`populate` helper. The displayed Python script retains `contactFields` and
`resize` at that checkpoint (superseded above); the real executed recipe is still shown read-only. A host explanation
links to the injected helper separately.

The four teaching tests pass (one existing asyncio deprecation warning), including
generation, hidden Data restoration, retained cards/focused drafts and preview
support wiring. Rebuilt preview on port 64326 was reloaded in Chrome; Generate
contacts populated ten cards and synchronized the slider. No runtime change.
This update supersedes the generator/populate placement described below.

## Current checkpoint and next work

The latest work is teaching lesson 11, now **Python-authored, read-only**, using
an HTML `script` declaration to define JavaScript functions which modify Source.
The owner has not yet reviewed the latest correction after rejecting the initial
JavaScript-only editable version. Continue from the current page and respond to
owner feedback before extending the example.

Separately, Sol completed the component architecture and typed-editor assessments.
The first assessment received coordinator review; the typed-editor follow-up was
delivered while the owner discussed the slider example and still needs a focused
coordinator/owner discussion. It is not an approved implementation plan.

Stores and `_identifier` must be discussed before implementing data-driven
collection views. The owner explicitly limited this example to the slider.
Do not add RPC loading, store abstractions, a grid, or resolver integration now.

## Owner corrections and architectural direction

- The DRY review is intended to identify Gramlot Component architecture using
  reusable base classes and mixins, not merely stylistic cleanup.
- The owner explicitly requested Sol for this assessment. Sol is finished;
  no agent, automation, or unattended workflow remains active.
- Browser JavaScript has single class inheritance; functional mixins and composed
  services are candidates for shared capabilities. Python grammar mixins are a
  separate, already implemented declaration mechanism.
- Validation and `lbl_*`/`box_*` are candidate mixin capabilities. A thin validation
  mixin may connect to the existing `FormField`/`Validator`; it must not duplicate
  their engine. `WidgetLabel` and `InputNullState` remain shared implementations.
- Pilot cases are **numberTextBox, dateTextBox, dateTimeTextBox**, including decimal
  places and formatting. Color picker is evidence of duplication, not the selected
  pilot. Current date/time inputs exist; dateTimeTextBox does not.
- GenroPy legacy is the documentation and behavioral comparison reference.
  The owner specifically relaxes formal compatibility for confusing numeric/date
  formatting conventions (`pattern`, format types, etc.) when clearer solutions
  exist. This is not blanket approval to redesign unrelated legacy APIs.
- Separate stored value/type, editing/parsing, display formatting, locale,
  validation and precision/rounding. No new formatting vocabulary, decimal model,
  timezone policy or mixin API has been approved.

Assessments:

- [Component architecture](gramlot-components-architecture-review-2026-09-11.md)
- [Typed components and legacy comparison](typed-components-legacy-architecture-review-2026-09-11.md)

Sol proposes `FieldElement` above single-control and composite-control branches,
with composed formatting/parsing codecs. Its suggested first slice is numeric
editing preserving Decimal, with locale/display precision and no implicit
quantization. All these are proposals. The date-time control shape and timezone/DST
semantics remain open; do not present a composite control as owner-approved.

## Lesson 11 behavior

Path: `docs/examples/teaching/11-source-slider/recipe.py`.

Python declares the slider, generation button, outer formlet, script and controller.
The script defines `window.contactDemo` within the isolated example iframe:

- `randomContacts(count, Bag)` creates 1–10 plausible fictional contacts using
  Italian names/addresses, random phone-shaped strings and `example.test` emails.
- `populate(node, Bag)` replaces the complete `contacts` Data branch and sets
  `visibleContacts` to a random integer from 1 through 10. The button supplies the
  current Data Bag constructor via `genro.data.constructor`.
- `contactFields(pane)` defines surname, name, address, phone and email using
  relative `^.field` paths.
- `resize(node, count)` finds the outer Source node by `node_id='contactCards'`,
  removes only excess children with Source Bag `pop`, and appends missing cards.

Each card is a `labledBox`, titled Contact 1, Contact 2, etc., with `label_position`
TC, white centered text, full-width blue titlebar, rounded border and white body.
It contains a two-column formlet. Address spans both columns through the currently
supported `grid_column='span 2'`; no new `colspan` runtime feature was added.
The outer formlet uses `col_min_width='280px'` for responsive columns.

Card paths are `contacts.c1`, `contacts.c2`, etc. They are stable example paths,
not an `_identifier` or store contract. Reducing the slider removes Source only;
Data persists. Raising it restores saved values or creates empty cards beyond the
existing dataset. Generating again intentionally replaces the dataset, including
previously hidden contacts. Existing cards are reconciled rather than all rebuilt.

## Python and script correction

The owner rejected the earlier JS-only editable recipe. That `recipe.js` was
removed; the manifest now selects only Python for lesson 11. Other lessons keep
their Python/JavaScript pair behavior. The displayed code is the actual Python
file, including its JavaScript string, in read-only CodeMirror (textarea fallback
also read-only). Lesson 11 has no Run/Reset controls.

Legacy evidence: `/Users/gporcari/Sviluppo/Genropy/genropy`, inspected commit
`418b4454a6e08445817e858a1b5d2a2c91c2dbf5`,
`gnrpy/gnr/web/gnrwebstruct/base.py:832` implements `script(content='', **kwargs)`
as an HTML script child. The inherited Gramlot HTML grammar and DOM renderer
already execute this use in the browser; no runtime script-tag implementation
was added. `window.contactDemo` is an example namespace, not a new public
method-registration API or proof of isolation across multiple pages in one window.

## Preview layout and inspector

Preview URL: http://127.0.0.1:64326/lessons/11-source-slider/.

- A draggable vertical separator adjusts example/code width (25–80%). Pointer
  capture, cancellation, ArrowLeft/Right and Home/End are supported. On narrow
  screens the page stacks the panels and hides the separator.
- The previous fixed 660px iframe caused internal scrolling. Lesson 11 now reports
  content height using ResizeObserver; the parent validates message origin/source
  and resizes the iframe. The outer document handles vertical scrolling. The CSS
  height remains only a fallback before the first size report.
- The example enables the existing embedded inspector and adds an eye icon plus
  Open inspector text to its launcher below the cards. Data and Source are live.
- Preview CSS, frame CSS and lab JS URLs now carry content hashes. Runtime modules
  retain the earlier hashed directory, and runner JS retains its hash. Stable asset
  URLs previously caused visible stale layout/behavior; preserve cache invalidation.

Important hosting files: `docs/examples/teaching/build_preview.py`, `manifest.json`,
`assets/runner.js`, `assets/lab.js`, `assets/frame.css`, `assets/preview.css`.
The inspector setup and resizing live in the host, not in the pedagogical recipe.

## Verification and limits

Latest command: 4 tests passed, one existing asyncio deprecation warning:

```sh
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" .venv/bin/python -m pytest tests/test_teaching_examples.py -q
```

This includes the existing 13 Python/JS pairs and the separate Python Source-slider
behavior check. `tests/source_slider.mjs` loads the Python TYTX from stdin. Because
jsdom disables scripts, it explicitly evaluates the transported script for the
behavior checks; browser testing separately confirms native script execution.

Coverage includes generation at both range endpoints, a repeated count replacing
Data, slider/count synchronization, hidden-data restoration, extra empty cards,
retained card identity/focused draft, and read-only preview output. No full runtime
regression suite or mobile-device verification was performed in this conversation.

Browser checks confirmed Python script execution, random generation, preservation
after hide/show, three-column responsive cards, address span, separator dragging
and keyboard use, CodeMirror `contenteditable=false`, and embedded inspector.
Final compact inspector check measured iframe height 550px versus body 549px.
During automation some immediate inspector observations preceded its async loading;
the later accessibility tree confirmed the open Data/Source inspector.

Build commands:

```sh
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview
```

## Workspace and process preservation

Canonical checkout remains this Gramlot repository under Sviluppo, branch `main`.
At handoff `git status --short` reports 103 entries, including directories. There
was extensive pre-existing work; preserve it. No commit or publication was made.
No dependency change or new development checkout was made. Read workspace-map.md
before any cleanup. Genro ASGI remains excluded; optional FastAPI stays separate.

Server 64323 is an old Python process that accepted connections but returned empty
responses during this session; it was not killed. A working localhost-only Python
HTTP server was started on 64326 for `build/teaching-preview` (exec session 57861).
Check availability before starting another server; local socket probes may require
sandbox escalation. Do not assume an old exec session or browser handle survives.

The in-app browser preview was marked as a deliverable. Discover/reuse its actual
tab in a new session. No further work has been scheduled. Resolver discussion,
menus and other prior backlog items remain in the earlier handoff/open-work list.
