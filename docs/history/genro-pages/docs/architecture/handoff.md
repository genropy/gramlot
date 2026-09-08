# Handoff for the next experiments

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

## Resume here

Read [recorded decisions](decisions.md), then the detailed
[legacy model](legacy-reference.md). Use [POC inventory](poc-inventory.md) to locate
code and [configuration](configuration.md) / [server GUI](server-gui.md) when moving
toward administration. These documents retain the discovery; a new session should
recheck changed source, not repeat the entire investigation or infer missing code
from architectural intention.

The repository was created on 2026-09-05. Seed commit `e305378` contains packaging,
Python namespace, documentation setup, CI templates, Git hooks, and `main`/`develop`.
There is no page runtime, minimal server, browser entry point or behavioral suite.
Python dependencies declare genro-asgi >=0.42.0 and genro-builders >=0.23.0;
`package.json` references sibling genro-dom-js. These declarations are not a tested
cross-repository version combination. No Git remote or deployment is configured.

The seed's package build, Ruff and Sphinx checks succeeded at creation. Pytest had
no tests and exited 5; this is not a passing runtime test suite. The POCs discussed
in these documents were statically inspected, not executed during discovery.

## First experiment: prove the recipe boundary

**Proposed scope for review:** one minimal ASGI server and one tiny page whose
structure is authored using the existing Python builder and constructed by the
existing JavaScript DOM runtime in the browser. Keep the first payload to ordinary
elements, typed attributes and nested children. Do not begin with a complete monitor,
full component library, remote resolver solution or distributed configuration editor.

Before choosing an adapter, inspect the current HtmlBuilder source output and
serializers, genro-bag-js reconstruction, and genro-dom-js builder/source activation.
Record which parts already work and which runtime ownership metadata must be restored.
Test actual APIs and signatures before proposing new public names. Python-to-JS
function transport is not assumed: initially use a declared small subset, then
investigate registered client logic separately.

Evidence required from this first experiment:

1. A reproducible start command and the exact dependency commits/local changes used.
2. The Python-authored recipe and the actual payload visible separately from the DOM.
3. Browser construction through genro-dom-js, with correct nesting, text, attributes
   and order, rather than a manually duplicated JS recipe or server-rendered HTML
   presented as proof of hydration.
4. A source tree whose runtime ownership/backreferences are valid after loading;
   no second framework implementation hidden in the demo.
5. A small behavioral integration check that fails if the boundary breaks, plus
   recorded browser observation and any unsupported subset.

If a library capability is missing, record the minimal reproducer, the responsible
library and a bounded proposed change there. Do not vendor a second copy into
pages or silently replace the experiment with HTML patching. Follow the parent
project workflow for lower-level work and return to this integration afterward.
A larger gap is evidence for discussing scope or an HTML bridge, not proof the
long-term client source/data architecture has changed.

## Subsequent experiments, separately observable

The order below is proposed, not a fixed roadmap. Each step should leave a small
page that can be rerun and inspected independently.

| Experiment | What to demonstrate | Failure modes to expose |
| --- | --- | --- |
| Datastore bindings | A data value updates a display; input writes the Bag; dependent logic updates another value. | Binding/path semantics, relative datapaths, attribute types and input anti-echo. |
| Source mutations | Insert, replace and delete a source subtree after initial rendering. | DOM ordering, teardown, duplicate bindings and detached-node writes. |
| Data push / calls | Server update enters the normal datastore circuit; a request reaches the intended resident page object. | Request/reply correlation, error delivery, page isolation and transport lifetime. |
| Remote fragment | A Python method returns a fragment that changes an existing source branch in response to data. | Child destination, inherited context, assets, stale replies and cleanup. |
| Components | One Python composition and one client expansion using the normal source/data model. | Caller children, local context, reactive inputs and asset availability. |
| Resolver behavior | Exercise unloaded/cached/error states and async consumers separately from immediate-value callers. | Accidental blocking semantics, duplicate resolution and cache/update triggers. |
| Read-only monitor | Compose a small selection of class-owned panels from real server snapshots. | Coupling data providers to presentation, permissions and entity identity. |

Expose source Bag and datastore early, even with a basic inspector. Keep the UI
inspector distinct from orchestration census/worker inspection. Its purpose is to
make experiments explainable, not to implement the final administration navigation.

## Transport and state checkpoints

The direction is initial main followed preferably by WebSocket calls/push. The exact
bootstrap route, wire format and reconnection policy remain open. Server stickiness
means resident ownership in the normal path; it does not imply a synchronous browser
return, automatic reconnect restoration or survival of worker loss. A transport
heartbeat is not the old pending-data polling mechanism. Client-local reactivity
must continue to use the two Bags, without asking Python to recompute every input.

Resolvers require special care: legacy remoteResolver defaults synchronous, but
Deferred and WSK paths exist; remote fragment code also has synchronous call sites.
The hard compatibility question is which callers demand an immediate value, not
whether all resolvers inherently require blocking network access.

## Configuration checkpoints for later GUI work

Preserve grammar ownership, defaults, resolvers and class identity when composing
configuration. Distinguish written recipe, deliberate profile overrides, requested
runtime configuration and effective owner state. Profile save is not profile apply.
The existing orchestration transaction validates and applies live policy without
turning the generic config Bag into an automatic hot-reconfiguration coordinator.

A general editor must not freeze all resolved defaults/environment values into JSON,
confuse `None`-as-missing with policy null/off semantics, or imply one shared Bag
across worker processes. App mount/unmount is a lifecycle operation, with readiness,
active work, failure handling and startup persistence to specify beyond a tree edit.

## Working practice for the next session

Check repository branch/status/hooks and parent instructions first. Use `develop`
for genro-pages integration. Inspect dirty siblings and POC worktrees without
resetting, cleaning or moving the user's changes. The initial discovery's ASGI
branch has already changed by this handoff; see the dated snapshot.

When implementation begins, update Pre-Alpha status as required by parent policy.
Keep reusable changes in their owning libraries and document their exact versions.
Use contract tests for externally visible continuity and classify implementation
checks separately under the parent conventions. Do not report the empty seed suite
as functional validation.

At each experiment's end, record the command to reproduce, source/dependency state,
observed behavior, failures, unsupported features and the next unresolved decision.
Keep evidence separate from proposals; update this handoff when a gap is actually
closed. The next session should know what was demonstrated, not just what was intended.
