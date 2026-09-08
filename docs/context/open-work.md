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
