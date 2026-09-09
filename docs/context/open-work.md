# Open work retained from Pages

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
