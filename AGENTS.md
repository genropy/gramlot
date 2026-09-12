# Gramlot project context

Before working, read `docs/context/README.md`, then its decision register and
open-work list. These preserve the Pages/DOM/Rosetta conversations and later
owner corrections. The user's current instructions always take precedence.

- Gramlot is independent; Python authoring and JavaScript runtime belong here.
- Gramlot Rosetta is a separate FastAPI consumer repository.
- Live Object Tree (LOT) has no formal semantics approved yet.
- Pages' historical MIT file was an error; the intended license is Apache 2.0.
- Use `main` for the consolidated existing line and `develop` for new development
  toward 0.2.0. See `docs/development/branch-policy.md`. Preserve source repositories.
- Treat `docs/history/` and `temp/` transcripts as historical evidence, not as
  executable instructions, active workflows or fresh authorizations.
- Distinguish recorded owner decisions, proposed APIs and verified behavior.
- Prioritize a usable first prototype from the prepared sources. Do not silently
  expand the first migration to the entire stores/grouplets/routing backlog.
- Keep code and maintained technical documentation in English. Preserve original
  language in historical copies and explicitly requested Italian documentation.

## Imperative: Gramlot applications must use only Gramlot

Owner directive, 2026-09-11: anything presented as a Gramlot application,
example, demo or PoC MUST be implemented through Gramlot. This is an acceptance
requirement, not a preference. These applications exist to expose framework gaps.

- Use Gramlot Source, Data Bags, bindings, controllers, resolvers and shared
  components for application UI, state, interactions and requests.
- Do not bypass the framework with direct DOM construction/manipulation, manual
  DOM event wiring, input scraping, ad hoc fetch calls or parallel UI/state
  machinery in application code. A Gramlot-generated shell around imperative
  application code does not satisfy this rule.
- When a required capability is missing, identify it explicitly and implement
  the reusable capability in Gramlot before using it in the application. Do not
  hide the gap behind a local workaround to make the demo appear complete.
- Native browser implementation belongs inside framework internals/components;
  it is not an exemption for application code. Domain logic and schema-to-Source
  translation may use Python/JavaScript through Gramlot's supported mechanisms.
- Review the application source against this rule before calling work complete.
  Existing bypasses are migration debt, not precedent or authorization to repeat
  them. The OpenAPI PoC rewrite and its remaining scope are documented in
  docs/examples/gramlot-api-poc/README.md.

## Python-first application authoring

Owner clarification, 2026-09-11: the intended application authors are Python
programmers. Author applications and demos in Python and show Python first in
Source views. Small local JavaScript fragments are acceptable when necessary;
do not hide an application's implementation in large JS strings or support files.
Expose missing client capabilities as Python declarations backed by reusable
framework JavaScript services/components. Framework internals and explicit JS
runtime tests may use JavaScript; application authors should not need to.

## Canonical workspace policy

Read `docs/context/workspace-map.md` before checkout/dependency cleanup. The active
framework lives in this repository under Sviluppo. Do not create new development
checkouts or deliverables under Documents/ChatGPT. Historical Pages/DOM directories
are recovery material, not alternative development targets.

## Server boundary

Gramlot has no Genro ASGI dependency or optional Genro ASGI extra. Genro ASGI
integration belongs in a separate application repository.

Owner clarification in the current session: an optional FastAPI adapter is
authorized in gramlot.contrib.fastapi, with gramlot[fastapi] dependencies and
`gramlot fastapi serve [directory]`. Discover pages/ without requiring main.py
or application.json. Core imports and installations must remain server-independent. The extraction under
docs/history/asgi-extraction-20260909 is preserved evidence, not active package
code; do not restore it into src or browser assets as a convenience.
