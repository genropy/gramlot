# Gramlot project memory

**Latest consolidation: 0.1.3.** The owner authorizes committing and pushing the
completed stores, Genropy contrib and three-grid example to develop, without
release/tag. Customer double-click/dialog work is paused before implementation.
See [release status](../release.md). Earlier 0.1.2 snapshots below are historical.

After the first states-grid experiment: [legacy relation-tree/explorer audit](../development/relation-tree-resolver-legacy-2026-09-12.md).
Verified model traversal, metadata enrichment and lazy Page RPC are distinct;
a Gramlot metadata provider remains a proposal.

Collection stores: [legacy continuity and proposed RPC design](../development/collection-store-design-2026-09-12.md).
The owner wants legacy APIs where possible and continuity of philosophy. The first shared/RPC store slice is now implemented locally and verified with
eight real Australian states/territories through the optional FastAPI–GenroPy host.
The full store migration remains future work; see the design checkpoint.

**Example hosting:** use the common [FastAPI example host](../examples/README.md)
for tutorial, gallery, builder, Hello, RPC and OpenAPI. GenroPy is a design
reference, not a runtime requirement.

**Release scope update:** the owner includes the Data RPC foundation in **0.1.2**.
Implementation commit `ef23584` is on develop; the owner authorized commit and
branch push only. main and release tags have not changed. See [release status](../release.md).

Side discussion retained for future work: [live pandas workspace with Gramlot](../development/live-pandas-workspace-2026-09-12.md).
It records a user-owned DataFrame hosted by Genro ASGI, visual data acquisition and
analysis, and WebSocket updates. This is a future consumer-application idea, not
an active implementation task or a new Gramlot server dependency.

Current RPC consolidation: [consolidated Data RPC contract](../development/data-rpc-consolidated-contract-2026-09-12.md). This is the current entry point for
approved behavior, local implementation, fresh checks and remaining decisions.

**Current direction — 2026-09-12:** main preserves the consolidated existing line;
develop carries the 0.2.0 beta design. Review dataRpc/serverCall and remote before
freezing component grammars. Design precedes an experimental worktree. See the
[component/grammar design](../development/gramlot-0.2.0-component-grammar-design.md),
[RPC audit](../development/datarpc-servercall-legacy-audit-2026-09-12.md) and
[branch policy](../development/branch-policy.md). Later decisions in these records
supersede earlier priorities and migration-only branch instructions below.

Latest continuation: [live pages, RPC, remote Source and shared-state plan](../development/page-services-design-2026-09-12.md).
It records the final override/redecoration rule, ready-browser lifecycle, exclusive
store ownership, revised standalone boundary and the uncommitted RPC experiment.
The owner subsequently authorized a Sol experiment for page services (P1–P5),
with verification and without component grammar expansion or publication. The agent
completed that slice locally; the later [RPC interaction alignment](../development/rpc-source-node-alignment-2026-09-12.md)
replaces _concurrency with SourceNode-owned busy refusal and restores delay/action semantics.

**Python-first authoring:** application authors work in Python with only small
local JS fragments when needed. The OpenAPI PoC now uses page.py, openApiClient
and openApiForm declarations; reusable browser behavior lives in the framework.
See [the Python client contract](../guides/openapi-client.md).

**Imperative owner rule, 2026-09-11: Gramlot applications must use only Gramlot.**
Examples and PoCs must expose missing framework capabilities, never disguise
them with application-local DOM, event, state or HTTP workarounds. Implement
missing reusable capabilities in the framework. See the mandatory rule in
[AGENTS.md](../../AGENTS.md) and the [decision register](decisions.md).
The OpenAPI PoC has now been rewritten around Source, Data Bags, bindings,
controllers, resolvers and shared components. See its [architecture and limits](../examples/gramlot-api-poc/README.md).
An integration test and a source audit guard against application bypasses.

