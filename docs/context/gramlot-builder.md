# GramlotBuilder — implemented public-dependency baseline

Updated: 2026-09-09. This implementation update supersedes the draft and preview requirements retained below.

## Current API

Python: `from gramlot.builder import GramlotBuilder`. JavaScript: `GramlotBuilder` from the served page module `builder.js`. WidgetTestBuilder/GalleryBuilder and their old modules have been removed, with consumers migrated; no compatibility aliases are supplied.

```python
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx

builder = GramlotBuilder('main')
root = builder.root
panel = root.labledBox(label='Example', datapath='sample')
panel.data('.size', 14)
panel.dataFormula('.css', "({size}) => size + 'px'", size='^.size', _on_start=True)
panel.textBox(value='Hello', font_size='^.css')
payload = to_tytx(builder.source, transport='json')
```

- `builder.root` is the Python authoring facade. Pass it or one of its descendants to reusable helpers. Its `node` exposes the original SourceBag/SourceBagNode and `store` exposes the document datastore. The facade caches node wrappers for stable identity. JavaScript also exposes root, backed by its existing source proxy.
- `builder.source` remains the original generic Source tree; `builder.data` remains the datastore. Generic node.data is unchanged. There is no parent constructor argument and no ownership rewrite: helpers construct under the parent they receive.
- Python facade `data(destination, value, **attrs)` emits dataSetter; `dataFormula(destination, formula, **attrs)` emits formula and rejects func; `dataController(func, **attrs)` preserves the existing controller code contract. Controller script naming remains a separate decision. These are browser code strings, not Python callbacks.
- Declarations use public `set_child`, with validation of their principal arguments in Gramlot. They do not use the inherited formula call wrapper that reinstates func. Raw generic source grammar introspection is still Builders' grammar; it is not the facade's signature specification. Generic element removal under #43 is not assumed compatible with this version.
- Python create runs setup and main but does not execute data-element logic. The browser owns evaluation and reactivity. This does not introduce a new formula expression language.
- `gramlot.transport.to_tytx` makes an explicit detached snapshot, preserving structural node tags, attributes, Source branch types and ordinary Data Bags. Only Gramlot's SourceSnapshot class is registered as XS; generic classes are not monkey-patched. The serialized source must be builder.source, not the authoring facade. Use the Gramlot transport boundary for payloads containing Source.
- WebPage and the ordinary application recipe loader default to GramlotBuilder. Server-document HTML construction remains the generic HTML builder.

## Verified detachment

A new Gramlot-local virtualenv installs from the package definition with public Builders 0.23.2, Bag 0.21.1 and TYTX 0.15.0. No preview import path is used. 110 Python/integration tests and 212 DOM tests pass. A separate clean virtualenv installs the built wheel with public dependencies and passes the installed-distribution check (typed recipes and every browser asset).

Rosetta consumes the built wheel and public Builders with no source override or genro-asgi installed; all 16 backend and 49 browser tests pass (including inspector, forms and repeated panels). See its docs/GRAMLOT-MIGRATION.md for details. Source-based development remains optional and explicit.

## Limits retained

This slice does not implement remote, change controller naming, guarantee cross-builder attachment or add HTML/SVG subgrammar composition. Helpers receiving a parent and root/nested declarations are covered; arbitrary third-party callback/container extension APIs are not promised to become transparent facade APIs. The preview's global Source registration must not be loaded alongside this public baseline because it claims the same XS suffix. Old worktree deletion still requires the unrelated preservation checks in workspace-map.md.

## Earlier design record

# GramlotBuilder: dialect ownership and implementation boundaries

Version: 1.0
Updated: 2026-09-09
Status: **Architectural basis approved by the owner; implementation details below remain open.**

## Recorded decision

Gramlot will own a Python GramlotBuilder and a JavaScript counterpart. They describe the same Gramlot dialect and produce compatible Source trees. Python authors/serializes declarations of browser behavior; the JavaScript runtime executes that behavior. Server work invoked by a browser declaration, such as building a remote fragment, can execute in Python through a host adapter.

The dialect belongs in Gramlot, rather than forcing GUI names and browser execution semantics into generic genro-builders. It should extend the existing HTML builder instead of rewriting HTML. SVG inside HTML requires verification of the grammar/namespace composition mechanism; a separate standalone SVG builder is conditional on an actual need, not an initial requirement. Common Gramlot declarations should be reusable rather than copied between HTML and SVG variants.

