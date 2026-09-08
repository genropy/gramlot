# genro-dom-js

A JavaScript UI library where **the page is data, not code**.

You describe a page through a fluent, validated grammar; the result is not
DOM and not a component tree — it is a **Bag**: a plain, serializable,
hierarchical data structure (the "recipe"). A renderer walks the recipe and
builds real DOM. A reactive engine keeps the DOM alive: every change in the
datastore becomes a surgical patch on exactly the DOM nodes bound to it —
no virtual DOM, no re-render, no diffing.

genro-dom-js is the JavaScript counterpart of the Python
[genro-builders](https://github.com/softwellsrl/genro-builders) package.
Because the recipe is data, the *same* page can be authored in JS in the
browser or generated in Python on the server, serialized, and rendered by
this library — the renderer and the reactivity engine cannot tell the
difference.

## Status

**Alpha** — the core is implemented and tested (builder grammar, HTML and
SVG dialects, data + structural reactivity, two-way write-back, components
with per-row patching, layout containers, pluggable web-component widget
collections). The API may still change.

## A taste

```js
import { HtmlBuilder, Application } from 'genro-dom-js';

class Page extends HtmlBuilder {
    setup() {
        this.setData('form.name', 'World');
    }

    main(root) {
        const pane = root.div({ datapath: 'form' });
        pane.h1('Hello ').span('^.name');          // reads the datum, live
        pane.input({ value: '^.name' });           // writes it back on blur
    }
}

const genro = new Application(document.getElementById('root'), new Page('main'));
```

Type in the input, leave the field: the `<h1>` updates. Only that one text
node is touched. Change the datum from anywhere else —

```js
genro.live(() => genro.data.setItem('main.form.name', 'Genro'));
```

— and both the heading and the input reflect it.

## Core concepts

### Builder and grammar
A builder (e.g. `HtmlBuilder`) owns a **grammar**: the set of legal tags,
their attributes, and their nesting rules (full HTML5 and SVG grammars ship
in `contrib/`). Calls like `root.div(...)` are validated against the
grammar and append nodes to the **source Bag** — the recipe.

### Datastore and pointers
Data lives in a hierarchical datastore (a Bag). A node binds to it with a
**pointer**: `'^form.name'` means "render this datum and update me when it
changes". `datapath` on a container sets the base for the relative pointers
(`'^.name'`) of everything inside — bindings inherit down the tree.

### Reactivity: patches, not re-renders
There is no render loop to re-run. A data write inside `live()` is looked
up in the pointer map; only the bound nodes are re-rendered, and structural
changes (a node added/removed in the source) become `insert`/`remove`
patches. Inputs write back to the datastore (`updateOn: 'blur'` or
`'input'`), carrying their origin so they don't re-render on their own
change (anti-echo: focus and cursor survive).

### Components and iterate
A component is a named method that describes a block; `iterate` expands it
once per child of a collection, each block anchored to its row:

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

Adding, removing or mutating a row in `^states` patches only the affected
row — down to the single cell.

### Data-elements: logic in the recipe
`dataSetter` seeds a value, `dataFormula` computes one (and recomputes when
an input changes), `dataController` runs side effects:

```js
body.dataFormula({
    destination: '.area', formula: 'calcArea',
    base: '^.base', altezza: '^.altezza', _on_start: true,
});
```

`dataFormula` accepts only `formula` (a callable, function name, or JS function
text). The removed `func` parameter is rejected; `dataController` still uses
`func`. This rename does not introduce a new expression syntax.

### Extending the grammar
Two flavours of reusable structure:
- **`@container`** methods — run at call time, write real source nodes,
  return a fillable handle (`root.card('Title')`).
- **Web-component collections** — widget sets (`inputs`, `layout`,
  `colorpicker`) plugged in with `static wc_requires = ['inputs']`; their
  tags (`dateTextBox`, `panel`, `borderContainer`, `tabContainer`…) join
  the grammar and render as custom elements, with the same pointer binding
  and write-back as native tags.

## Running the examples

No build step — the library is plain ES modules. From the directory that
contains `genro-dom-js` and its sibling `genro-bag-js`:

```sh
python3 -m http.server 8010
# then open http://localhost:8010/genro-dom-js/examples/index.html
```

## Tests

```sh
npm install
npm test        # node --test on jsdom (real DOM)
```

## Dependencies

- [genro-bag-js](https://github.com/softwellsrl/genro-bag-js) — the Bag
  data container (the recipe, the datastore, and the event system).

## Coming from React or Vue?

- [genro-dom-js for React developers](docs/for-react-developers.md)
- [genro-dom-js for Vue developers](docs/for-vue-developers.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

Copyright 2025 Softwell S.r.l.

## Loading a Python-authored source

Before mounting, call `builder.loadSource(source.to_tytx())` with the Python
source payload, or pass a decoded JavaScript Bag. Then use the existing
`new Application(rootElement, builder)` constructor. `loadSource` replaces the
native `main()` authoring step; `setup`, collection resolution and reactive
activation still run normally. Import required collections before mounting.

The loader restores SourceBag/SourceBagNode identity, labels, node tags,
attributes, children and builder/handler backreferences. Ordinary HTML source
is covered by a Python-generated fixture and DOM behavioral tests, including
input writeback and later source insertion/deletion. Unknown tags are rejected.
The initial loader must run before attachment; replacing a whole running page
through this API is not supported. Resolvers, Python callable transport and
cross-language component bodies are outside this first subset.

This branch uses sibling `../genro-bag-js` with its matching alignment changes.
The JS handler's existing named data segments are preserved: `form.name` within
a page named `main` still maps to `main.form.name` in Application.data. Loading
source does not load data automatically. Flat datastore alignment remains a
separate change; browser reactivity must remain enabled.

Prefer `node_id` for source identity. The existing renderer lets an explicit
HTML `id` override generated DOM IDs; structural patch targeting for such
containers is an existing limitation, not fixed by source loading.

Fixture `tests/fixtures/python-source.tytx` was generated from genro-builders
`e4efb18`, genro-bag `1b13b1e`, genro-tytx `80529f7`:

```python
builder = HtmlBuilder('main')
pane = builder.source.div(node_id='hello', hidden=False)
pane.h1('Hello world')
pane.input(value='^form.name', updateOn='input')
pane.span('^form.name')
payload = builder.source.to_tytx()
```

Validation: `node --test tests/*.test.js` uses jsdom. This is DOM integration
coverage, not a browser observation or an ASGI server experiment.

### Deferred mounting

`new Application(host)` creates the rooted data Bag and generic services before
there is a recipe. Prepare a builder (including `loadSource` for imported sources),
then call `application.mountBuilder(builder)` once. The existing
`new Application(host, builder)` form still mounts immediately. A second mount or
a mount after disposal is rejected. A failed mount disposes the partial runtime
and rethrows its error. Transport and page identity are owned by the calling
integration, not this library.

### Widget labels and boxes

The current widget collections accept `lbl`, `lbl_position`, `lbl_*` and `box_*`.
Decoration lives inside the widget's shadow root: the source node, HTML host,
slotted children, bindings and event targets retain their identity. Ordinary HTML
nodes such as `div` do not acquire this behavior.

```javascript
root.textBox({value: 'Hello World', readonly: true,
    lbl: 'MyText', lbl_position: 'TL', lbl_color: 'gray',
    box_border: '1px solid silver', box_padding: '8px'});
```

`L` (default) and `R` place the label beside the content, vertically centered.
`TL`, `TC`, `TR` place it above, aligned left/center/right; `BL`, `BC`, `BR` below.
`lbl_position` wins over the existing `lbl_side`, `side` and inherited
`data-label-side` fallback. Unsupported positions throw before mounting output.

`lbl_*` targets the label and `box_*` its containing box, using the regular HTML
attribute/CSS rules. Supply CSS units explicitly. Position is a layout directive,
not a label attribute; it controls direction and alignment. Empty labels hide only
the caption; box-only styling is supported. Decoration can be added, updated or
removed reactively without discarding a focused field's draft or selection.

Inputs and colorpicker use a native associated label. Containers use a labelled
accessible group, preserving their own caption, tab titles and dialog title.
Checkbox `label` remains its separate option caption. CopyButton retains its own
action name. Supported DOM collections are inputs (all nine widgets), colorpicker,
layout (all eight widgets), palette, clipboard and storeTree. See the standalone
[executable example](examples/widget-labels.html) for all positions and groups.
The Pages-owned CodeMirror integration uses the same helper for a labelled group.

### Sliders and recipe defaults

Both `horizontalSlider` and `verticalSlider` accept legacy `minimum`/`maximum`
(default 0/100), `discreteValues` and `intermediateChanges`. For example:

```javascript
root.verticalSlider({value:'^.size', default_value:20,
    minimum:10, maximum:48, discreteValues:39,
    intermediateChanges:true, lbl:'Size', height:'160px'});
```

`discreteValues` counts evenly spaced positions including both endpoints:
`step = (maximum - minimum) / (discreteValues - 1)`. The default is continuous
(native `step='any'`). Native `min`/`max` aliases and positive `step` are accepted;
legacy bound names take precedence. If both step and discreteValues are supplied,
they must describe the same spacing. Invalid bounds or spacing throw before mount.
Values written by slider interaction are numbers. The vertical control has its
maximum at the top. Native keyboard and pointer interaction is retained.

`intermediateChanges=true` writes on native input events; false (default) writes
on native change (release/committed keyboard action, not a text-field focus-out).
Explicit `updateOn` takes precedence: `input` is continuous; other existing modes
use change. Disabled and readonly sliders do not write user events into Data.
Native controls clamp the displayed value to their bounds; initial existing Data
is not silently rewritten. This does not port Dojo animation, wheel handling,
increment/decrement buttons, rule marks or its pixel-dependent continuous step.

Pointer-bound attributes can initialize Data via `default_value` (or `default`)
and `default_<attribute>`, such as `color:'^.color', default_color:'red'`.
Defaults are processed once per source node at creation/insertion through Bag APIs,
including Python-imported recipes. They are not reapplied on rerender, later data
removal or default-attribute edits. Explicit `default` wins even when zero/false.
Only missing nodes/attributes are initialized: existing null, empty string, zero
and false are preserved. This deliberately differs from legacy's null-or-blank
replacement. String defaults with dtype use the existing TYTX decoder. No server
or Python-side GUI execution is needed. See [sliders example](examples/sliders.html).


### Null input values

All input widgets share an explicit null state (text, password, number, date,
time, comboBox, filteringSelect, checkbox, horizontal/vertical slider and color).
The native control carries `gnr-null-value` and a decorative ∅ background; the
symbol never enters the value or the Bag. Null also has an accessible description.

In an editable text-like control, a fresh Backspace on an already empty field
sets null. A held key, IME composition and invalid numeric input do not trigger
this gesture. Empty text remains `""`; literal `"null"` remains text. With normal
commit-on-blur binding, the null gesture is committed on blur; `updateOn:input`
commits it immediately. There is no null action button. Backspace can clear checkbox/range/color directly.
Disabled and readonly controls cannot commit null. Typing or selecting a value
leaves null; checkbox false, numeric zero and valid choice codes remain distinct.
numberTextBox now returns a number for nonempty valid input, empty string for an
empty field and null for explicit null. Dates/times retain their existing native
string representation; this does not add general TYTX dtype decoding.

Standalone review: `examples/input-null.html`. Ordinary HTML input elements do
not receive these widget decorations. The Inspector's adoption of typed widget
editors and focus-out commits is a separate consumer change.

### Collaborator preview

Clone branch `codex/python-js-alignment`, then run `npm ci` and `npm test`.
Use a recent Node.js version (Node 24 LTS is suitable for the jsdom test dependency).
Bag JS and TYTX are pinned to published Git commits in package-lock.json; sibling
source checkouts are not required for these tests. This is an experimental branch,
not a published npm release. The complete Python-hosted demo is documented in
[genro-pages](https://github.com/genropy/genro-pages/tree/codex/hello-world).

The form collection and `forms/` runtime provide local form ownership, field
validation and lifecycle support. Persistence remains supplied by the consumer.
`dataFormula` uses the `formula` attribute; the former `func` spelling is rejected.
`dataController` continues to use `func`. See `tests/forms.test.js`,
`tests/formlet.test.js` and `tests/reactive-logic.test.js` for executable contracts.
