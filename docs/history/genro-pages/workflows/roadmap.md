# GUI runtime reorganization

Mode: interactive
Channel: in-chat

## Agreed direction

Legacy is reference experience, not the new product's specification. For every
mechanism, identify the problem it solved, verify that the problem still exists,
and choose a modern implementation on its merits. Preserve useful mental models
and compatibility where they have concrete value; do not retain weak or obsolete
solutions solely for similarity. The GUI coordinator must surface these tradeoffs
and ask the owner when the behavioral decision is unclear.

Preserve the legacy authoring mental model with modern, maintainable internals.
Python builds both the bootstrap document (DOM builder, no Mako) and page recipes.
Each page owns genro, a source Bag and one rooted data Bag. Recipe callbacks use
their source node as this where the legacy contract requires it. Modules follow
responsibilities; public collection imports remain stable. English artifacts.

## Macro 1 — Runtime contract (completed)

Starts from the existing experimental gallery and documented partial audit.
Ends at an evidence-backed compatibility matrix, proposed ownership tree and
behavioral scenarios that make the first implementation macro ready to plan.
No production runtime changes. Archived plan: done/runtime-contract/plan.md.

## Macro 2 — Page-owned runtime (first implementation slice completed)

Archived first-slice plan: done/page-owned-runtime/plan.md.

Requires Macro 1's lifecycle, source context, deletion and connection contracts.
Ends at a usable gallery/playground/inspector owned through genro, with isolated
instances and recursive, idempotent cleanup. Detail implementation phases only
after Macro 1 evidence and API proposals have been reviewed.

## Macro 3 — Python-generated bootstrap (document/configuration slice completed)

Archived workflow: done/python-page-bootstrap/plan.md. Registered identity and
readiness remain separate prerequisites for the full macro outcome.

Requires ownership/readiness from Macro 2 and the approved ASGI identity seam.
Ends at builder-generated HTML and explicit startup configuration, with generic
client startup and recipe-authored laboratory controls. Preserve both TYTX
transports and source/data types. Do not invent registry page IDs.

## Macro 4 — Recipe compatibility

Requires source ownership, startup order and compiler contracts from earlier work.
Ends at verified GET/SET/PUT/FIRE, event connections, topics and data-provider
compatibility for the agreed supported subset. RPC depends on the builder and
ASGI contracts; declaration support alone is not operational RPC.

## Requirements carried through all macros

- Legacy migration: familiar recipe names, relative paths, callback scope and
  parameter meanings; intentional differences documented with concrete reasons.
- Mobile: capability-based pointer handling, usable touch handles, scroll/zoom,
  cancellation and keyboard behavior. Real-device checks remain distinct from
  automated checks. Do not import legacy prototype patches or global suppression.
- ASGI: one physical WebSocket on the root; nested pages have independent identity,
  runtime and cleanup. Parent/child transport routing must not leak page state.
- Data: source/data stay distinct; typed values survive transport. Future selective
  data synchronization must not require mirroring every client dataset on server.
- Existing gallery, inspector and playground remain regression consumers.

Mobile implementation and ASGI integration require later bounded plans. Open
external decisions stay open until the owner records them; mailbox proposals do
not settle them. This roadmap does not authorize speculative facades or new APIs.

The completed first Macro 2 slice establishes Application and tool ownership.
Source-subtree hooks and general connection compatibility still require planning
before declaring the entire macro complete.

## Registered startup continuation — completed

Archived plan: done/registered-page-startup/plan.md.
Both phases are closed; Light quality-check passed with one documentation correction.
Completes the identity/channel slice of Macro 3, preserving the earlier ownership
work. It does not mark Macros 2 or 3 complete in their entirety.

## Remaining bootstrap and resource work

Every item starts with an implementation-level legacy comparison and an owner
question whenever changing semantics is necessary. Completed slices stay recorded
above; the following are outstanding, not implied by a working Hello World.

1. **Page lifecycle completion.** Registration/start/build/ready hooks, request
   context, teardown, final beacon, expiration, freeze/resume and reconnect.
   Requires registered startup; ends at documented and tested lifecycle behavior.
   Decide precisely which legacy callbacks remain public and their ordering.
2. **Resources required by a page.** Normalize compatible js_requires/css_requires
   declarations; resolve package/component contributions, deduplication and CSS
   precedence. Keep py_requires separate: it composes Python behavior and overrides,
   not just files. Decide modern declaration syntax and inheritance explicitly.
3. **Late resources and Web Components.** Load the required collections and their
   dependencies before building dynamically requested recipe fragments; deduplicate
   concurrent loads and surface failures. Decide core versus optional collections.
   Current gallery imports do not implement selective resource loading.
4. **Production asset build.** Evaluate the recent legacy Python EsmBuilder plus
   esbuild against dependency resolution, exports, CSS, shared libraries, dynamic
   imports, version locking, hashed URLs and browser caching. Raw ESM remains the
   development starting point. Vite is not selected. Existing evaluation draft:
   temp/esm-resource-evaluation.md; it is not an approved production design.
5. **Root and nested iframe pages.** Independent genro runtimes and page IDs;
   root-only physical WebSocket, validated postMessage routing, recursive cleanup,
   parent/root relationships and reconnect behavior. Browser caching shares bytes,
   not window globals or custom-element registries. No parent-global class sharing
   is assumed. Requires identity and lifecycle work from earlier slices.
6. **Recipe execution compatibility.** Complete source-node ownership, callback
   this, relative paths, GET/SET/PUT/FIRE, topics, connections and data providers.
   Preserve familiar authoring semantics only where verified. Use modern internals.
7. **Authentication and a real form.** Guest-to-authenticated transition, auth tags,
   page/menu permissions, dataFormula/dataController/dataRpc and server validation.
   Address pending edits, stale replies and save ordering. Requires the core's
   ratified identity lifecycle and builder/runtime support, not declaration alone.
