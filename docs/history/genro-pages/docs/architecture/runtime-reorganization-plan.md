# Runtime reorganization: incremental plan

Read [the retained contract](runtime-legacy-contract.md) first. No widget expansion
until the runtime boundaries are clear. Each step keeps the existing gallery usable.

## Ownership and module map

| Public owner | Internal modules / responsibility | State |
| --- | --- | --- |
| genro | Application composition and public forwarding methods | Existing, being reduced |
| genro.events | services/topics.js: local topics and current declarative subscription dispatch | First extraction |
| genro's recipe executor | services/recipe-runtime.js: action scope and parameter evaluation | First extraction; private API |
| genro.src | Source identity, lookup, node lifecycle and recipe construction | Planned; exact legacy signatures need tests |
| genro.dom | DOM lookup/adapters, focus and geometry | Planned; not a duplicate renderer |
| genro.wdg | Collection registration and widget adapters | Planned facade over existing collections |
| genro.dev | Mounted inspector, its shortcut and laboratory experiment | Implemented page-owned disposal |
| genro.rpc | Transport-independent RPC lifecycle | Pending builder contract and transport integration |
| genro.dlg / genro.vld | Dialog and validation services | Later, when real responsibilities are implemented |

Keep pure Bag/TYTX libraries independent of the page runtime. Services receive
an owner reference and do not import window.genro. Only the bootstrap publishes
that global for compatibility. Existing Application entry points remain aliases
while consumers migrate. No JavaScript Proxy is needed solely for namespacing.

## Ordered work

1. **Extract existing responsibilities without changing semantics.** Move topics
   and recipe execution out of Application. Preserve genro.publish/subscribe,
   source-node this and parameter behavior. Run existing integration tests.
2. **Establish lifecycle and service ownership.** Define initialize/mount/ready/
   dispose ordering; migrate inspector, shortcuts and playground under owned
   services. Make disposal idempotent. Test two independent runtimes and repeated
   mount/unmount, including timers and pending clipboard operations.
3. **Generate the page bootstrap on the server.** Use a document builder for HTML
   and a typed startup configuration. Separate page identity from page route;
   registry ownership must be agreed with ASGI, never replaced by a random client
   ID. Configuration selects collections/resources and endpoints. Move laboratory
   CSS out of inline HTML and laboratory controls/menu into a recipe. Remove URL
   special cases from the generic bootstrap. Safely embed configuration and test
   escaping, including script terminators. Do not expose secrets in startup data.
4. **Make source-node APIs the authoring boundary.** Add verified currentAttributes,
   node lookup, runtime access and owner-scoped subscriptions. Centralize action,
   controller and callback compilation. Implement token-aware macros with tests
   for comments, strings, nested expressions, marked paths and event reset.
5. **Consolidate dataFormula/dataController and dataRpc.** Keep core builder APIs;
   add tested GUI compatibility adapters where necessary. Test dependency changes,
   explicit trigger, initialization, conditions and callback scope. RPC requires
   pending/error/result ordering, latest-result policy and page disposal handling.
6. **Unify pointer and CSS foundations.** Split large collection files by actual
   component responsibility while retaining collection entry modules. Introduce
   shared tokens and input/gesture helpers only for demonstrated repetition.
   Validate handles, scrolling, pointer cancellation and mobile keyboards on devices.
7. **Root page and iframe bridge.** One physical socket on the root; children have
   their own genro and page identity. Validate postMessage origin/source and channel
   ownership. Dispose child channels independently. Auth changes and reconnect are
   lifecycle operations, not widget events. Coordinate with the ASGI contract.

## Checks for every migration

- Actual Python -> TYTX -> browser recipe, both supported transports.
- Source-node this and relative paths; no service leaks between page instances.
- Selection and uncommitted field state retained where previously guaranteed.
- Removed owners cannot receive subscriptions or delayed callbacks.
- Module size follows responsibility, not an arbitrary line quota; public collection
  imports remain stable while implementations move into smaller files.
- Update status here and the authoring guide; label temporary aliases and omissions.

## First slice status

This slice extracts the existing topic and action implementation only. It does
not add full disposal, macro parsing, genro.src compatibility, server-generated
bootstrap or mobile gesture parity. Clipboard work from the previous slice stays
separate and must pass its own tests before being described as complete.