Gramlot owns the intended data/formula/controller vocabulary and future remote declaration, widget grammar, and Python/JS wire contract. Generic Builders owns reusable grammar construction and extension mechanisms. Prefer explicit subclasses and supported extension hooks; do not monkey-patch generic classes at import time or copy their internals wholesale.

The possible removal of dataSetter/dataFormula/dataController from generic Builders remains under evaluation in Builders issue #43. It is not an approved removal or a prerequisite automatically satisfied by this decision. If removed, Gramlot can declare its own elements without inherited element-name conflicts.

## Current implementation (observed, not the target architecture)

- Python `src/gramlot/widget_test_builder.py`: WidgetTestBuilder extends HtmlBuilder, enables data_recipe_alias and overrides dataFormula(destination, formula, **kwargs).
- JS `js/pages/src/gallery.js`: GalleryBuilder extends HtmlBuilder and enables the data recipe alias.
- JS generic builder/runtime still contains data-element dispatch. dataFormula consumes formula; dataController consumes func.
- Published Builders 0.23.2 lacks the three relevant preview mechanisms: typed Source registration, GUI data alias and preservation of data-element overrides. The tested preview is commit 25ae619. See workspace-map.md for the wheel comparison.

GramlotBuilder is the approved direction, not an already-completed replacement of these classes.

## Points to settle or prove before implementation

### 1. Extension mechanism and public dependency baseline

Verify a minimal subclass against the published Builders wheel. Determine whether element declarations/signatures, Source class/node factories and metadata can be extended without private monkey patches. Isolate the inherited execution entry points that must not run browser declarations during Python construction. If a generic hook is missing, request that hook in Builders rather than embedding a copied builder implementation in Gramlot.

Decide whether the first step must coexist with generic data-elements or follows their removal. Keep this coordinated with #43; do not implement both models speculatively.

### 2. Authoring names versus datastore access

The intended page vocabulary includes data, dataFormula, dataController and future remote. Specify each signature and Source attributes, including the controller script/func choice. The latest discussion moved ownership into Gramlot; historical naming instructions alone do not settle every signature.

Resolve the actual Python attribute conflict: SourceBagNode.data currently exposes the datastore. Removing dataSetter from BuilderBase would remove an element collision, but would not by itself make node.data(...) callable. Preserve an explicit datastore-access route and do not silently change generic nodes for other dialects.

Also state initialization/assignment timing for data, handling of existing null/empty/zero/false, formula startup/triggers and controller side effects. Naming changes must not imply new expression syntax. Define whether JS keeps object arguments and how that maps to Python positional arguments.

### 3. Source identity and typed transport

Choose whether Gramlot uses the existing SourceBag type with explicit integration registration or a specialized Source type. Define transport identity without a global registration collision. Verify nested Source/ordinary Bags, attributes, null and mixed types through JSON and MessagePack. Both authoring paths must converge on the same JS runtime contract.

### 4. Loader boundary

The loader should select the ordinary Gramlot builder without requiring repeated source_builder configuration in recipes. The plain Python recipe class, composition versus mixin, page context and routing/adapter entry point remain design choices to discuss with the owner. Do not require a routing redesign merely to prototype builder parity.

Page recipes and endpoint classes remain separate; HTTP request and WebSocket connection lifetimes are not page-instance lifetimes. remote needs a future host contract, not networking knowledge in generic Builders.

### 5. HTML/SVG boundary

Prove an HTML page containing namespaced SVG and updates to SVG attributes. Reuse existing grammars/renderers. A standalone Gramlot SVG builder should be introduced only if required; do not expose two competing page builders without a use case.

## Proposed first implementation slice

1. Minimal Python/JS builder parity example against a declared dependency baseline.
2. Typed Source transport and a browser-only formula/controller execution check.
3. Migrate the existing widget grammar and a small representative recipe.
4. Integrate loader selection after its entry contract is agreed.
5. Revalidate existing examples/forms/inspector before retiring WidgetTestBuilder/GalleryBuilder or the preview worktree.

remote, grouplet loading and full routing integrations follow their own contracts. The first slice must preserve room for them, not implement them incidentally.

## Acceptance evidence

- Python construction/serialization does not execute JavaScript logic.
- Equivalent Python and JS recipes produce equivalent observable behavior and preserve types/relative paths.
- Formula/controller metadata does not leak into named bindings.
- Existing input writeback, initialization, disposal, forms and inspector checks remain valid.
- No mutation of generic Builders classes occurs merely by importing Gramlot.
- A clean installation from the agreed public dependency set passes the integration checks before claiming independence from the old preview.

