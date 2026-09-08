# Source and POC inventory

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

## Repository locations and evidence dates

The local sibling root is
`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects`.
Legacy lives at `/Users/gporcari/Sviluppo/Genropy/genropy`.
These are discovery locations, not portable installation requirements.

The initial reconnaissance recorded ASGI `origin/develop` at
`bfb9517a00b33bfd90eab7fb65f0da3ad9011ae6` (0.42.0), verified then with
`git ls-remote`. The main checkout was then `feat/63-task-cadence` at `f6da9aa`.
**The checkout has since moved:** the handoff snapshot below supersedes that
checkout description, but does not imply the full analysis was rerun on the new HEAD.
No remote freshness claim is made for the handoff snapshot.

## ASGI surfaces found

| Surface | Evidence / behavior | Limits and reuse |
| --- | --- | --- |
| Current monitor | `src/genro_asgi/applications/server_sections/monitor_section.py`: `app_snapshot`, `app_panel`, optional ES `panel_source`, polling about every two seconds; `SERVER_ADMIN`. | Class-specific application and section panels; not a full entity hierarchy. |
| Workbench | `worktrees/monitor-workbench-v1`, branch `feat/monitor-workbench-v1`, initially HEAD `e00bd5f`. Local changes add resources, traffic, series, recent logs, events and alerts. | Actual POC includes uncommitted/untracked files, not just branch commits. Read those files before judging reuse. |
| Monitor 2 | `worktrees/monitor2-skeleton`, initially `6be45cc`, including `c4d970b`: `MonitorTarget`, `MonitorPanelProvider`, `monitor_panel_path`, `monitor_snapshot`, HTML/HTMX and SSE. | Closest class-owned panel experiment: server/app/commander/worker discovery. Workers represented by parent-side proxy and configured class; do not send presentation through orchestration merely because a worker supplies data. |
| Inspector | `applications/server_sections/inspector_section.py`: census, page, SSE, `GNR_ASGI_INSPECTOR` opt-in. | Orchestration diagnostics; routes examined had no `auth_rule`. Reassess access when making a real management surface. |
| User accounts | `users_section.py`: UserStore CRUD, password, metadata/tags; `SUPERADMIN`. | JSON API, no management UI found. Distinct from active users/connections/pages in orchestration. |
| Tasks | `tasks_section.py`: schedules, enable/run, spool, progress, logs, cooperative cancellation, results; `SUPERADMIN`. | JSON surface. Historical notes avoiding core HTML do not rule out the requested GUI in genro-pages. |
| Profile archive | `applications/configuration_profiles.py`, `resources/configuration_profiles.html`, ordinary `/_sysop/configuration/`; REST/MCP and plain HTML/JS. | Archive save is separate from apply. Opt-in surface examined lacked authentication rules. |
| Orchestration apply | SPA `_orchestration/apply`, `reload`, `status`, controlled by `control_enabled`. | Candidate validation, reconciliation and generation tracking; see configuration chapter. |
| Plugins | ASGI configuration / `plugin_mixin.py`; sibling genro-routes `routing.configure()` and `docs/guide/plugin-configuration.md`. | Global/per-handler settings, selectors and introspection exist; no dedicated plugin editor identified in inspected surfaces. |

Workbench local additions included `spa_monitor_panel.js`, `telemetry.py`,
`resource_gauges.py`, `user_traffic.py`, `operations/resources.py`, `recent_logs.py`,
`events.py`, `alerts.py`, plus tests and changes to monitor/server/SPA/orchestration.
Their presence is not a runtime validation. Preserve local changes in all POC worktrees.
The orchestration config-tree/profile branch work was already in develop's ancestry
at initial inspection; it is not automatically a separate feature to port again.

Dynamic application registration is currently construction-oriented:
`src/genro_asgi/server.py`, `register_application`, updates ownership and mount/code
indexes; lifespan starts registered apps and shuts them down in reverse order.
No general symmetric live-unmount lifecycle API was found. Desired live composition
requires further lifecycle investigation; see the server GUI chapter.

## genro-ws-web

At initial inspection: develop `c88c6e6`, with local edits to application/page,
DB demos and CSS, and untracked configuration/widget/demo material. The README
said there was no implementation, while `src` contained a concrete prototype.

