# Concepts

The whole library follows from one idea: **a page is a data structure, not
a program that draws itself.** Everything else — the grammar, the renderer,
the reactivity — is a consequence.

## The recipe

When you write a page, you are not producing DOM and you are not producing a
component tree. You are producing a **source Bag**: a hierarchical,
serializable data structure that *describes* the page. This is the recipe.

```js
import { HtmlBuilder, Application } from 'genro-dom-js';

class Page extends HtmlBuilder {
    setup() {
        this.setData('form.name', 'World');
    }

    main(root) {
        const pane = root.div({ datapath: 'form' });
        pane.h1('Hello ').span('^.name');
        pane.input({ value: '^.name' });
    }
}

new Application(document.getElementById('root'), new Page('main'));
```

`main()` runs **once**. Each call (`root.div(...)`, `pane.h1(...)`) appends
a node to the source Bag. When `main()` returns, the recipe is complete —
it is never re-run.

## The three moves

```{mermaid}
flowchart LR
    A[Builder + grammar] -->|main runs once| B[source Bag<br/>the recipe]
    B -->|renderer walks it| C[real DOM]
    D[datastore change] -->|pointer map lookup| E[surgical DOM patch]
    C -.bound nodes.-> D
```

1. **Build** — a builder owns a *grammar* (the legal tags, attributes and
   nesting) and produces the recipe. `HtmlBuilder` carries the full HTML5
   grammar; `SvgBuilder` the SVG one.
2. **Render** — a renderer walks the recipe once and builds real DOM nodes
   (not strings, not a virtual tree).
3. **React** — data lives in a separate hierarchical datastore. Nodes bind
   to it through *pointers*. A data change is looked up in a pointer map and
   patched directly onto the bound DOM nodes. Nothing is re-rendered wholesale.

## Recipe vs render

The separation between *recipe* and *render* is what makes the two input
channels possible:

- a **native JS page** — a class `extends HtmlBuilder` with a `main()`, as above;
- a **recipe imported from Python** — genro-builders on the server produces
  the same source Bag, serializes it, and the browser renders it.

The renderer and the reactive engine are identical in both cases: they only
ever see a source Bag. They cannot tell whether it was built in the browser
or shipped from a server.

## Data lives apart from structure

There is no per-component state. All data lives in **one hierarchical
datastore** (itself a Bag). Structure (the recipe) and data (the datastore)
are two separate trees, joined only by pointers:

- `setData('form.name', 'World')` seeds the datastore.
- `'^.name'` in the recipe is a *pointer*: "render this datum, and update me
  when it changes".
- `datapath: 'form'` on a container sets the base against which the relative
  pointers inside it (`'^.name'`) resolve.

This is why a value can be read in one place, written in another, and computed
in a third, all without threading it through a component hierarchy.

## Why this shape

- **No virtual DOM, no diffing.** The binding *is* the link between a datum
  and its DOM node, so a change knows exactly what to touch.
- **Serializable UI.** The recipe is data — inspectable, storable, and
  producible by a server.
- **One source of truth.** State is not scattered across component instances;
  it is one addressable tree.

Next: [Reactivity](reactivity.md) — how a data change becomes a DOM patch.