This records a decision and preparatory questions only. No runtime implementation, dependency upgrade or old-worktree deletion was performed as part of this document.

## Verification update

See [public-wheel feasibility results](gramlot-builder-verification.md). Ordinary subclassing works for new declarations and execution suppression, but published Builders currently blocks inherited data-element signature overrides and directly constructs generic Source classes. SVG standalone works in JS; HTML embedding still needs grammar-switch integration.

## Contract draft 0.1 — parent, data and service boundaries

This section advances the design; it does not declare new production APIs. The owner explicitly leaves `data` and parent/proxy handling open.

### Responsibilities

| Layer | Responsibility | Excluded responsibility |
| --- | --- | --- |
| Python GramlotBuilder | Extend HTML grammar; declare Gramlot elements; author typed Source; prevent browser logic from running during Python building | Browser execution, host-specific routing, database assumptions |
| Optional authoring facade | Present recipe names and bind construction to an existing destination; wrap returned authoring nodes consistently | Rewrite generic node properties, take datastore ownership, serialize wrapper objects |
| JavaScript counterpart | Offer the same dialect and produce the same Source contract | Require Python for local recipes |
| JavaScript runtime | Interpret declarations, observe dependencies, update widgets, manage async work and disposal | Embed a specific server or database |
| Host adapter | Resolve allowed services/resources and return typed results or Source fragments | Define generic builder grammar semantics |

### Parent means construction destination

Create one builder for the page and pass a destination into reusable recipes. A fragment can receive an existing node and add children there. That is already possible with published Builders and does not require a new builder per fragment or replacement of the node's `_builder`.

Illustrative authoring shape, not a shipped entry point:

```python
def details(parent):
    parent.data('.title', 'Example')
    parent.div('^.title')

# A page-owned authoring surface supplies this destination.
section = root.div(datapath='details')
details(section)
```

A future `build_into(parent)` convenience would pass the existing destination to a recipe; it must not imply that Builders accepts `parent=` in its constructor. Construction into another builder's tree, subgrammar switching and attachment of remotely returned Source require separate rules. Do not solve them by silently rewriting ownership references. Remote replacement also needs disposal and datastore lifetime rules.

### Two viable directions for data

| Direction | Benefit | Cost and remaining proof |
| --- | --- | --- |
| Gramlot Source/node specialization | Authoring API lives directly on native node types | Needs consistent root/expansion construction hooks; must preserve relative datastore access currently implemented through node.data |
| Gramlot authoring facade over existing Source | Keeps generic node.data as datastore; nested facade.data(...) was proven through the grammar prefix escape | Must define wrapping, unwrapping, identity, callbacks and active subbuilder handling; private `_name` access in the probe must not become a hidden dependency |

**Working recommendation:** investigate the facade first because the public wheel already supports its essential dispatch and parent behavior. Do not declare it selected until a representative recipe and serialization boundary pass. Expose datastore access explicitly on the authoring surface (name still open), while preserving the underlying generic datastore API. Removing generic dataSetter alone cannot resolve the node.data property collision.

### Declaration contract to settle before implementation

- `data`: path/value naming, positional and keyword parity, initial seeding versus subsequent assignment, and behavior when a value already exists. Null, empty string, zero and false are distinct.
- `dataFormula`: destination and formula source; browser execution, startup, dependencies and result writeback. Renaming the parameter does not change the accepted expression language automatically.
- `dataController`: script naming and trigger semantics; side effects belong to the browser runtime. Published inherited schema currently reinstates func despite subclass overrides.
- `remote`: choose whether it configures the existing container as in legacy, declares a child, or offers an explicitly documented convenience. The successful new-element probe does not settle this choice.
- Argument mapping: annotated special data-element parameters currently control positional mapping. Decouple useful generic argument mapping from browser execution policy if generic data-elements are removed.

Use the [legacy service inventory](legacy-data-remote-services.md) to design remote/RPC boundaries. Keep database record/selection helpers optional. The first implementation slice remains builder parity, Source transport and browser-only execution; a full service stack is not an implicit prerequisite.

### Facade acceptance additions

Test nested and root declarations, stable node identity, helpers receiving a parent, relative paths, HTML/SVG subbuilders, callbacks receiving nodes, methods returning containers of nodes, and serialization of the underlying Source without facade instances. Verify the generic builder behaves identically before and after importing Gramlot. A same-builder fragment test alone does not establish cross-builder attachment support.
