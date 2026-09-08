# Architecture

This page is the map of the library for the people who maintain it. It
describes the modules, their responsibilities, and how a page flows from a
class definition to live DOM. The source of truth remains the module
docstrings and the Python original; this is the orientation layer above them.

## Module map

```
src/
  index.js            public API exports
  source-bag.js       SourceBag / SourceBagNode (on bag-js) + grammar Proxy
                      + data-binding surface (absDatapath, SET/GET/PUT/FIRE)
  builder-base.js     BuilderBase: grammar, bagCall/commandOnNode/setChild,
                      runtimeValues, targetId, source reactivity, render/renderNodes
  builder-handler.js  BuilderHandler: mount, pointerMap, live(), optimize, flush,
                      component rules (per-row templates)
  renderer/base.js    RendererBase: the universal walk
  target-wrapper.js   TargetWrapper + DomTarget (full → DOM, partial → patches)
  application.js      Application (the `genro` object): data + builder + write-back
  pointer.js          pointer helpers (isPointer, parsePointer, scanForPointers)
  collections.js      web-component collection registry (wc_requires)
  contrib/html/       HtmlBuilder (grammar) + HtmlRenderer (→ DOM)
  contrib/svg/        SvgBuilder + SvgRenderer
  collections/        inputs, layout, colorpicker (bundled widget families)
```

## The citizens

```{mermaid}
flowchart TD
    APP[Application<br/>the genro object] --> H[BuilderHandler]
    APP --> T[DomTarget]
    H --> B[BuilderBase<br/>+ HtmlBuilder]
    B --> SB[SourceBag<br/>the recipe]
    B --> R[RendererBase<br/>+ HtmlRenderer]
    H --> DS[(datastore<br/>Bag)]
    R --> T
    T --> DOM[real DOM]
```

**Application** (`application.js`) is the world↔handler layer — the `genro`
object a page interacts with. It owns the handler, the mounted builder and the
DOM target, and exposes `data`, `builder`, `root`. It also implements
write-back (`mutate`): resolve the DOM element to its source node by identity,
derive destination and value from the node's own attributes, write inside
`live()` with the origin as `reason`.

**BuilderHandler** (`builder-handler.js`) mounts builders, owns the segmented
datastore (`{_: shared, <name>: …}`), and drives create/render. It holds the
**pointer map** (path → reader nodes), runs `live()`, and on the outermost
exit runs `_optimizeRender` (net + ancestor-cover + coalesce) then flushes
each touched builder. It also compiles and dispatches component rules.

**BuilderBase** (`builder-base.js`) owns a grammar (`SCHEMA`) and a `source`
SourceBag. The fluent API lands here: `root.body()` → `bagCall`,
`node.h1('x')` → `commandOnNode`, both converging on `setChild`.
`runtimeValues(node)` resolves `^`/`=` pointers and registers `^` readers.
`render` does a full render; `renderNodes` turns a live batch into per-node
patches.

**SourceBag / SourceBagNode** (`source-bag.js`) extend the plain Bag/BagNode
of genro-bag-js with grammar dispatch and the data-binding surface (pointer
resolution, absolute datapath composition, the reactive SET/GET/PUT/FIRE
macros). A `Proxy` serves the fluent dispatch — the JS equivalent of Python's
`__getattribute__` (schema first on the bag) and `__getattr__` (real props
first on the node).

**RendererBase** (`renderer/base.js`) is the universal walk: resolve runtime
values, dispatch to the node's dialect renderer, resolve tag/attrs, recurse
into children, hand off to the dialect hook `renderedItem`, then `finalize`.

**TargetWrapper / DomTarget** (`target-wrapper.js`) is the render
destination. `full(document)` consumes a total render; `partial(patches)` a
batch of per-node ops (`replace`/`insert`/`remove`) applied by DOM id.

## The flow of a page

```{mermaid}
sequenceDiagram
    participant U as new Application(root, page)
    participant H as BuilderHandler
    participant B as builder (page)
    participant R as HtmlRenderer
    participant T as DomTarget

    U->>H: addBuilder(page)
    H->>B: create() → setup() then main()
    Note over B: main() appends nodes to the source Bag (the recipe)
    U->>H: activate()
    H->>R: render(source)
    R->>T: full(fragment)
    Note over T: DOM is live
    U->>U: _enableInput() wires write-back listeners
```

From there, every interaction is a `live()` transaction: a write enters the
datastore, the pointer map finds the readers, the batch is optimized, and
each builder flushes `renderNodes` → `partial` patches. See
[Reactivity](reactivity.md) for the detail.

## Two output types, one walk (DIFF-PYTHON)

The walk in `RendererBase` is a faithful, linear port of the Python renderer.
The one intentional difference: the Python `renderedItem` emits a **markup
string** and joins children; here `renderedItem` returns a DOM **Element**,
`renderChildren` returns an array of Elements, and `finalize` composes a
`DocumentFragment` (append, not `"".join`). The walk architecture is
identical — only the output type differs. These points are marked in the code
with `// DIFF-PYTHON:`.

## Sources of truth (for porting)

- **Python genro-builders** (`../genro-builders/`) — behavior, names, grammar;
  the authoritative document is its `roadmap/architecture-contract.md`.
- **legacy gnrjs** — the oracle for the renderer→DOM model and the
  reactivity anti-echo (`reason` / `doTrigger: sourceNode`).

The porting rule is linear fidelity: same names (`snake_case` → `camelCase`
for methods, classes/tags verbatim), same behavior (if Python raises, JS
throws), and intentional JS-forced differences documented with
`// DIFF-PYTHON:`.

## Not yet ported

Tracked in the module docstrings, each flagged where it belongs:
`${...}` templates, `_present_value` / mask, dtype typing via TYTX,
sub-builders, lazy iterate, and cascade-formula density coalescing.
