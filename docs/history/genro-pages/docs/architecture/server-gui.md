# Server GUI: first synthesis

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

This is a discovery synthesis, not an implementation specification. Existing branches, notes and local changes are POCs: their current limits do not define the intended product. HTML/HTMX remains a bridge hypothesis, not an approved architecture.

## Intended scope

The GUI makes server entities observable, inspectable, configurable and operable. Configuration includes topology and lifecycle, not only scalar parameters. Dynamic mounting/unmounting of applications is an explicit example supplied by the user.

| Entity | Observation / inspection | Configuration / operations |
| --- | --- | --- |
| Server | Composition, resources, activity, diagnostics | Server parameters, application mounting/unmounting, desired startup composition |
| Application | Status, class-provided panel, runtime details | Class grammar, settings, lifecycle and available commands |
| Commander / worker | Census, users, connections, pages, metrics | Policies, process lifecycle and orchestration operations supported by owners |
| Routing plugin | Active settings, scope, handlers | Global and handler settings, activation capabilities |
| User | Account information and, separately, runtime presence | Credentials/tags and supported session operations |
| Task | Schedule, execution state, progress, logs, result | Scheduling, execution and cancellation |

Rows describe the functional investigation scope; they do not assert that all operations are implemented or that they all belong to the same permission level.

## Common class contribution

Investigate how each class can contribute identity, monitor presentation, inspectable information, configuration grammar and supported operations. These contributions should connect to the same entity, while remaining independently usable. A universal contract has not been chosen.

## Configuration has several states

Distinguish the Python recipe (including grammar defaults and resolvers), deliberate persisted overrides, runtime requested configuration, and effective object state. Structural edits need object lifecycle operations as well as tree updates. A JSON profile can describe overrides but cannot stand in for arbitrary executable Python recipes and class identity without a defined representation.

## Dynamic applications: current evidence

In genro-asgi/src/genro_asgi/server.py:146, register_application updates code/mount indexes and ownership. Its documented current scope is construction; it does not implement a full live-mount operation. Lifespan invokes startup/shutdown hooks across the registered applications at server lifecycle boundaries. No symmetric general live-unmount API was found in the search.

The GUI's future mount/unmount action therefore represents a lifecycle request: validate class/configuration and mount, prepare/start the application, publish routing when ready; for removal, handle active work/connections and stop/release the application before completing removal. Failure state and whether the change persists for the next boot must be visible. This is the behavior to understand and specify, not a reason to exclude the feature because the POC only registers at construction.

## Bridge replacement goal

The eventual framework uses Python-authored recipes, client source/data Bags, trigger-driven DOM construction, own web components, compatible authoring names/parameters, remote recipe fragments and mostly WebSocket communication with resident user-sticky server contexts. The interim GUI should retain entity knowledge, class configuration and operational behavior across replacement; the exact UI technology follows the functional synthesis.

## Next decisions to prepare

Identify the initial set of entities and operations; distinguish observation from inspection and commands; define how class-owned contributions are discovered; determine runtime-versus-persisted semantics for settings and structural changes. Only then select the bridge's minimum implementation and staged delivery. These are investigation questions, not a request for another authorization to continue the already requested analysis.