HTTP resolver authoring now exposes `urlResolver` and `openApiResolver` in Python
and JavaScript. Browser requests publish Bags to Data, cancel stale requests,
and expose request state. OpenAPI discovery follows the Python tag/operation
layout; endpoint invocation is explicit. See the [HTTP resolver guide](../guides/http-resolvers.md)
for implemented behavior and boundaries.

Grid structure now follows the legacy Data Bag contract through `structpath`:
`view_0.rows_0.cell_*`, definitions in attributes, node order as column order,
resize writing back to the original cell. Both gallery pages expose `struct`.
See the [legacy structure audit](../development/grid-structure-legacy-2026-09-11.md).

Resident grid formulas now write calculated fields into Bag-valued or
attribute-backed records, with deterministic chains, reactive `formula_*`
parameters, `#`/`+=field`/`%=field` special forms and Decimal-backed arithmetic
for a bounded expression grammar. See the [grid guide](../guides/static-grid.md#resident-formulas)
and [implementation plan/outcome](../development/grid-formulas-plan-2026-09-11.md).

Static grids now support both `datamode='bag'` and `datamode='attr'`. A reusable
resident collection-store layer retains a bounded subset of legacy read/update
APIs; see [assessment and implementation](../development/collection-stores-2026-09-11.md).
The gallery includes paired Python/JavaScript attribute-row examples.

The first static grid alpha now displays a complete resident Bag with typed
columns, bounded rendering and stable-key selection. Python and JavaScript
examples include 50 rows. See the [grid guide](../guides/static-grid.md) and
[verification checkpoint](../development/static-grid-implementation-2026-09-11.md).
The [incremental plan](../development/static-grid-plan-2026-09-11.md) remains the
proposal for later editing, filtering, groups and configuration work.

Python and JavaScript now support Source-owned `css` and `styleSheet` declarations
for inline rules, complete stylesheets and external CSS, including reactive
updates and branch cleanup. See [CSS declarations](../guides/style-resources.md).

Publish/subscribe uses the application-local `genro` coordinator, with declarative
controller subscriptions and Source-owned callback cleanup. See
[publish and subscribe](../guides/publish-subscribe.md).

Latest numeric addition: numberTextBox uses a free text Decimal-aware draft and
shared numeric formatting with reactive format/places/locale. Places affects only
display precision. Lesson 13 compares displayed and stored values. See
[numeric formatting](../guides/number-formatting.md).

Latest display addition: scalar HTML content accepts reactive `format`, `mask` and
`locale`, with named temporal styles and a bounded LDML subset. Raw Bag values
remain unchanged. See [display formatting](../guides/display-formatting.md).

Latest component implementation: the owner authorized a practical alpha. Current
Web Components now have description/registration adapters; inputs and colorpicker
share ControlElement, with Decorated and FieldState capabilities and existing
shared services. The catalogue generates production Python declarations. The
rebuilt developer handbook includes executable shared-base examples. See
[alpha implementation and limits](../development/component-alpha-implementation-2026-09-11.md).

Latest experiment: `dateTextBox(symbolic=True)` uses the standalone JavaScript
date parser, with `locale`/`workdate`, ordinary free text editing, a reusable calendar popup,
Enter/blur confirmation and Escape cancellation. Native date segments and switching
are superseded by the owner-authorized text-editor alpha. See
[parser and field usage](../guides/date-expression-parser.md#experimental-datetextbox-integration)
and teaching lesson `12-symbolic-date`. Periods currently select their start;
`period_to` remains unimplemented. The option and editor integration are a
prototype, not the proposed component base/mixin migration.

Latest owner decision: `dateTimeTextBox` uses native `datetime-local` for local
date/time editing; the consuming server converts to UTC for storage. This
supersedes the assessment's composite datetime and browser UTC conversion
proposal. See [decisions](decisions.md#local-datetime-editor--owner-decision-2026-09-11).

**Current handoff:** [Component architecture and Python Source slider — 2026-09-11](../development/handoff-components-source-slider-2026-09-11.md). Read this first when resuming.

Latest implementation: teaching lesson 11 is Python-authored and read-only, with
an embedded controller receiving the contact Bag, slider count and trigger context,
one `script` function for panel construction, externally injected contact generation
and population, Source-only slider changes, responsive
titled cards, a resizable example/code split and an embedded inspector. Store and
`_identifier` work is explicitly deferred. Sol's architecture assessments are
complete proposals awaiting further discussion, not active background work.

Next-session owner priorities: assess DRY/shared implementations before substantial
expansion, then prioritize buttons, dropdown buttons, menus and context menus.
See [open work](open-work.md#dry-review-and-actionmenu-components--owner-priority-2026-09-11).

Latest discussion checkpoint: [resolver grammar and transfer of learning](../development/data-resolver-legacy-audit.md#owner-discussion-checkpoint--resume-after-2026-09-11). Resume this discussion before implementing resolver integration.

Earlier implementation checkpoint: [local logic, component handbook and parked API
PoC — 2026-09-10](../development/handoff-local-logic-components-2026-09-10.md).
Teaching lesson 10 now contains four independent examples with 3–4 relevant
statements each: reactive formula, passive read, inline expression and controller.
Explanations live outside recipes. Python appears above JavaScript, each with
the example on the left and code shown once on the right. JavaScript has a
CodeMirror laboratory with Run and Reset.
All 13 Python/JavaScript pairs and browser checks passed; see the handoff update.

Updated: 2026-09-08. This is a record of owner decisions and inherited work, not a new API specification.

Read [decisions](decisions.md), [conversation summaries](conversations.md), [open work](open-work.md), and the [first-version scope](first-version.md) before continuing implementation. [Historical documents](../history/README.md) retain detailed source evidence. New user instructions take precedence over every historical record.

See [canonical workspace and retirement map](workspace-map.md) before choosing a checkout or removing old directories.

Read the [approved GramlotBuilder architectural basis and remaining questions](gramlot-builder.md) before changing authoring APIs.

See the [legacy data and remote service inventory](legacy-data-remote-services.md) and [public-wheel builder probes](gramlot-builder-verification.md) for the new builder contract discussion.

Read [development transition and next-task handoff](transition-to-gramlot.md) to continue directly in Gramlot while keeping release and cleanup gates separate.

Read the latest **Server independence** decision in [decisions](decisions.md): no Genro ASGI dependency or extra belongs in Gramlot; the later optional FastAPI decision is separate. The old integration is archived for a separate application repository.


Latest inspector/gallery checkpoint: [framework handoff, 2026-09-09](../development/handoff-inspector-gallery-2026-09-09.md). Read it before resuming the uncommitted inspector work or the input grammar discussion.

## Current direction

**Gramlot — GRAMmar for Live Object Trees** is the independent home for the framework previously developed in Genro Pages and Genro DOM JS. The official homepage is https://gramlot.com. The tentative `genro-gui` name is superseded. Live Object Tree (LOT) is intentional vocabulary whose formal semantics remain open; `GRAMmar` evokes Python builders as grammars describing these trees.

**Gramlot Rosetta** is a separate FastAPI consumer and comparison application, intended repository name `gramlot-rosetta`. Its independent installation should expose unwanted framework/host coupling. Generic Bag, TYTX, Builders and server libraries remain external.

**Owner decision, 2026-09-09:** keep the projects under the existing `genropy` GitHub organization. The separate `gramlot` organization proposal is withdrawn; that username is occupied. The active repositories remain `genropy/gramlot` and `genropy/demo-rosetta`. Gramlot Rosetta remains the product name; no repository transfer or rename is implied.

The owner explicitly corrected Pages licensing: **MIT was an error; Apache 2.0 is the correct project license.** Original historical license files are retained as evidence, with this correction taking precedence for the active migration. Preserve copyright and genuine third-party notices.

The immediate priority is a first usable Gramlot version from the existing prototype. Do not turn the full historical research backlog into a release prerequisite.

## Baseline and actual migration state

| Source | Commit prepared | Content |
| --- | --- | --- |
| Genro Pages | `0683f5dca8ea04b7047fed56e68317b27b9aa745` | Python page authoring, startup/host integration, browser page modules, tests and manual |
| Genro DOM JS | `d888cefbb4dfb65868148afb2e00cabe84b4de08` | Standalone DOM runtime, binding, widgets, forms and tests |
| Demo Rosetta | `08486b466b4971b89675090ed07509929354a697` | FastAPI app; React, Vue, Python and JS comparison recipes |

The local preparation contains 464 tracked files and eight separately retained draft notes, with verified Git blobs and SHA-256 hashes. The selected DOM source is the `codex/python-js-alignment` worktree, not its older canonical `main`. Rosetta already pins the selected Pages and DOM commits. Preparation snapshots are under ignored `temp/migration-2026-09-08/` on the original development Mac.

**Update 2026-09-09:** Python and browser runtime sources have been copied and renamed into Gramlot, and an alpha distribution is being prepared. See [release status](../release.md) for current installation checks and the remaining differences from published Builders 0.23.2. Test results in historical documents still refer to their original checkouts and dates.

## How the memory is preserved

Five Pages-related Codex tasks were identified in the app. Their visible text was recovered from their local session records because the app's paginated summaries omitted some recent items. The local archive contains 1,808 role-tagged text records before classification of injected instruction blocks. It includes user text and assistant commentary/final answers, not tool output, private reasoning or developer/system messages. Historical file/skill instructions embedded as user-role text are marked as injected context, not owner decisions.

The archive has Markdown and JSON copies, message numbers, timestamps and hashes in ignored `temp/conversations-2026-09-08/`. Message numbers in the summaries refer to those copies. The summaries and historical documents are versioned here, so the important decisions travel with a clone even without the original Codex session storage.

Coverage is the five identified local Pages tasks, September 5–8, 2026. This is not a claim to export every Genro discussion from every account, application or collaborator. Seventeen non-text attachment blocks were identified; their image/file bytes were not copied into the text archive. Some initial requests were supplied as attachments, so their detailed intent is also recovered from linked documents and coordinator messages. Original sessions remain intact.

## Reading rules

- Owner corrections supersede earlier suggestions: for example `formula` has no `func` alias, the CSS direction is native, and Rosetta is a separate repository.
- A proposed class, API or directory shown in the old manual is not approved merely because it appears in a diagram.
- Historical commands and absolute paths describe the former environment. Use them as provenance, not current installation instructions.
- Distinguish an implemented prototype, a historical test report, an accepted requirement, an open design decision and a suggested enhancement.
- Keep the source repositories and local archives intact. No historical task is resumed, messaged or delegated merely because its instructions were copied into this memory.

## FastAPI adapter update — 2026-09-09

The optional FastAPI adapter and `gramlot fastapi serve [directory]` are now
implemented. This supersedes earlier statements that all server adapters are
external or that the CLI only serves manuals. Genro ASGI remains excluded.
See [FastAPI guide](../fastapi.md).

Latest textBox checkpoint: [legacy compatibility audit, 2026-09-10](../development/textbox-legacy-audit.md) and [revised contract proposal](../development/textbox-contract-proposal.md). The owner requires legacy syntax/names/behavior unless a change is indispensable; the earlier restrictive draft is superseded.

Maintain the [intentional legacy differences register](legacy-differences.md) for owner-approved exceptions, including continuous-update naming and label placement. It separates approved decisions from pending implementation and unresolved spelling.

See [module, gallery and progressive-learning analysis](../development/module-gallery-learning-organization.md) for the proposed organization around inputs, labledBox, formlet, validation and form. It is analysis, not an approved module migration.
