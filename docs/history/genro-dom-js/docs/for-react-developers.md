# genro-dom-js for React developers

You know React. This page maps what you know onto genro-dom-js — and
points out where the model is genuinely different, not just differently
spelled.

## The one big difference

React's mental model: **UI = f(state)**. When state changes, the component
function re-runs, produces a new virtual tree, and React diffs it against
the previous one to find what to patch.

genro-dom-js: **the page builds once**. `main()` runs a single time and
produces a data structure (the *source Bag* — think of it as a JSX tree that
is pure data and never re-created). Reactivity does not re-run anything:
every `^pointer` binding is registered in a pointer map, and a data write
patches exactly the DOM nodes bound to it. There is no reconciliation
because there is nothing to reconcile.

| React | genro-dom-js |
|---|---|
| Component function | `Page` class / component method |
| JSX | fluent grammar calls (`root.div(...)`) |
| `useState` | the datastore (a hierarchical Bag) |
| `setState` → re-render + diff | `setItem` inside `live()` → direct patch |
| Controlled input + `onChange` | `value: '^.name'` (two-way, built in) |
| `key` in lists | Bag labels in `iterate` |
| `useMemo` / derived state | `dataFormula` |
| `useEffect` | `dataController` |
| Context | `datapath` inheritance |
| SSR / Server Components | the recipe can come serialized from Python |

## Hello, state

React:

```jsx
function Hello() {
    const [name, setName] = useState('World');
    return (
        <div>
            <h1>Hello {name}</h1>
            <input value={name} onChange={e => setName(e.target.value)} />
        </div>
    );
}
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

Things to notice:

- **No `useState`.** State is not owned by components; it lives in one
  hierarchical datastore. `setup()` seeds it, `'^.name'` binds to it.
- **No `onChange`.** `value: '^.name'` is two-way: the input renders the
  datum *and* writes it back (on blur by default; `updateOn: 'input'` for
  per-keystroke). The write carries the input as its origin, so the input
  is not re-rendered by its own change — focus and cursor survive without
  any controlled-component dance.
- **No re-render.** Typing patches the one `<span>` bound to `^.name`.
  `main()` never runs again.

## State from outside

Anything can write the datastore; every bound node reacts:

```js
genro.live(() => {
    genro.data.setItem('main.form.name', 'Genro');
});
```

`live()` is the transaction boundary — think of it as automatic batching:
all writes inside it are collected, deduplicated (a parent patch covers its
children), and flushed as one set of DOM patches at the end.

## Lists: `iterate` instead of `map` + `key`

React:

```jsx
{states.map(s => <Row key={s.id} state={s} />)}
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

The component expands once per child of the `^states` collection; each
block is anchored to its row by the Bag label (that's your `key`, for
free). Add a row → one `insert` patch. Change one field → one *cell*
patch. React re-renders the list component and diffs; here the granularity
is native, because the binding *is* the row.

## Derived state and effects

`useMemo` → `dataFormula`: a computed datum that recomputes when its
inputs change.

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
        body.span('^.area');    // 30, then 60 if base becomes 20
    }
}
```

`useEffect` → `dataController`: runs when its bound inputs change, for side
effects. Note the inversion: these are *nodes in the recipe*, not hooks in
a render function — the logic is part of the page description, ordered and
serializable like everything else.

## Context → `datapath`

React Context exists because props must be threaded down. Here bindings
resolve against the datastore hierarchy: `datapath: 'form'` on a container
makes every relative pointer (`'^.name'`) inside it resolve under `form`.
Nesting datapaths composes like nested providers, with no provider
component and no consumer hook.

## Components: two flavours

- **`@container` methods** are like a render helper that runs immediately
  and returns a fillable handle — closest to a React component with
  `children`:

  ```js
  static containers = ['card'];

  card(pane, title) {
      const c = pane.div({ class_: 'card' });
      c.h3(title);
      return c;               // caller fills it: root.card('Title').p('...')
  }
  ```

- **Web-component collections** are packaged widget sets (real custom
  elements) plugged into the grammar:

  ```js
  static wc_requires = ['inputs', 'layout'];
  // now the grammar has dateTextBox, numberTextBox, panel, borderContainer…
  main(root) {
      root.panel({ caption: 'User' })
          .dateTextBox({ value: '^f.date', lbl: 'Date' });
  }
  ```

## What you give up, what you get

You give up: JSX, the ecosystem, render-function composition, and the
"everything is a function of state" purity.

You get: no build step (plain ESM), no re-render cost model to reason
about (no memoization layer: `memo`/`useMemo`/`useCallback` have no reason
to exist), two-way binding without controlled-component ceremony, and a
page that is *data* — serializable, inspectable, and producible by a
server (the Python twin, genro-builders, emits the same recipe).
