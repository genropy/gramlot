# Recorded direction and open decisions

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

## Explicit user direction

| ID | Requirement / decision | Consequence |
| --- | --- | --- |
| D01 | Name the new sibling repository `genro-pages`. | This is the integration seed for the future framework, with a minimal ASGI server and experimental pages. |
| D02 | Use genro-builders, genro-asgi and genro-dom-js. | Python authors a structured recipe; JavaScript constructs the DOM in the browser. The integration must first be demonstrated. |
| D03 | Keep two live client stores: datastore and source Bag. | Data triggers drive values and logic; source triggers drive structural construction, replacement and teardown. Source is retained after initial rendering. |
| D04 | Replace Dojo with project-owned web components. | Preserve the reactive architecture while changing widget implementation. |
| D05 | Preserve authoring names and parameter meanings, e.g. `borderContainer`. | Migration compatibility is a design constraint; do not rename the public recipe API merely to modernize it. Full legacy compatibility has not been promised. |
| D06 | Initial `main` RPC; preferably WebSockets for later calls and push. | Keep `dataRpc` semantics independent of transport. Replace pending-data ping polling with push; heartbeat has a separate purpose. Exact bootstrap transport/envelope is open. |
| D07 | User-sticky server ownership keeps objects ready for calls. | Reuse resident user/page/application contexts; do not require Redis reconstruction on every ordinary request. Restart/reconnection recovery still needs a contract. |
| D08 | Retain lazy resolvers and `remote` recipe fragments. | Data/operation replies and structural replies both matter. Immediate-value resolver consumers are a compatibility problem to investigate. |
| D09 | Understand and preserve Python and JavaScript composition. | A recipe component need not map one-to-one to a custom element; authoring composition and widget implementation are separate responsibilities. |
| D10 | Classes own composable configuration grammars. | Python recipes, grammar defaults and resolvers describe startup; consumers read the common configuration tree. |
| D11 | Runtime configuration changes require subscriptions and owner application behavior. | Bag mutation alone cannot guarantee an effective timer, policy or pool change. Persist deliberate overrides and apply the selected profile at startup. |
| D12 | Server GUI covers monitoring, inspection, configuration, users and tasks. | Configuration can include mounting/unmounting applications. Panels should be contributed class by class and composed automatically. |
| D13 | Treat current GUI work as POCs and learn from genro-ws-web. | Existing frontend choices and prototype limitations do not define the final product. |

The discussion converged on read-only monitoring as the first practical consumer.
The immediate implementation task is a small integration experiment, before a
complete management UI or framework is designed.

## Architectural interpretation

The long-term page has Python recipe authoring, two live client Bags, a trigger
runtime, component/widget adapters, and a resident server context reached through
RPC/WS. It can be one of many pages within an application; the earlier name `SPA`
was not a restriction to one page for the whole application.

The durable part of server administration is entity knowledge, class-owned
presentation/configuration contributions and owner-validated operations. A future
presentation replacement should reuse that knowledge. Exact contribution discovery
and interfaces remain open, rather than a new universal API declared by this document.

## Not decided

- Wire format, recipe hydration API, browser module loading and asset versioning.
- Exact page class/API names, component expansion contract and web-component adapters.
- Binding syntax coverage and the compatibility subset for the first release.
- Async unresolved-read semantics, cache invalidation and error handling for resolvers.
- Connection/page lifetime, reconnect/replay and worker-loss behavior.
- Runtime configuration transaction/publication semantics across processes.
- General profile layering, resolver/null representation and lifecycle persistence.
- Class-contribution discovery and the final monitor/inspector boundary.
- Scope of plugin management and account management versus active-user operations.

## Earlier suggestions that are not commitments

HTML/HTMX was a possible replaceable bridge, not an approved frontend selection.
A bounded Python-recipe-to-client experiment was recommended first; server-rendered
HTML remains a fallback to discuss if this reveals a much larger dependency gap.
Neither historical monitor estimates nor the proposed experiment order are a fixed
roadmap. ws-web's Python reactive HTML/DOM patch implementation is reference
material, not the chosen client reactive model. No final protocol or code API is
established merely by recording a legacy symbol in these documents.
