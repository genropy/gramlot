# genro-dom-js for Vue developers

You know Vue. This page maps what you know onto genro-dom-js — Vue's
reactivity instincts transfer well here, better than React's; the real
difference is *where the template lives*.

## The one big difference

Vue compiles a template into a render function; when a reactive dependency
changes, the component's render function re-runs and Vue patches the DOM
through the virtual tree.

genro-dom-js has no template language and no render function to
re-run: `main()` runs **once** and produces a data structure (the *source
Bag* — the "recipe"). Think of it as your template *after* compilation,
except it is plain hierarchical data, serializable, and even producible by
a Python server. Reactivity skips the component layer entirely: each
`^pointer` binding maps a datum to its DOM nodes, and a write patches those
nodes directly.

| Vue | genro-dom-js |
|---|---|
| `<template>` | fluent grammar calls (`root.div(...)`) |
| SFC (one component per file) | one `Page` class per file |
| `reactive()` / `ref()` | the datastore (a hierarchical Bag) |
| `{{ name }}` | `'^.name'` pointer |
| `v-model` | `value: '^.name'` (two-way, built in) |
| `computed` | `dataFormula` |
| `watch` / `watchEffect` | `dataController` |
| `v-for` + `:key` | `iterate: '^collection'` (Bag labels are the keys) |
| `provide` / `inject` | `datapath` inheritance |
| `<slot>` | container web components (real `<slot>`) / `@container` handles |
| `nextTick` batching | `live()` transaction |

## Hello, v-model

Vue:

```vue
<script setup>
import { ref } from 'vue';
const name = ref('World');
</script>

<template>
  <div>
    <h1>Hello {{ name }}</h1>
    <input v-model="name" />
  </div>
</template>
```

genro-dom-js:

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

`value: '^.name'` **is** `v-model`: it renders the datum and writes it back.
The default write moment is blur (`updateOn: 'blur'`); use
`updateOn: 'input'` for per-keystroke, like bare `v-model` on text inputs.
The write carries its origin, so the input doesn't re-render on its own
change (Vue solves the same echo problem inside `v-model`; here it's the
`reason` riding the data event).

Two things have no Vue equivalent:

- **State is one tree, not per-component.** There is no `ref()` in a
  component's scope: all data lives in a single hierarchical datastore,
  and `datapath` scopes the relative pointers of a subtree — like
  `provide`/`inject`, but for *data addresses* rather than injected values.
- **`main()` never re-runs.** No dependency tracking on a render function,
  because there is no render function after the first pass.

## Writes are transactions: `live()`

Anything can write the datastore; every bound node reacts:

```js
genro.live(() => {
    genro.data.setItem('main.form.name', 'Genro');
});
```

`live()` collects all the writes, nets them (a parent patch absorbs its
children's), and flushes one set of DOM patches at the end — Vue's
scheduler + `nextTick`, made explicit.

## `computed` → `dataFormula`, `watch` → `dataController`

```js
class TriPage extends HtmlBuilder {
    static calcArea(b) { return (b.base * b.altezza) / 2; }

    main(root) {
        const body = root.div({ datapath: 'tri' });
        body.dataSetter({ destination: '.base', value: 10 });
        body.dataSetter({ destination: '.altezza', value: 6 });
        body.dataFormula({
            destination: '.area', func: 'calcArea',
            base: '^.base', altezza: '^.altezza', _on_start: true,
        });
        body.span('^.area');    // 30, then recomputes like a computed
    }
}
```

Differences from `computed`/`watch`:

- Dependencies are **declared** (`base: '^.base'`), not tracked by running
  the getter. What you lose in magic you gain in serializability: a formula
  is a node in the recipe, it travels with the page.
- The result is written *into the datastore* (`destination`), so anything
  can bind to it — it is not a value trapped in a component's setup scope.
- `dataController` is `watch` with side effects; cascades are handled (a
  formula's write can trigger other formulas) with a livelock backstop.

## `v-for` → `iterate`

Vue:

```vue
<div v-for="s in states" :key="s.id">
  <span>{{ s.name }}</span><span>{{ s.capital }}</span>
</div>
```

genro-dom-js:

```js
class Page extends HtmlBuilder {
    static components = ['stateRow'];

    stateRow(root, { node_label }) {
        const row = root.div({ datapath: `.${node_label}` });
        row.span('^.name');
        row.span('^.capital');
    }

    main(root) {
        root.div().stateRow({ iterate: '^states' });
    }
}
```

The component expands once per child of `^states`; the Bag label is the
`:key`, structurally — it cannot be forgotten or wrong. Mutations are
patched at row granularity (add/remove) or cell granularity (one field of
one row), without list diffing.

## `<slot>` → containers

Two flavours, both accepting children:

- **`@container` methods** run at call time and return a fillable handle —
  like a functional component whose slot you fill imperatively:

  ```js
  static containers = ['card'];

  card(pane, title) {
      const c = pane.div({ class_: 'card' });
      c.h3(title);
      return c;
  }
  // usage: root.card('Title').p('content');
  ```

- **Container web components** are real custom elements using an actual
  shadow `<slot>` — children stay in the light DOM, so they remain
  reactive and their events bubble to the write-back as usual:

  ```js
  static wc_requires = ['layout', 'inputs'];

  main(root) {
      const p = root.panel({ caption: 'User' });      // <gnr-panel> with slot
      p.textBox({ value: '^f.name', lbl: 'Name' });
      root.tabContainer({ value: '^ui.tab' });         // selection lives IN the data
  }
  ```

  Note `tabContainer`: the selected tab is a datum (`^ui.tab`), not
  component state — change it from anywhere and the UI follows. This is the
  house style: **there is no component state; everything observable is in
  the datastore.**

## What you give up, what you get

You give up: templates and SFCs, the compiler (and its optimizations
tailored per template), the ecosystem, scoped CSS.

You get: no build step at all (plain ES modules), a state model with one
source of truth instead of per-component islands, `v-model`-grade two-way
binding on every widget including custom ones, and a page that is *data* —
inspectable, serializable, and producible server-side by the Python twin
(genro-builders) with the same grammar.
