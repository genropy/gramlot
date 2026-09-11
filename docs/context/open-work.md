# Open work retained from Pages

## Context menus and symbolic-date help — deferred by owner, 2026-09-11

The symbolic-date syntax menu belongs to the general menu design. The owner
explicitly deferred it until that work is addressed. A localized, dynamically
evaluated example menu and generic component attachment were discussed; no API
was approved and no context-menu runtime was implemented. Resume together with
menus, rather than adding a date-specific mechanism.

## Display formatting alpha — implemented, 2026-09-11

Scalar HTML content now supports reactive `format`, `mask`, and `locale`, named
temporal styles and a bounded LDML subset. See [scope and usage](../guides/display-formatting.md).
A bounded numeric pattern/preset formatter and precision-preserving numberTextBox
are also implemented; see [numeric formatting](../guides/number-formatting.md).
Independent datetime date/time styles, Data-node presentation
metadata precedence and an explicit local datetime carrier remain open. Existing
UTC datetime carriers display UTC; no browser-zone conversion is introduced.

## Date expressions and period links — investigation, 2026-09-11

Subsequent implementation: the owner requested a standalone parser agent and then
an opt-in dateTextBox trial. The importable parser now lives at
`gramlot-dom/date-parser`; `symbolic=True` integrates it through a separate editor
collaborator. See [usage and limitations](../guides/date-expression-parser.md).
The native-key buffer is deliberately limited to uninterrupted typing; pointer
and navigation changes reset it. Owner correction: no expression button; entry
is automatic from the buffer regex. Mobile/IME coverage remains to be verified.
The browser test verified `o` -> text -> `oggi+15` -> date, and `1 T` buffer
preservation -> `2 trimestre` -> 1 April. All 271 JS tests and four teaching
Python tests passed. Real mobile and cross-browser verification remain pending,
as does linked-period validation/commit behavior. No datetime/UTC change.

See [legacy audit](../development/date-expressions-legacy-audit-2026-09-11.md).
Legacy `period_to` links the start field to the end Data path; compact dates parse
in JavaScript and expression fallback runs in Python. The owner suggests browser
JavaScript evaluation and a leading `/` as an expression-entry switch. These
remain design discussion, with no parser implementation or finalized syntax.
The native local datetime editor decision remains definitive.

Local data logic has now undergone coordinator review and corrective work:
see [review checkpoint](../development/local-logic-review.md). The delivered
slice covers local setters, formula/controller expressions/scripts and inline
==. RPC, remote and broader scheduling remain pending; the full logical-block
plan is not complete.

## Gramlot API PoC — resumed by owner, 2026-09-11

The mandatory Gramlot-only rewrite is implemented and now authored in Python
(page.py), using framework openApiClient/openApiForm declarations. Application-local DOM, events,
input scraping and fetch have been removed. Layout, menu, form, source viewer,
response tabs/tree/grid use Source and shared components; state lives in Bags.
Text/auto HTTP response modes and envelopes were added to the framework resolver.
Integration and architecture tests cover the rewrite; all 348 DOM tests passed.

Remaining scope: nested visual object/array editors, composed schemas, external
references, parameter serialization styles and auth flows. JSON array shape is
preserved in memory but not yet a guaranteed TYTX roundtrip contract.
See [the PoC README](../examples/gramlot-api-poc/README.md).

## Simple component guide — immediate owner priority, 2026-09-10

Delivered as [the English HTML handbook](../guides/component-development.html),
with twelve chapters, embedded Gramlot branding and a downloadable example archive.
Source: component-guide-content.md; renderer: scripts/build_component_guide.py.
Native lifecycle/events and mounted reactive integration were checked; the HTML
was reviewed at narrow and desktop widths. Recipient-specific naming was removed.

Before logical-block implementation, prepare a component development guide:
native Web Component first, then its Gramlot integration, as one progressive
guide. The owner refined the deliverable to a professional English HTML handbook
of approximately twelve pages with Gramlot branding and no recipient-specific
names. Use a runnable example and distinguish verified integration
from the proposed manifest/discovery pipeline. The guide also serves to assess
whether the component architecture is understandable. No external delivery
or framework implementation is implied by this documentation request.

The owner-requested [logical blocks plan](../development/logical-blocks-plan.md)
orders data preparation, local providers, RPC, optional FastAPI services and
remote Source composition. It records open choices and acceptance checks;
planning does not approve proposed signatures or start implementation.

