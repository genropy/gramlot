# Components and iterate

A component is a named method that describes a *block*. With `iterate`, the
block is expanded once per child of a collection, each instance anchored to
its own row. Mutating the collection patches only the affected row — down to
a single cell.

## A block per row

```js
class Page extends HtmlBuilder {
    static components = ['stateRow'];

    stateRow(root, { node_label }) {
        const row = root.div({ datapath: `.${node_label}`, class_: 'wcell' });
        row.span('^.name', { style: 'font-weight:600' });
        row.span('^.capital', { class_: 'note' });
    }

    setup() {
        this.setData('states.QLD.name', 'Queensland');
        this.setData('states.QLD.capital', 'Brisbane');
        this.setData('states.VIC.name', 'Victoria');
        this.setData('states.VIC.capital', 'Melbourne');
    }

    main(root) {
        root.div({ node_id: 'list' }).stateRow({ iterate: '^states' });
    }
}
```

`stateRow` is declared in `static components`. Calling it with
`iterate: '^states'` expands it once per child of the `states` collection.
Each expansion receives its `node_label` (the Bag label of the row) and
anchors its `datapath` to that row, so `'^.name'` inside resolves to
`states.<row>.name`.

The Bag label is the identity of the row — the equivalent of a list `key`,
but structural: it cannot be forgotten or duplicated.

## Row and cell granularity

Because each expanded block is anchored to its row, mutations map to minimal
patches:

```{mermaid}
flowchart TD
    M[mutate ^states] --> C{what changed?}
    C -->|row added| INS[one insert patch<br/>new block]
    C -->|row removed| DEL[one remove patch]
    C -->|one field of one row| CELL[one cell patch<br/>only that span]
```

- **Add a row** → one `insert`: the new block is rendered and spliced in.
- **Remove a row** → one `remove`.
- **Change one field of one row** → a single *cell* patch: only the bound
  `<span>` updates.

No list diffing is involved; the anchor subscription catches the mutation and
the reactive engine ([Reactivity](reactivity.md)) turns it into the patch.

```js
genro.live(() => {
    genro.data.setItem('main.states.S9.name', 'New');       // → insert row
    genro.data.setItem('main.states.QLD.capital', 'BRISBANE'); // → cell patch
    genro.data.pop('main.states.VIC');                       // → remove row
});
```

## The component's own subscription

A subtlety worth knowing when maintaining the engine: the expansion is
anchored to the collection, and the component holds a subscription on that
anchor. This is why a mutation *no reader declared* — for example adding a
brand-new row whose fields nothing was yet bound to — still refreshes the
list. The component watches the collection, not just the individual data
paths its rows happen to read.

## Per-row logic: component rules

Row-level data-elements (a `dataFormula` or `dataController` scoped to each
row) are compiled once into **templates** and dispatched per row by
coordinates during the cascade. The controller receives a row context whose
reactive vocabulary (`.x`, `?a`, plain paths) resolves against the *event's*
row, not the row where the rule was registered — so one template correctly
serves every row of the collection.

```{note}
Lazy iterate (virtual scroll: mount count + page 0, client-driven paging as
you scroll) is on the roadmap and not yet ported.
```
