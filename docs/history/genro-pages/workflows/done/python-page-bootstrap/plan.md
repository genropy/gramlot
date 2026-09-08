# Context: codex/hello-world
Parent: develop
Mode: interactive
Channel: in-chat
Must not break: Python page recipes remain typed SourceBags transported through TYTX JSON and MessagePack and rendered in the browser.
Must not break: every Application owns an independent rooted data Bag; source-node context, relative paths and genro.dev cleanup survive page replacement.
Must not break: obsolete asynchronous page/tool responses cannot revive disposed instances or mutate replacement controls.
Must not break: future RPC and iframe integration consumes real server identity; no fabricated page_id, socket topology or ready/onStart contract is introduced here.
Must not break: the existing gallery, laboratory, inspector shortcut, menu destinations, CSS appearance and mobile viewport remain available.

## Objective

Generate the initial HTML document through the Python HtmlBuilder and transmit an
explicit startup configuration as a TYTX Bag, separate from the later source
recipe. Select the JavaScript builder and optional setup through Python page
metadata, removing URL-name special cases from generic startup. This is the
approved document/configuration slice of Macro 3; registered identity and
readiness remain a separate ASGI integration block.

## Work Plan

- [x] **Phase 1**: Generate the page document and drive startup from typed configuration
  > Done: Python-built document, typed startup configuration and generic client selection verified; 80 pages tests, 128 DOM tests and lint passed.
  > Files: .phased/active/python-page-bootstrap/notes.md, .phased/active/python-page-bootstrap/plan.md, docs/architecture/runtime-reorganization-plan.md, docs/gui-2.0-guide.md, src/genro_pages/application.py, src/genro_pages/page.py, src/genro_pages/page_document.py, src/genro_pages/pages/playground.py, src/genro_pages/resources/bootstrap.js, src/genro_pages/resources/index.html, src/genro_pages/resources/shell.css, src/genro_pages/widget_test_page.py, tests/lab_loader.mjs, tests/page_bootstrap.mjs, tests/runtime_consumers.mjs, tests/test_page_bootstrap.py, tests/test_runtime_consumers.py
  > Verify: now — accepted by the owner after browser checks and successful textBox retest; names accepted in chat.
  - Run: opus / high
  - Pattern: sibling `genro-builders/tests/test_html_attrs.py:_render` verifies `HtmlBuilder.create()` and `render(target=False)`; `tests/test_hello_world.py:RequestSupport` and `tests/test_runtime_consumers.py:TestRuntimeOwnership._check` exercise ASGI responses and real Python/TYTX recipes in JavaScript.
  - Files: new `src/genro_pages/page_document.py`; `src/genro_pages/application.py`, `page.py`, `widget_test_page.py`, `pages/playground.py`; `resources/bootstrap.js`, new `resources/shell.css`, replace/remove the obsolete static `resources/index.html`; existing `resources/gallery.js`, `playground-page.js` and `playground.js` only if metadata integration requires it; new `tests/test_page_bootstrap.py` and JS fixture, `tests/test_hello_world.py`, `tests/test_runtime_consumers.py`, `tests/runtime_consumers.mjs`; `docs/gui-2.0-guide.md`, `docs/architecture/runtime-reorganization-plan.md`.
  - Decisions: use `PageDocument(HtmlBuilder)` with `build_head`, `build_body`, `build_menu` methods and ordinary Python composition/docstrings. Page classes declare `client_builder` and optional `client_setup` as module/export pairs; default builder is the existing HtmlBuilder, widget pages use GalleryBuilder and playground uses PlaygroundBuilder plus mountPlayground. Preserve existing exported names and setup(host, application) calling convention. The server derives configuration from registered classes, never a query-supplied module. Configuration is a Bag serialized with TYTX JSON embedded as inert script data; source recipes retain selectable JSON/MessagePack transport. No Mako, new dependency, artificial identity or ready event. Keep existing route/query entry points and legacy one-page Application.main subclass support. Move shell CSS unchanged into its own asset; preserve theme order, import map, document language, viewport and existing host IDs. No UI redesign.
  - Details: build exactly one HTML5 document with doctype, head and body; keep the page's main recipe out of the initial body. Resolve and validate selected/default page and transport on the server. Put the selected route, transport, existing endpoint/host configuration, builder/setup descriptors and existing development-view visibility into the startup Bag. Defaults for source inspection come from page metadata/configuration, not route spelling. Safely embed both startup payload and import-map JSON: the existing HtmlRenderer treats script/style bodies as raw text, so HTML text escaping alone cannot prevent a literal closing script tag. Preserve typed values and Unicode after extraction/decoding. Build navigation with the document builder from the existing validated menu Bag; include the same branch/webpage destinations, preserve query encoding, and keep the /menu endpoint compatible. Generic JS startup consumes the configuration, imports the declared builder/setup, then uses the existing generation and captured-Application guards around every awaited step. Transport switches continue to dispose old instances and update menu links. Preserve inspector and laboratory ownership through genro.dev. Adapt the bootstrap integration fixture to use real Python-generated shell/configuration rather than its current handwritten HTML. No source edits in sibling libraries are planned; if HtmlBuilder cannot meet a required contract, report the concrete missing capability rather than working around it with a second HTML renderer.
  - Done: the plan's tests for this phase, copied into the test tree with skeleton bodies implemented, pass. Run `PYTHONPATH=src:../genro-builders/src:../genro-bag/src:../genro-tytx/src python -m pytest tests/` and `ruff check src tests`; sibling genro-dom-js `npm test` remains green. Verify document structure and configuration by parsing actual ASGI HTML and decoding it with the real JS TYTX implementation; cover adversarial text including closing script tags, quotes, ampersands and Unicode. Prove arbitrary registered route names select their declared builder/setup without bootstrap edits, in both transports. Preserve all existing ownership/remount/late-response scenarios; do not weaken their assertions when replacing handwritten shell fixtures. Exercise browser startup, menu navigation, transport switching, laboratory rebuild and Ctrl+Shift+D with no console errors. Contract tests inspect observable behavior, not only source-text patterns.
  - Verify: now — view Hello World, one widget page and the laboratory; confirm the layout and familiar interaction are unchanged after moving document construction to Python.

