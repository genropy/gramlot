# Grammar and builders

A builder owns a **grammar**: the set of legal tags, their attributes, and
their nesting rules. The grammar is what turns free-form method calls into a
validated recipe.

## Tags come from the grammar

`HtmlBuilder` carries the full HTML5 grammar; `SvgBuilder` the SVG one. A
call like `root.div(...)` is dispatched through the source Proxy, checked
against the grammar, and appended to the source Bag as a node.

```js
class Page extends HtmlBuilder {
    main(root) {
        const pane = root.div({ class_: 'card' });
        pane.h1('Title');
        pane.p('Body text', { class_: 'note' });
    }
}
```

The first positional argument is the node value (text or a `^pointer`);
options are passed as an object. Attributes that collide with JS keywords use
a trailing underscore: `class_`, `for_`.

## Two ways to extend the grammar

### @container methods — call-time structure

A `@container` method runs *now*, writes real source nodes, and returns a
fillable handle. It is plain composition — no custom element, no shadow DOM.

```js
class Page extends HtmlBuilder {
    static containers = ['card'];

    card(pane, title) {
        const c = pane.div({ class_: 'card' });
        c.h3(title);
        return c;              // the caller keeps filling it
    }

    main(root) {
        const c = root.card('Users');
        c.p('content goes here');
    }
}
```

Use a container when you want a reusable *shape* built out of existing tags,
resolved at build time.

### Web-component collections — packaged widgets

A collection bundles a grammar (its tags) and the code that defines the
corresponding custom elements. A page declares the collections it needs; at
create time the builder merges their grammar and defines the elements.

```js
import 'genro-dom-js/src/collections/inputs.js';   // registers 'inputs'
import 'genro-dom-js/src/collections/layout.js';    // registers 'layout'

class Page extends HtmlBuilder {
    static wc_requires = ['inputs', 'layout'];

    main(root) {
        const p = root.panel({ caption: 'User' });
        p.dateTextBox({ value: '^f.date', lbl: 'Date', updateOn: 'input' });
        p.numberTextBox({ value: '^f.qty', lbl: 'Qty' });
    }
}
```

The collection tags (`dateTextBox`, `numberTextBox`, `panel`, `box`,
`borderContainer`, `tabContainer`, `colorpicker`, …) join the grammar and
render as native custom elements. Pointer binding and write-back work exactly
as for built-in tags.

You can also require a collection dynamically in `setup()` with
`this.wcRequires('inputs')`, the runtime equivalent of the static member.

### Bundled collections

- **inputs** — typed input widgets (`textBox`, `dateTextBox`,
  `numberTextBox`, `checkBox`, …), each projecting to a `<gnr-…>` custom
  element with pointer-bound value and write-back.
- **layout** — container widgets that accept children through a real shadow
  `<slot>`: `panel` (framed box with a caption), `box`, `borderContainer`
  (CSS-grid regions with optional splitters and collapsible drawers), and
  `tabContainer` / `tab` whose selection lives **in the data**
  (`value: '^ui.tab'`).
- **colorpicker** — a single-widget collection, the minimal example of the
  pattern.

## When to use which

| Need | Use |
|---|---|
| A reusable shape from existing tags, built now | `@container` method |
| An encapsulated, reusable widget with its own element | web-component collection |
| One row of a page repeated over a collection | `@component` + `iterate` (see [Components](components.md)) |

Next: [Components](components.md) — repeating a block over a collection.