Validation of the first extraction: the existing 127 JavaScript tests passed;
 an additional test verifies service forwarding, source-node this, relative writes
and topic isolation between two page runtimes. All 55 Python tests passed,
including gallery recipes across JSON and MessagePack. No claim of physical
touch-device validation or completed application disposal is made.

## Audit update before the next implementation slice

See [the traced lifecycle audit](legacy-lifecycle-audit.md). It identifies distinct
_onBuilt/_onStart stages, recursive source deletion, method-versus-DOM connect
semantics and differing legacy provider signatures. These conformance fixtures
must precede the remaining facade/bootstrap changes. The earlier extraction
is structural only and does not establish lifecycle compatibility. Full mobile
handle and drag/drop coverage remains explicitly open.

## Proposed ownership tree after the contract audit

Status: accepted for implementation trial; public signatures and detailed timing remain proposals. Names below express responsibilities, not new
implemented APIs or settled method signatures.

```text
genro                         one page runtime; composition and lifecycle
|-- data                      one rooted data Bag
|-- src                       source tree, identity, build and owner lifetime
|   `-- source node           recipe this; relative data, owned callbacks
|-- events                    page topics and owner-bound subscriptions
|-- dom                       native DOM events, focus and geometry adapters
|-- wdg                       existing collections and widget integration
|-- dev                       inspector and developer shortcuts
`-- rpc                       future transport-facing service, after ASGI seam

internal modules (not additional globals)
|-- recipe runtime/compiler   callback evaluation and macro syntax
|-- lifetime helpers          cancellation and cleanup, only where exercised
`-- pointer helpers           gesture identity and cancellation when shared
```

Keep genro.publish/subscribe as familiar entry points. Services receive their
page owner, never import window.genro. genro.dlg and genro.vld are deferred until
real responsibilities justify them. Existing builder/renderer code stays in
genro-dom-js; Python bootstrap and page integration stay in genro-pages.

Macro 2 starts from this reviewed matrix plus a reproducible multi-repository
baseline. It ends with the existing gallery, playground and inspector using
owned services and idempotent teardown. Its implementation plan must settle
public lifecycle names, exact hook timing, method-connection adapter surface and
legacy alias signatures before coding. No requirement to add every facade first.

Macro 3 consumes the lifecycle seam for builder-generated bootstrap; Macro 4
consumes source context for compiler/providers. Mobile and root/iframe ownership
remain constraints throughout. Runtime conformance tests must exercise actual
behavior; the audit's schema tests only check the research record.


## Implemented first ownership slice

The `page-owned-runtime` implementation provides idempotent `Application.dispose()`
and a concrete `genro.dev` owner. Inspector and playground helpers retain their
entry points; they register their mounted instance on the page owner. Disposal
removes tool listeners/subscriptions and recursively closes the experiment and
inspector Applications. Rebuilding an experiment leaves the outer page alive.
Bootstrap uses request generations and local Application references to reject
late page/tool responses after replacement or disposal.

This slice does not implement initialize/ready/onStart parity, general source
subtree cleanup, connect interception, remote providers or server/iframe identity.
The larger ownership tree above remains a proposal outside these concrete tools.

### Python bootstrap checkpoint

The document/configuration slice is implemented in `page_document.py` and
`resources/bootstrap.js`, with declared `client_builder` / `client_setup`
metadata on Python pages. Menu HTML now comes from the validated menu Bag via
HtmlBuilder. Existing HTTP recipe and inspector endpoints remain separate.
The runtime ownership fixtures now consume Python-generated HTML, and startup
contracts cover arbitrary registration names and both TYTX transports.

The dependency is resolved in genro-builders 0.23.2 (#39). All 80 pages tests
pass, including the six bootstrap contracts and the ownership scenarios, and
browser startup/navigation/transport/inspector checks pass. The owner accepted
the visual and interaction checks, and the implementation phase is closed. The dependency checkout was updated by
fast-forward while preserving local SourceBag changes; no workaround renderer
was introduced. Issue #38 was closed without a core change: pages can declare
dataRpc through the existing data-element extension mechanism in a later slice.