8. **Data and database integration.** Selective synchronized data subtree, initial
   values/dirty state and remote source fragments; do not mirror large client grids.
   A legacy DB may be plugged in until the new SQL layer exists. Hybrid package/v2
   routing remains later work; native ASGI pages come first.
9. **Mobile and accessibility.** Carry pointer cancellation, touch handles,
   keyboard options, focus and scrolling through all component changes; distinguish
   browser automation from actual device evidence. Continue container/widget review.

Requires of earlier work: real server identity, one rooted data Bag per page,
source/data type preservation, page-owned cleanup, no mandatory iframe socket,
no fixed all-widget bundle or database choice embedded in page startup.

External status at planning: asgi-coord's 2026-09-07_1900 mail confirms the browser
proof at 5ae8a4f and leaves merge/release 0.43.1 to the owner. Verify availability
before changing dependency requirements. Freeze/resume has not been demonstrated.


## Approved repository and distribution boundary

- genro-pages owns Python page/server integration and its browser integration code.
- genro-dom-js remains independent of Python, ASGI, page identity and transport.
  Dependencies flow from pages to DOM, never back from DOM to pages.
- Target source layout: src/genro_pages for Python; js/src and js/tests for shared
  page-integration JavaScript. Page-specific assets are a separate resource concern.
- The genro-pages wheel ships compatible JS/CSS and the required, precisely
  selected browser dependency artifacts. Users install the Python package without
  running npm or a JavaScript build. DOM can also ship as an independent ESM/npm
  library. CDN delivery is optional.

Implemented in registered startup phase 2: generic deferred mounting and pages
RPC ownership; integration source move, imports, asset lookup, wheel inclusion
and source-distribution inclusion. Both archives were built and inspected.
Still to implement and verify: complete bundled dependencies; verify editable
installs; install a built wheel in a clean environment and launch it without sibling
checkouts or Node; record dependency versions/licenses and select release build,
manifest and caching details. One authoritative source copy; packaged artifacts
are build output. No package/repository rename is approved or required.

## Released dependency adoption — owner request, 2026-09-07

Replace experimental dependency worktrees after upstream issue handling, review
and release. See `docs/dependency-consolidation.md` for verified gaps, reproduction
evidence, published issue links and adoption order. The owner explicitly approved
publication: Bag #63, Builders #41/#42, DOM JS #1 and the update to Bag JS #4
are now posted. Upstream consolidation and released-artifact verification remain
pending. This does not close the registered-startup phase.

## Mailbox boundary update — 2026-09-07

The owner approved the temporary `genro-asgi>=0.43.1,<0.44` requirement and a
Pages/Stack boundary review before further migration. ASGI 0.44 will move SPA
imports without re-exports; await definitive paths and a released artifact.
Draft: `temp/pages-stack-boundary.md`. The four direct host modules are not the
whole extraction: demo subclasses, tests, string entry_module paths, packaging
and concrete client WSX ownership must be considered. No Stack repo or extraction
is implemented or approved by this note. The prior boundary above records the
current implementation; the proposed direction would supersede its host ownership.

Bridge response: one router per worker after fork; worker supplies gnr_site.
No mixed-router hook/public signature is declared implemented. TYTX unknown-branch
behavior also needs clarification against spec 2.5 before consolidating the
strict-rejection part of Bag #63 and Bag JS #4.

Verification: built wheel metadata matches the source requirement, accepts the
installed 0.43.1 and rejects 0.44.0. No runtime imports changed. Replies to bridge,
asgi-coord and tytx are drafted in `temp/mail-outbox/`; delivery was blocked by
automatic review pending explicit payload/destination approval. None were sent.

## Store entities and logical APIs — backlog, owner request 2026-09-08

Plan a dedicated, substantial study of the legacy JavaScript stores before
introducing the new store APIs. Treat stores as first-class collection entities,
with explicit responsibilities and logical APIs shared by their consumers.
This entry records future work; it does not authorize implementing or porting
store classes now.

Study scope:

- Inventory both legacy families: GnrStoreBag/Grid/Query in gnrstores.js and
  gnr.stores._Collection, BagRows, ValuesBagRows, AttributesBagRows, RpcBase,
  FileSystem, Selection and VirtualSelection in genro_components.js.
- Establish identity semantics: declaration _identifier, runtime identifier,
  label versus node identity versus application key, row projection and key
  lookup. Verify differences between store families rather than treating their
  selector syntax and fallback rules as interchangeable.
- Examine access, iteration, lookup, updates, insertion/deletion, ordering,
  filtered views and index mapping; loading, asynchronous resolution, paging,
  caching, notifications, ownership and disposal. Separate complete local data
  from partial/virtual collections.
- Map relationships with widgets, forms, selection and validation. Distinguish
  collection stores from form persistence adapters and identify reusable seams.
- Classify each mechanism as retain, adapt, replace or defer, backed by concrete
  source references and behavioral examples. Modernize implementations according
  to current needs; neither copy Dojo machinery nor couple the local contract to
  a grid, database or specific hosting server.

Required outcome: a legacy evidence matrix, proposed entities and responsibilities,
logical public API contracts, open decisions for owner review, and a staged
implementation order with consumer-level tests. Verify equivalent Python recipe
and JS authoring behavior across the serialization/runtime boundary.

Dependent validation work: define localnodup against the collection's identity
contract, excluding the current item without relying on its editable business
key. Decide full-collection versus filtered-view scope, typed equality, empty
identifiers, change-triggered revalidation and the limits of a partial local
cache. Preserve the distinction from legacy database nodup and remote checks.
Do not implement localnodup as a grid-specific shortcut ahead of this study.