`WsLiveApp` uses ASGI/WSX; `WsLivePage` builds through HtmlBuilder. The implemented
flow serves an HTTP shell, calls main over WSX, returns server-rendered HTML and
uses `WsTargetWrapper` to send replace/insert/remove/text/attr/page DOM patches.
Input identifiers and values go back to Python. This is not browser recipe hydration.

Useful concepts include Python page discovery, assets, frameIndex navigation with
tabs/iframes, layout/tree/formlet/input widgets, themes and periodic push examples.
`demo/wspages/tools/inspector.py` inspects live page source/data Bags through requested
snapshots: a UI inspector, separate from ASGI's orchestration inspector. The DB users
demo reads legacy `adm.user`, not the ASGI UserStore.

`WsConnection` owns pages per socket in the inspected implementation.
`roadmap/spa-application.md` proposes session ownership and transport reattachment;
this is not implemented behavior. Current user-sticky ASGI integration is unverified.

`application.py` imports `BuilderHandler` and uses `handler.live()`, but the current
builders export inspected did not include it. `attic/partial-render` contains the
old machinery, explicitly deposited as non-importable/non-running code from
builders `2627f19`. Active tests contain only `__init__.py`; attic tests are historical.
Do not assume a compatible runnable combination of the current repositories.

Builders `roadmap/render-layer-html-ws.md` describes compiled Bag output and path
ins/upd/del mutations replacing DOM operations. It is design material, not evidence
that the bridge was delivered.

## Client integration gap

`genro-dom-js` has an alpha DOM/binding runtime, but the inspected `Application`
accepts a JavaScript builder. `BuilderHandler.addBuilder` invokes create/setup/main
and activation. Source nodes rely on builder/handler ownership and backreferences.
No complete Python recipe loading/hydration path was verified.

`genro-bag-js` provides `Bag.fromTytx`, `fromXml`, `fromJson`; deserializing a generic
Bag does not establish source-node runtime identity or activate bindings. Python
cannot automatically serialize JavaScript function closures either. The first
experiment must expose this boundary, including a deliberately limited recipe subset.

Some comments are stale: genro-dom-js application comments described missing
anti-echo behavior while `_applyMutation` had relevant handling. Verify code, not
only README promises. `genro-app-js` was also examined as pre-alpha application
runtime documentation, not selected in place of genro-dom-js.

## Prior reports and scope

This record consolidates `RICOGNIZIONE_INTERFACCE_SERVER_2026-09-05.md`,
`LEGACY_RECIPE_AND_REACTIVITY_2026-09-05.md`,
`CONFIGURATION_GRAMMARS_AND_RUNTIME_2026-09-05.md` and
`SERVER_GUI_SYNTHESIS_2026-09-05.md` from the previous workspace.
The latter three are preserved as detailed chapters here, so their original local
files are not required to resume. Historical monitor notes from August 31 are
context for the POCs, not approved estimates or an HTMX commitment.

## Local Git snapshot at handoff

2026-09-05, before writing these documents. Dirty means tracked changes or
untracked files were present; HEAD alone cannot reproduce that working tree.

| Repository | Branch | HEAD | Working tree |
| --- | --- | --- | --- |
| genro-pages | `develop` | `e305378f7e59d6aeec7519283551173cdd33803a` | clean |
| genro-asgi | `develop` | `dde07802aa51b263ebcbacfa61804efc539ca5a5` | dirty |
| genro-builders | `main` | `e4efb187cf0a75efa5e85055ee5279691ae13d9c` | dirty |
| genro-dom-js | `main` | `2d8395698791b34e6db1a9c9a42552ff28b0bdc4` | dirty |
| genro-bag | `main` | `1b13b1ef15f8caa772275e5329a7e033af11bab4` | dirty |
| genro-bag-js | `main` | `8aa16deb4cf8239b22d6a0d11634054ebd515d05` | clean |
| genro-ws-web | `develop` | `c88c6e69e045fa6b694d8bcb796fa80046282d09` | dirty |
| genro-routes | `main` | `0051b861d8c43ac726d7b6fa65581f4907dc0d2d` | clean |
| genro-app-js | `main` | `195b9fdf2aca3442db92831ea2c266f0728aff16` | dirty |