## Boundaries and rationale

One phase is appropriate because document generation and its configuration
consumer form one deployable, verifiable result; neither half is useful alone.
Mode and channel were explicitly selected: interactive, in this conversation.
The owner approved the proposed scope and names with permission to revisit them
if implementation evidence warrants it. That does not authorize speculative APIs.
This is a refactor preserving appearance, not a new visual-design phase.

Later consumers are recipe compatibility/RPC, server identity and root/iframe
transport. Their inherited contracts appear above; they must not infer page
registration, full subtree lifecycle or readiness from this slice. The server
identity integration requires checking actual ASGI code and ratified decisions,
not assuming that the dated websocket design document describes deployed code.

## Starting state and references

Adopt existing branch codex/hello-world; no new checkout, merge or push.
Pages starting revision cafb0a1; DOM dependency f743e6c. Both were clean at planning.
Prior workflow: `.phased/done/page-owned-runtime/plan.md`.
Legacy evidence: `docs/architecture/runtime-legacy-contract.md`, Verified HTML
construction paths (PageTemplate/HeaderTemplate and startup argument preparation).
Current shell: `WebpageApplication.index` reads resources/index.html. Current JS
chooses builders and playground setup by route strings. Existing renderMenu makes
DOM directly; its Bag vocabulary and destinations are retained by build_menu.
ASGI pages contract read at planning is version 0.4 in the reference repository;
it requires HTTP-created page identity before openchannel. No ASGI API is consumed
by this plan beyond the current HTTP application/response integration.

## Quality check

> Quality check: 2026-09-06T21:12:34.232185+00:00 — commit 3d75ea7 — review light, QA done, findings 2 confirmed, 0 dismissed, final touch 2 corrections