Owner requested sequencing this logical-block step before layout implementation.
The plan now groups it into reviewable local Data, expression/provider, server
call and remote-content deliveries. Use existing containers for remote tests;
do not pull new layout work into this prerequisite.

## Data providers and endpoint integration — investigation, 2026-09-10

The owner requested a legacy/current comparison for data, dataController,
dataFormula, dataRpc and remote, including page-defined Python methods versus
host-independent endpoints. The [design audit](../development/data-services-design-audit.md)
records execution rules, current gaps and a proposed optional page-method
registration convention for FastAPI. No endpoint API or implementation scope
has been approved. Keep Data results, lazy Data resolvers and remote Source
composition distinct; page-method convenience need not imply persistent mutable
server page instances.

## Connect and topics — recovered checkpoint, 2026-09-10

The owner requested recovery of the legacy's precise connect/publish/subscribe
rules before component and container design loses them. See the
[source audit](../development/events-legacy-audit.md): direct widget/DOM
connections, page/node/form topics, callback scope and subscription ownership
are distinct. Current page-local topics provide only partial coverage. Preserve
this design input; implementation and exact compatibility APIs remain deferred.

The subsequent core/adapter split is explicitly provisional and requires later
owner confirmation: declared component events and owned, scoped topics in core;
historical syntax, naming and arbitrary method interception in the legacy
adapter. The audit records the full proposal. Do not treat it as an approved
API contract or implementation authorization.

## Deferred toolbar and authorization ideas — owner checkpoint, 2026-09-10

The owner explicitly requires retaining FramePane as a widget in the target
architecture: a partly preassembled border container, not merely a historical
implementation detail. Preserve the distinction between the general
borderContainer and the convenient frame composition with accessible regions
and shared layout behavior. Legacy FramePane's distribution of rounded corners
is confirmed by the owner as the intended historical mechanism. Exact new API
and implementation scheduling remain open; this requirement does not authorize
implementing all container features immediately.

The owner supports a toolbar based on ordinary ordered children, sensible spacing
defaults and optional named groups for extension/reuse. Toolbar implementation is
deferred. A later compatibility wrapper should be evaluated for existing legacy
slotBar/slotToolbar recipes, including callbacks, prefixed options and slot
replacement, not only parsing the slots string. No replacement API is finalized.

Branch authorization is also deferred. The discussed Python callback receives
all node attributes and the page instance (which provides avatar/user context)
and returns whether to include the branch. Naming, registration and exact
exclusion semantics remain ideas. Legacy tags expressions belong in a possible
compatibility wrapper, not a required new core syntax. Do not implement this
callback or treat browser-side visibility as server authorization.

For borderContainer, the owner clarified that closable implies drawer capability
and that panel sizes can be bound to a data path in both directions: data changes
move the splitter; dragging updates the stored dimension. Legacy regions/Bag
hooks are recorded in the drawer audit. Preserve these as container requirements;
current Gramlot local splitter styling does not establish that synchronization.

Nested container corners are another owner-supplied destination requirement:
when an inner container touches an enclosing rounded edge, its presentation
should adapt without repeated recipe declarations. Consider each touching corner,
border/padding offsets, nested layout regions and reactive changes. CSS radius
is not inherited automatically; clipping children and adapting their own border
geometry are different mechanisms. Avoid blanket overflow clipping that would
cut drawer openers or other intentional protrusions. This is architectural
context, not authorization for an immediate rounded-corner implementation.

The immediate container investigation is legacy borderContainer drawers, with
tabContainer also identified as a priority. See
[drawer source audit](../development/drawer-legacy-audit.md). This checkpoint
authorizes investigation, not an unsolicited container rewrite.

Updated: 2026-09-08. These entries preserve discussion; they are not an automatic first-version roadmap. A historical issue link identifies provenance, not its current remote status.

## Questions requiring design work

