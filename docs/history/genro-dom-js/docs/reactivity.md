# Reactivity

Reactivity is the heart of the library. There is no render loop to re-run:
a change to the datastore is turned into the smallest set of DOM patches
that reflects it. This page explains the mechanism, both for using it and
for maintaining it.

## Pointers

A pointer is a string that binds a node to a datum.

```
^alfa.beta        absolute path to a data value
^.beta            relative to the current node's datapath
^alfa.beta?color  the attribute 'color' of the data node alfa.beta
```

`^` is a **reader**: it renders the datum and registers the node as
interested in that path. `datapath` on a container sets the base for the
relative pointers of everything inside it, so bindings inherit down the tree.

```js
const pane = root.div({ datapath: 'form' });
pane.h1('Hello ').span('^.name');   // resolves to form.name
```

## live(): the transaction boundary

Data mutations happen inside `live()`. It is the batching boundary: every
write inside it is collected, and when the outermost `live()` exits the
engine computes one coherent set of patches and flushes it.

```js
genro.live(() => {
    genro.data.setItem('main.form.name', 'Genro');
});
```

Nesting is safe — only the outermost exit flushes.

## From a data change to a DOM patch

```{mermaid}
flowchart TD
    W[setItem inside live] --> EV[data event on datastore]
    EV --> PM[pointer map lookup:<br/>which nodes read this path?]
    PM --> Q[queue touched nodes]
    Q --> OPT[on live exit: optimize<br/>net + ancestor-cover + coalesce]
    OPT --> RN[renderNodes → per-node patch]
    RN --> T[DomTarget applies replace/insert/remove by id]
```

Two kinds of events feed the queue:

- **DATA** — a value changed. The handler subscribes to the datastore; a
  change is resolved through the *pointer map* to the reader nodes, which are
  queued for a `replace` patch.
- **STRUCTURE** — the recipe itself changed (a node added or removed in the
  source). Each builder subscribes its own source root; the change keeps the
  pointer map coherent and queues the path with its kind (insert / remove /
  update).

On the outermost `live()` exit, `_optimizeRender` nets the batch (a node
touched then removed cancels out), covers children with an ancestor patch
when a parent is already being replaced, and coalesces. Then each touched
builder is flushed via `renderNodes`, which produces the actual patch ops.

## Write-back (DOM → data)

Inputs are two-way. `value: '^.name'` renders the datum *and* writes it back
when the field changes:

```js
d.input({ value: '^.name' });                 // writes on blur (default)
d.input({ value: '^.search', updateOn: 'input' });  // writes per keystroke
```

- `updateOn: 'blur'` (default) writes on the native `change` event (focus
  loss, tab, click-out) — good for forms.
- `updateOn: 'input'` writes on every keystroke — good for search-as-you-type.

The destination is never a path sent by the client: the engine resolves the
DOM element to its source node by identity, then derives the target path and
value from the node's *own* attributes. A checkbox binds `checked`;
everything else binds `value`.

## Anti-echo: the origin rides the write

If an input wrote a datum and then re-rendered on that same change, it would
lose focus and cursor position on every keystroke. To prevent this, the write
carries its **origin node as the `reason`** of the data event. The reactive
flush skips the reader that is the origin — so the field that wrote does not
re-render on its own change, while every *other* reader of that datum does.

This is the JS port of the legacy gnrjs `doTrigger: sourceNode` /
`if (kw.reason != this)` pattern.

## Data-elements: logic inside the recipe

Beyond binding, the recipe can carry logic as first-class nodes. They are
part of the page description — ordered, serializable — not hooks in a render
function.

```js
const body = root.div({ datapath: 'tri' });
body.dataSetter({ destination: '.base', value: 10 });
body.dataSetter({ destination: '.altezza', value: 6 });
body.dataFormula({
    destination: '.area', func: 'calcArea',
    base: '^.base', altezza: '^.altezza', _on_start: true,
});
body.span('^.area');   // 30, then recomputes when base or altezza change
```

- `dataSetter` seeds a value.
- `dataFormula` computes one and recomputes when a declared input changes.
  Dependencies are *declared* (`base: '^.base'`), not tracked by running the
  getter — so a formula travels with the page.
- `dataController` runs side effects on input change.

The `func` is resolved from a business-logic class (or given inline as a
callable/code string). A formula's write can trigger other formulas: the
cascade is handled with a livelock backstop (a formula re-queued past a
limit raises, naming the offending function) so an `a → b → a` loop fails
loudly instead of hanging.

Next: [Grammar](grammar.md) — how the builder validates and shapes the recipe.