| Topic | What is still open | What must not be assumed |
| --- | --- | --- |
| LOT | Meaning and boundaries of Live Object Tree | LOT is not yet a renamed SourceBag class or a formal synchronization protocol |
| Builder data ownership | Page-owned/borrowed Bag, stable observation root, subbuilders, seeding, disposal; `data` versus `store` naming | No final global rename, and no requirement for generic Builders to depend on Pages |
| Page loader and endpoints | Plain recipe classes; mixin versus composition; endpoint discovery; access to services; separate lifetimes | The old illustrative `PortableGui`, `AsgiGui` and endpoint decorators do not exist merely because they appear in prose |
| Portable packaging | A FastAPI-friendly install, optional host services, resource discovery and JS inclusion | The current source-override demo is not a verified installed Gramlot package |
| Stores | Legacy store families, identity, row projection, access/update APIs, local/remote loading, views, paging and cleanup | Do not port Dojo wholesale or conflate collection stores with form persistence adapters |
| Local duplicate validation | A collection-identity-aware `localnodup` contract after the store study | A virtual cache cannot guarantee remote uniqueness; `nodup` retains database meaning |
| Grouplets | Definition versus instance; data, method and callback isolation; local versus remote recipes; optional form ownership | Isolating `datapath` alone does not prevent shared-mixin method collisions |
| Remote validation | Service/RPC adapter, typed results, transport errors, stale responses, save barriers | The supplied-function validation hook is not a complete legacy server validator |
| Numeric widgets | Typed parsing, scale, readonly formatting, display versus representability | Formatting is not validation and must not silently round valid model data |
| Asset delivery | ESM build strategy, CSS/JS requirements, optional collections, caching, installed resources | Vite/esbuild/bundling and separate JS publication remain choices, not all approved requirements |
| Routing/page identity | Stable routing class, store access by page id, resolver path, concurrency and auth | Do not invent cached per-page instances, lock guarantees or mutable remote mixins |
| Data synchronization | Selective subtrees, initial value/baseline, server business checks, concurrent changes, save barriers | No full source/data mirroring or production replay guarantee is implemented by the prototype |
| Iframe transport | Root WebSocket, logical page identities, validated parent/child routing and disposal | Do not open one physical socket per iframe as an unexamined fallback |
| Large collections/grids | Window over server selection, bounded client data, scrolling and identity | No complete new grid is available; do not make one a prerequisite for existing demos |
| Server panels | Composable monitor/users/tags/tasks/inspect/orchestration/plugins panels | Inventory is not an implemented GUI; the monitor POC needs live in-memory telemetry, not unrequested durable persistence |
| Legacy coexistence | Optional legacy DB, mixed old/new application resources and package/v2 conventions | The initial standalone ASGI/FastAPI use must not be blocked on hybrid legacy hosting |
| Mobile/accessibility | Real pointer/touch checks, handles, scrolling, zoom, cancellation and keyboard behavior | Automated desktop emulation is not complete device validation |

## GramlotBuilder preparation — 2026-09-09

The [approved architectural basis](gramlot-builder.md) supersedes a generic Builders rename as the default approach. Before implementation, verify public-wheel extension hooks and browser-only execution, resolve node.data versus datastore access, specify Source transport identity and settle the loader entry boundary. SVG embedding needs a conformance check; a standalone SVG builder is not required yet.

Builders #43 now evaluates ownership/removal of all three generic data-elements. Earlier summaries describing it solely as a completed formula rename are historical.

## Specific continuity details

The forms task explicitly requested a substantial legacy-store study. Inventory both `GnrStoreBag/Grid/Query` and `gnr.stores._Collection` families (`BagRows`, `ValuesBagRows`, `AttributesBagRows`, `Selection`, `VirtualSelection`, `RpcBase`, `FileSystem`). Inspect `_identifier`/`identifier`, label, application key, node identity, filtered views and partial loading separately. This is preserved in the historical roadmap and forms conversation; it is not implemented here.

The grouplet review identified two independent collision risks: IDs in repeated recipes and methods mixed into the shared page object. Legacy immediate construction and resource-qualified remote lookup mitigate some cases but are not a general isolation guarantee. Panel/wizard/grid/chunk forms remain research. The wizard analysis noted that advancing after calling save without awaiting completion merits a future behavioral check.

The old manual recorded a `storeTree` retained-callback diagnostic after disposal. That observation belongs to its earlier snapshot; verify the selected DOM commit before treating the defect as present, fixed or newly introduced by migration.

## Historical dependency and issue references

- Builders: [#37](https://github.com/genropy/genro-builders/issues/37) stable root, [#41](https://github.com/genropy/genro-builders/issues/41) SourceBag, [#42](https://github.com/genropy/genro-builders/issues/42) GUI data spelling, [#43](https://github.com/genropy/genro-builders/issues/43) `formula` alignment. The last is reported implemented in the selected preview line; refresh actual status before further work.
- DOM: [#1](https://github.com/genropy/genro-dom-js/issues/1) runtime consolidation. The old six-commit handoff is not the complete selected `d888cef` delta.
- ASGI: [#72](https://github.com/genropy/genro-asgi/issues/72) opaque payload forwarding across commander/UDS/worker. This was parked separately from GUI naming and Builders work.
- The tested preview pins Python Bag 0.21.1, TYTX 0.15.0 and older ASGI compatibility; Bag 0.22/ASGI incompatibility was a historical finding, not a live registry lookup in this import. Refresh before upgrades.
- Bag JS `faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a`, TYTX `6b9bf3a486014d92812caa3b06674083e646c5cd` and Builders `25ae61950717afae10e1d43d8318f272122202ac` belong to the recorded preview. Source overrides must not hide a changed dependency baseline.

The historical `runtime-contract`, `page-owned-runtime`, `python-page-bootstrap` and `registered-page-startup` workflows were completed and archived. They are retained as evidence, not active Gramlot workflows. Earlier prompts requesting agents, messages or releases belong to those tasks and do not authorize repeating them now.

## Verified extension gaps — 2026-09-09

[GramlotBuilder probes](gramlot-builder-verification.md) identified inherited data-element signature replacement as a generic blocker. Hard-coded root/expansion Source construction requires an extension hook only if specialized Source types are selected; a minimal authoring facade already resolves nested data without replacing generic nodes. Python/JS XS transport passed in isolation; full facade conformance and JS HTML/SVG grammar switching remain explicit follow-ups. Parent-driven construction passed without changing ownership; the constructor has no parent argument. No preview dependency was removed.

The [legacy remote/service inventory](legacy-data-remote-services.md) separates RPC, lazy Data, remote Source and optional database helpers. The [contract draft](gramlot-builder.md#contract-draft-01--parent-data-and-service-boundaries) records parent semantics and both data alternatives without selecting one prematurely.

## Continue in Gramlot — verified checkpoint

[Transition handoff](transition-to-gramlot.md): 106 Python/integration and 212 DOM tests pass with explicit preview Builders provenance. Continue framework work here now. First establish a reproducible Gramlot-local environment, then implement the bounded builder slice; publication and historical directory removal remain blocked on their own checks.

## Rosetta consumer update — 2026-09-09

Local migration to Gramlot is implemented in the existing demo-rosetta checkout; see workspace-map.md and its docs/GRAMLOT-MIGRATION.md. FastAPI source consumption is verified without genro-asgi. This resolves the local consumer migration work, not host-optional wheel packaging, repository renaming or removal of Builders preview.

## GramlotBuilder implemented — superseding preview gate

The first facade/transport slice now works with public Builders 0.23.2; see gramlot-builder.md. Gramlot has its own .venv and a clean-wheel installation check. Rosetta consumes that wheel and public Builders. Earlier preview requirements are historical for these migrated consumers. Generic removal under #43, controller naming, remote and broader composition remain separate work.

## Server independence — owner decision, 2026-09-09

Gramlot must not depend on Genro ASGI, including through an optional extra. A future separate application repository will combine Gramlot and Genro ASGI for business applications. This supersedes earlier suggestions for gramlot[asgi] or an optional in-package host adapter.

The integration has been extracted from the Python package and browser assets: application/routes, worker, server configuration, host-specific startup document, WSX/RPC client and bootstrap. Exact originals and associated host tests are preserved under docs/history/asgi-extraction-20260909 with a SHA-256 manifest, excluded from wheels and source distributions. They are recovery material for the future repository, not an active integration maintained inside Gramlot.

Gramlot retains the builder, typed transport, browser runtime, widgets, inspector, recipes and host-independent tests. The CLI only serves local HTML documentation via the Python standard library; it no longer launches an application server. Rosetta owns its FastAPI integration and now installs the Gramlot wheel normally, without --no-deps. No server framework is required by Gramlot.

## Rosetta comparison candidate — 2026-09-11

The owner suggested adding NiceGUI to Rosetta. Record it as a candidate, not an
instruction to modify the separate application immediately. Compare the same
progressive examples using idiomatic implementations, with particular attention
to transfer of learning and shared concepts. Measure production JS/CSS/assets on
cold load and during interactions; keep development editors out of both totals.
NiceGUI is relevant to Python authoring and has a backend-first architecture
(FastAPI, Vue/Quasar and Socket.IO), so distinguish browser-local work from
server-mediated interactions. No NiceGUI integration has been started.

## DRY review and action/menu components — owner priority, 2026-09-11

Separate owner-selected teaching example: lesson `11-source-slider` demonstrates
a JavaScript controller inserting/removing contact-card Source nodes while keeping
their Data. The shared field function uses relative paths under stable example
paths `contacts.c1`, etc.; these paths do not define a store identity contract.
The owner explicitly defers RPC-driven repetition, `_identifier` and stores until
after this slider example. Removing Source must not delete Data. Owner correction:
the example must be Python-authored and shown read-only. `recipe.py` now uses the
existing HTML `script` tag to declare browser functions called by the button and
controller. Its iframe follows content height, including the embedded inspector.
The earlier JavaScript-only editable version is superseded.

Owner clarification in the resumed conversation: this review should identify the
architecture of Gramlot Components around reusable base classes and mixins,
maximizing shared implementation. The owner explicitly assigns the assessment
to a Sol agent, with coordinator review. Validation and `lbl_*`/`box_*`
decoration are candidate shared capabilities; no particular mixin API or class
hierarchy has been approved. Assess how mixins connect components to existing
services rather than duplicating those services. The immediate deliverable is
an architecture proposal grounded in current code, not a framework refactor.

Assessment delivered: [Gramlot browser component architecture review](../development/gramlot-components-architecture-review-2026-09-11.md).
Sol prepared the proposal and the coordinator reviewed the responsibility and
lifecycle boundaries. Base/mixin names, the field adapter, and the first migration
slice remain proposals; no runtime refactor or new test run accompanied the review.

Subsequent owner correction: include `dateTextBox` and `dateTimeTextBox` as the
guiding cases for the architecture slice; color picker is not the selected pilot.
The owner also includes `numberTextBox`, explicitly covering decimal places and
formatting. Assess shared typed-editor capabilities while keeping stored values,
editing, display formatting and validation distinct; verify legacy semantics
before proposing attribute names or rounding behavior.
Later clarification: use GenroPy legacy as the documentation and comparison
reference for all reviewed components, but formal compatibility with its confusing
numeric/date formatting vocabulary is not required. Propose clearer formatting
conventions where useful; see the formatting exception in the decision register.
The existing date/time inputs and the missing date-time component require a
legacy-contract check before selecting a shared base or a single/composite control
shape. The assessment's first-slice section has been updated accordingly.

Before expanding the framework much further, critically assess actual code reuse:
shared responsibilities must have one implementation rather than being copied
between widgets. Review input/binding/decoration/validation and provider lifecycle
boundaries; distinguish necessary component-specific behavior from duplicated
infrastructure. Avoid speculative abstractions that add complexity without actual
shared responsibility. This review is a prerequisite to substantial expansion.

The owner requests adding or completing buttons, dropdown buttons, menus and
context menus as soon as practical. First inventory existing implementations and
legacy contracts, then identify shared menu/action behavior and the missing pieces.
Preserve prior event/topic and layout decisions; this request does not approve
unrelated toolbar, authorization or container redesign. No implementation or
background work started at this checkpoint.


## Tutorial validation presentation follow-up — 2026-09-11

While adding lessons 23–24, browser checks observed a nonempty validation error
message and `data-invalid` on the host while its inner input had
`aria-invalid="false"` after blur (numeric max rule; also email before explicitly
setting email_iswarning=False). Audit competing field-state/blur presenters.
The tutorial tests verify visible messages and correction recovery; they do not
claim this accessibility-state discrepancy is fixed.

## Reusable CI-built browser distribution — 2026-09-11

Design Gramlot's versioned, distributable browser runtime artifact built by its
own CI. Consumers should reuse it across pages instead of each rebuilding the
framework. Define entry points, shared chunks, lazy resources, manifest, notices
and release verification; decide packaging/wheel delivery separately. Rosetta and
site bundling are transitional implementations. See the corresponding owner
decision in decisions.md. No new framework release has been published for this.

Concrete packaging proposal: [CI-built browser distribution](../development/browser-distribution-proposal.md).
It separates the approved distribution objective from the proposed zip/wheel
layout, manifest fields, delivery policy and release gates.

Implementation update: ZIP/wheel payload parity and the optional FastAPI adapter
are implemented and locally verified; see the proposal's local checkpoint.
Framework publication and consumer migration to that artifact remain pending.
The floating inspector defect found during packaging is corrected: recipe
compilation now checks SourceBag typing, and reconciliation preserves externally
attached stores. Browser checks verified populated Data/Source trees, editing and
close/reopen in both source and bundled modes. See the checkpoint for evidence.
