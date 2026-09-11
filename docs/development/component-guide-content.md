# From a Native Web Component to a Gramlot Component

## 01 — What We Are Building

This guide builds one small component twice. First, it is an ordinary browser
Web Component named `<gnr-guidegreeting>`. Then the same element becomes the
implementation behind a Gramlot recipe named `greeting`. The final recipe can
receive a reactive value such as `^person.name`, so a Data change updates the
rendered greeting.

The example is deliberately modest. It displays a button, accepts a `name`, and
emits a `greet` event when activated. That is enough to study the boundaries
between browser code, Gramlot's JavaScript runtime, and Python authoring without
hiding them behind a large input widget. It is a display/action component, not
a form field. Chapter 8 explains what a real value-editing widget must add.

### Prerequisites

You should be comfortable reading basic HTML and JavaScript: tags, attributes,
classes, imports, functions, and event listeners. Python appears only in the
authoring declaration, and the example requires no advanced Python knowledge.
Run commands from the Gramlot repository root. Use a recent browser with Custom
Elements and Shadow DOM support, plus the repository's Python environment and a
Node version suitable for the existing test suite.

The complete files live in
[`docs/examples/components/component-guide`](../examples/components/component-guide/).
Start a local server for the native example:

```console
.venv/bin/python -m http.server --directory docs/examples/components/component-guide
```

Open `http://localhost:8000/native.html`. You should see a button reading
“Hello, Ada!”. Clicking it writes an event message to the browser console.
Serving the directory matters because browser module imports are normally
loaded over HTTP rather than by opening the HTML file directly.

Later, run the end-to-end check with:

```console
node docs/examples/components/component-guide/integration.test.mjs
```

Keep the browser developer tools open while learning. The Elements panel shows
the custom-element host and its shadow root; the Console shows module, lifecycle,
and event errors. These two views usually reveal a broken first component faster
than adding logging everywhere.

## 02 — The Native Custom Element

A custom element is a browser-defined extension point. You create a JavaScript
class derived from `HTMLElement`, register it under a valid custom-element name,
and then use that name as an HTML tag. Autonomous custom-element names contain
a hyphen. The hyphen keeps future built-in HTML names separate from application
components.

Here is the smallest useful shape of our component:

```js
export class GuideGreeting extends HTMLElement {
    static observedAttributes = ['name'];

    constructor() {
        super();
        this.attachShadow({mode: 'open'}).innerHTML = `
            <button type="button"></button>
        `;
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const name = this.getAttribute('name') || 'world';
        this.shadowRoot.querySelector('button').textContent = `Hello, ${name}!`;
    }
}

customElements.define('gnr-guidegreeting', GuideGreeting);
```

The class defines behavior; registration connects the class to the HTML name.
After registration, the browser upgrades matching elements, including elements
that were parsed before the module finished loading.

```html
<gnr-guidegreeting name="Ada"></gnr-guidegreeting>
```

Our checked-in module exports `defineGreeting()` instead of registering at the
top level. That function checks `customElements.get()` before calling
`customElements.define()`. The guard makes activation idempotent: the native
page can activate the element directly, while a Gramlot collection can activate
the same implementation later without attempting a duplicate definition.

The browser owns the custom-element registry. Gramlot does not replace it. A
Gramlot component still needs a valid and registered browser custom element;
Gramlot adds recipe grammar, collection activation, Data resolution, rendering,
and integration conventions around that native foundation.

For the platform rules, use the primary browser references: [Using custom
elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
and [`CustomElementRegistry.define()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define).

## 03 — Lifecycle Without Surprises

Custom elements have lifecycle callbacks. They are notifications from the
browser, not one-time initialization hooks. An element can connect, disconnect,
and connect again. A reactive renderer may also replace one host with another.
Code should therefore tolerate repeated lifecycle transitions.

The complete example installs a click listener when connected and removes the
same listener when disconnected:

```js
constructor() {
    super();
    this.attachShadow({mode: 'open'}).innerHTML = '<button type="button"></button>';
    this._onClick = () => this.dispatchEvent(new CustomEvent('greet', {
        bubbles: true,
        composed: true,
        detail: {name: this.name},
    }));
}

connectedCallback() {
    this.shadowRoot.querySelector('button').addEventListener('click', this._onClick);
    this.render();
}

disconnectedCallback() {
    this.shadowRoot.querySelector('button').removeEventListener('click', this._onClick);
}
```

Storing `_onClick` is important. `removeEventListener()` needs the same function
object that was passed to `addEventListener()`. Creating a new arrow function in
each callback would leave the old listener attached.

Use `connectedCallback()` for work that needs the element to be in a document:
attaching listeners, observing external objects, subscribing to application
services, or starting resources. Undo owned work in `disconnectedCallback()`.
An element that subscribes to a global event, timer, observer, or Gramlot service
and never unsubscribes can retain detached UI and react more than once after a
remount.

`attributeChangedCallback()` is called for names listed in
`observedAttributes`. It can run before or after connection, so `render()` must
only depend on structure created by the constructor. Avoid reading children
supplied in light DOM too early; parsing order can matter.

The example's cleanup may seem unnecessary for one internal button, because the
button and host are collected together. It demonstrates the correct ownership
shape for later external subscriptions. When the component grows, the lifecycle
contract is already visible instead of becoming an emergency repair.

### Alpha base classes and capability mixins

Import `getComponentBases` from `gramlot-dom`, then call it inside
`defineComponents()` after a DOM exists. It returns cached classes for the current
HTMLElement realm, so importing a collection on the server does not require DOM
globals. `GramlotElement` supplies connection hooks and owned disposers only.
`ControlElement` adds the existing one-native-control shape. The current inputs
and color picker share this base; other components retain adapters around their
existing DOM implementation where a control base would be inappropriate.

Implement `onConnect()` and `onDisconnect()` for connection resources. Acquire a
resource during `onConnect` and call `ownConnection(() => releaseResource())`.
Disposers run in reverse order on disconnect. Reconnect calls `onConnect` again;
create shadow children and their owned listeners once in the constructor.
If overriding native lifecycle callbacks, always chain `super`.

`Decorated(Base)` installs the single existing WidgetLabel collaborator through
`installDecoration(control, content, options)` and exposes `decoration`. It requires
a lifecycle base and chains its callbacks. `FieldState(Base)` provides
`setFieldState({invalid, pending, issues})`; its shared presenter owns ARIA and
messages, not validation rules. ControlElement already applies both mixins, so do
not apply them again. InputNullState remains a composed state machine. FormField
and Validator remain the sole draft, validation, async and Data-write owners.

### Tools inside a field

A compatible control can attach tools inside its visual border. The alpha API is
explicit JavaScript composition: `ControlElement.installTools({onLeave, onCancel})`
returns a shared `ControlTools` collaborator. Call it once after the input exists.
Use `tools.add({label, icon, content, onOpen, focus})` for a popup tool, or provide
`action` for a button without a popup. `icon` and `content` are DOM nodes created
by the component, not HTML strings. Multiple tools share the field shell.

A component outside `ControlElement` can import `ControlTools` directly. It needs
an open shadow root and a control from its owner document. Mount `tools.element`
as the control content and call `connect()`, `disconnect()` and `sync()` from the
host's lifecycle and disabled/readonly updates. `ControlElement` supplies that
wiring. Do not install a second helper around the same control.

The returned handle exposes `button`, `popup`, `open()`, `close()`, `remove()` and
`setLabel()`. Tool presentation and popup lifecycle are separate from label
placement, parsing and validation. The helper owns the combined focus region:
input, tool buttons and tool popups. `onLeave` lets the editor confirm when the
user leaves that region, including an outside click; `onCancel` lets the editor
restore its committed value on Escape. Neither callback implies a Data write by
the helper. The editor still uses its existing validation and commit path.

The date calendar is the first consumer. Choosing a day changes a provisional
draft and keeps the popup open. Leaving the field and calendar confirms; Escape
cancels. A keypad or color picker can supply different content without copying
field-border layout or popup dismissal logic. Those consumers and a Python tool
authoring grammar are not part of this alpha.

### Labeled groups

`groupBox` is a layout container using the shared `lbl` decoration, with a
centered top header. Its `lbl_variant` is `bar` by default (white title on dark
background), or `underline` for a lighter title separated by a line. Existing
`lbl_*` and `box_*` options remain the customization vocabulary.

```python
group = root.groupBox(lbl='Selection', datapath='selection',
                      copy=True, draggable=True)
group.div('^.day', format='long')
```

The optional copy button exports current values from the group's explicit
`datapath` as JSON. It does not scrape the children or copy the page's entire
Data root when the scope is absent. JSON is a values snapshot, not a lossless
Bag transport: node attributes and TYTX type annotations are not included. Date
carriers become ISO strings. Duplicate Bag labels, cycles, nonfinite numbers and
unsupported typed objects fail explicitly rather than producing a lossy copy.

The optional header drag handle prepares a transferable group payload; it does
not mutate Data or reorder Source. A receiving collection must implement its own
drop policy. Free positioning, floating windows and automatic collection
reordering are not implemented by this component.

## 04 — Attributes, Properties, and Rendering

HTML attributes are strings or presence markers. JavaScript properties can hold
booleans, numbers, objects, `null`, and other values. Treating them as identical
works only for simple cases.

The greeting accepts a string, so an attribute is a good public channel. It also
offers a property that reflects to the attribute:

```js
get name() {
    return this.getAttribute('name') || 'world';
}

set name(value) {
    if (value === null || value === undefined) this.removeAttribute('name');
    else this.setAttribute('name', String(value));
}
```

These calls now have the same visible result:

```js
element.setAttribute('name', 'Ada');
element.name = 'Ada';
```

The setter normalizes values at the component boundary. Removing the attribute
selects the documented fallback, “world”. The browser then invokes
`attributeChangedCallback()`, which calls `render()`. A larger component should
avoid unnecessary full shadow-tree replacement: update the smallest stable DOM
part so focus, selection, and child state survive presentation changes.

Gramlot's current HTML renderer applies ordinary resolved recipe values as
attributes: `true` becomes a present empty attribute; `false`, `null`, and
`undefined` are omitted; other values are converted to strings. Some established
widgets have explicit property bridges for values that attributes cannot carry
faithfully. A new component must define such behavior deliberately rather than
assuming every Python or Data value remains typed after HTML serialization.

Choose attributes for serializable configuration and CSS-facing state. Choose
properties for rich or imperative state, and document whether a property
reflects. If a component accepts an object or service, it normally needs an
explicit property assignment path in its integration layer. Our example stays
inside the supported ordinary-attribute route.

When debugging, inspect both `element.getAttribute('name')` and `element.name`.
If the attribute changes but the UI does not, check `observedAttributes` spelling
and `attributeChangedCallback()`. If the property changes but the attribute does
not, check the reflection setter.

## 05 — Shadow DOM, Styling, and Accessibility

Shadow DOM gives the component an internal DOM tree. With `mode: 'open'`, code
can inspect it through `element.shadowRoot`, which is useful for development and
tests. Shadow DOM provides a style boundary, but it does not make design,
accessibility, or all CSS interactions automatic.

The complete component includes a small local style and a public CSS custom
property:

```js
this.attachShadow({mode: 'open'}).innerHTML = `
    <style>
        button { color: var(--guide-greeting-color, #243b53); }
    </style>
    <button type="button"></button>
`;
```

The page can theme the host without depending on the component's private
structure:

```css
gnr-guidegreeting {
    --guide-greeting-color: #8a3f68;
}
```

CSS custom properties cross the shadow boundary through inheritance. Keep a
small, intentional theme surface and give every property a useful fallback.
Do not make consumers select private shadow nodes; that couples applications to
implementation details and makes refactoring hazardous.

The example uses a native `<button type="button">`. That choice supplies
keyboard activation, focus behavior, and button semantics without recreating
them. A clickable `<div>` would require substantial keyboard and accessibility
work. `type="button"` also prevents accidental form submission if the host is
placed inside a form.

Visible text gives the button an accessible name. If a component later adds an
icon-only control, it must provide an appropriate name. Focus indication should
remain visible. Color must not be the only carrier of state. Test keyboard use,
zoom, contrast, and screen-reader output in addition to inspecting markup.

Shadow DOM can affect event paths, labels, focus, and automated queries. Decide
whether it is useful for each component rather than adopting it by reflex. Here
it demonstrates a clean presentation boundary. Gramlot's shared decoration and
form services have additional contracts; this standalone greeting does not
claim that placing a label attribute on it turns it into a field.

See [Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
and [`attachShadow()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
for browser behavior and compatibility.

## 06 — Events Are the Component's Output

Attributes and properties carry data into an element. Events report meaningful
activity out of it. Prefer a component event that states what happened over
exposing internal DOM nodes to application code.

The greeting dispatches a `greet` event from the host when the internal button
is activated:

```js
this.dispatchEvent(new CustomEvent('greet', {
    bubbles: true,
    composed: true,
    detail: {name: this.name},
}));
```

The native page listens on the custom element:

```js
const greeting = document.querySelector('gnr-guidegreeting');
greeting.addEventListener('greet', event => {
    console.log('Greeting requested for', event.detail.name);
});
```

`bubbles: true` lets an ancestor handle the event through normal delegation.
`composed: true` allows the event to cross a shadow boundary. In this example
the event is dispatched on the host, but declaring the intended public behavior
keeps the contract clear if internal dispatch changes later. `detail` contains
the event payload and should be small, stable, and documented.

Do not forward every internal browser event. The public event should represent
a component-level action. Consumers should not need to know whether the shadow
tree uses a button today and another accessible control tomorrow.

For an editable component, Gramlot needs more than an arbitrary event. Existing
value-aware widgets expose a stable host value and emit the supported bubbling,
composed `input` or `change` signal at the correct commit moment. The runtime
uses that contract for write-back. A custom `greet` event has no automatic Data
write-back meaning.

The current event/connect architecture has broader open questions, including
declared component events, scoped topics, and compatibility with historical
method connections. Do not advertise an unimplemented declarative event API.
Native `addEventListener()` works now and is sufficient for this component
proof. Application-specific integration can listen after mount while the shared
framework contract is settled.

## 07 — Registering a Gramlot Collection

The native element exists, but a Gramlot builder does not yet know that a recipe
called `greeting` should render it. A collection supplies that association and
activates the implementation.

The checked-in adapter is complete:

```js
import {registerComponentCollection} from 'gramlot-dom';
import {defineGreeting} from './greeting-element.js';

registerComponentCollection('component-guide', {
    components: [{name: 'greeting', tag: 'gnr-guidegreeting', capabilities: ['action']}],
    defineComponents: defineGreeting,
});
```

The alpha `registerComponentCollection` contract is used by framework and external
components alike. Each description supplies its recipe `name`, native custom-element
`tag`, optional `subTags` (empty for leaves, `*` for containers), and descriptive
`capabilities`. Optional `meta` carries renderer flags such as `dataWidget`.
Capabilities describe the implementation; they do not install mixins automatically.
The registry derives the browser grammar and verifies that activation actually
registered every described custom element. Each constructor exposes its immutable
`gramlotComponent` description. `getComponentDescriptions(collection)` returns the
registered descriptions for tooling.

Import the module explicitly, then select its collection:

```js
class GreetingPage extends HtmlBuilder {
    static wc_requires = ['component-guide'];
}
```

The runtime merges the selected grammar, activates custom elements and injects
optional collection `css`. Descriptions cannot execute code: the trusted imported
module provides `defineComponents`. It must be idempotent and should defer DOM
class creation until activation. Duplicate names within a description collection
and duplicate description collection registration fail explicitly. Existing
cross-collection grammar precedence is preserved for compatibility; choose unique
recipe names for extensions.

There is no filesystem scan or arbitrary module download. A host still controls
imports and selection. Once imported and selected, an extension needs no changes
to the central JavaScript builder. `registerCollection` and `webcomponent` remain
compatible lower-level APIs for existing integrations and grammar-only aliases.
The checked-in greeting uses repository-relative imports; an installed package
uses the public `gramlot-dom` exports shown above.

## 08 — Reactive Data and the Value Contract

Now the recipe can accept an ordinary literal:

```js
main(root) {
    root.greeting({name: 'Ada'});
}
```

Gramlot also recognizes existing path syntax. `^person.name` is a reactive
read: the runtime resolves the path for rendering and tracks it so later Data
changes update affected output. `=person.name` is a passive read and does not
request that reactive dependency.

```js
class GreetingPage extends HtmlBuilder {
    static wc_requires = ['component-guide'];

    setup() {
        this.setData('person.name', 'Ada');
    }

    main(root) {
        root.greeting({name: '^person.name'});
    }
}
```

The integration test later changes the application Data inside `app.live()`:

```js
app.live(() => app.data.setItem('example.person.name', 'Grace'));
```

The renderer updates the host produced by the recipe. Code observing the page
should query the current DOM after a reactive update rather than assume the same
element object is retained for every kind of patch. Our custom element receives
the newly resolved `name` attribute and renders “Hello, Grace!”.

This is one-way presentation. Setting `greeting.name` does not write back to
Gramlot Data, and the `greet` event does not carry editing semantics. A true
Gramlot input needs an agreed host property such as `value` or `checked`, a
commit policy, bubbling and composed `input`/`change` events, pointer metadata,
null behavior, type handling, focus preservation, validation integration, and
form ownership. Existing inputs implement those responsibilities through shared
runtime services.

Do not copy a textbox contract casually. Decide whether the new component is a
display, command, container, or editor. Add only the integration its role
requires. For a display component like this one, a reactive input attribute and
a semantic action event form a complete and honest boundary.

### Build a field using the shared base

The executable `note-collection.js` example contains only the textarea-specific
variation and its description:

```js
const {ControlElement} = getComponentBases();
class NoteField extends ControlElement {
    get inputType() { return null; }
    _createControl() { return this.ownerDocument.createElement('textarea'); }
    _configure(control) { control.rows = 3; }
}
```

ControlElement supplies shadow structure, label decoration, disabled/readonly,
null-versus-empty state, value access, composed change bridging and focused-draft
protection. `_buildContent(content)` can extend the content region; call super to
retain the native control. Override the paired value getter/setter only for a
real type-specific conversion. `fieldControl` and `isNullValue` are public seams
used by FormField; `setFieldState` supplies presentation. The old private fields
remain compatibility implementation details, not an extension contract.

The date symbolic interpreter remains a separate composed helper. Removing the
visible expression button did not remove automatic text-buffer switching. A future
datetime field uses native datetime-local and local values; UTC conversion belongs
to its consuming server. The current numeric control still uses valueAsNumber;
Decimal-preserving editing and formatting policy remain explicit alpha work.

Run `integration.test.mjs` to exercise the note field with a bound value and
validation. New components should use this path instead of copying control,
label, null or validation infrastructure.

## 09 — Declaring the Recipe in Python

Python authors need the same recipe name and render identity. Gramlot's Python
builder composes declaration mixins using the public Builders `@element`
mechanism. The complete declaration is short:

```python
from typing import Any

from genro_builders.builder import element


class GreetingDeclarations:
    @element(
        sub_tags="",
        _meta={
            "webcomponent": True,
            "render_tag": "gnr-guidegreeting",
        },
    )
    def greeting(self, name: str | None = None, **kwargs: Any):
        """Display a greeting for ``name``."""
        ...
```

`sub_tags=""` says this recipe does not accept recipe children. `_meta`
identifies a Web Component and fixes the browser render tag. The typed `name`
parameter documents and validates the explicit authoring surface. `**kwargs`
keeps the declaration open to the attribute families the application genuinely
intends to support; it should not excuse an undocumented contract.

Compose the mixin before `GramlotBuilder` so Builders sees the declaration:

```python
from gramlot.builder import GramlotBuilder


class ApplicationBuilder(GreetingDeclarations, GramlotBuilder):
    def main(self, root):
        root.greeting(name="^person.name")
```

The Python recipe becomes Source data for the browser. The browser side still
needs the `component-guide` adapter module imported and the collection required.
The declaration does not load JavaScript by itself, and the collection does not
create the Python method. Both sides describe the same recipe boundary.

In a production component, keep these identities aligned in review and tests:
the recipe method `greeting`, collection grammar entry `greeting`, custom tag
`gnr-guidegreeting`, and collection name `component-guide`. A mismatch typically
appears as an unsupported recipe, an ordinary unknown HTML element with no
behavior, or an unknown collection error.

## 10 — Component Descriptions and Generation

The implemented alpha catalogue is
`js/dom/src/components/builtin-components.json`, schema `gramlot-components/0.1`.
It is the identity and child-structure source for current input, layout, decoration,
form, clipboard, palette, tree and optional CodeMirror components. Its generated
JavaScript module supplies descriptions to their ordinary registration adapters.
The inspector uses that same registry with an application-tool description; its
host owns initialization, so it does not add a Python recipe declaration.

Each selected JSON collection has a `name` and `components`. Each component has
`name`, `tag`, `subTags`, `capabilities`, and a `pythonGroup` identifying its generated
plain declaration mixin. These are deliberately small, open declarations:
`**kwargs` preserves current pointer, validation, decoration and host extensions.
The alpha does not claim a complete typed parameter catalogue.

```console
.venv/bin/python scripts/generate_components.py
```

This regenerates `js/dom/src/components/builtin-components.js` and the existing
Python grammar family modules under `src/gramlot/grammar/`. GramlotBuilder composes
those same generated declaration classes, so current recipe names do not change.
Review generated output alongside the descriptor. Do not hand-edit generated files.
External component packages can select their own trusted catalogue explicitly:

```console
.venv/bin/python scripts/generate_components.py --source package/components.json --javascript package/components.js --python-directory package/generated
```

The generator reads JSON only and does not execute imported implementations or
search installed packages. Compose the resulting declaration mixin before
GramlotBuilder as in chapter 9. Import the generated browser descriptions in the
package's collection adapter. The output helper is currently named
`builtinComponents` even for an external catalogue; this is an alpha naming limit.

The earlier worked textBox proof remains under
`docs/examples/components/textbox/`. It demonstrates richer explicit parameters
and public `BuilderBase.to_grammar()`. Builders' 1.0 export leaves `attributes`
null, so its parameter envelope remains separate. That evidence is preserved;
the alpha catalogue does not silently claim to solve the exporter gap. Full
parameter schemas, packaging discovery and precise numeric formatting conventions
can evolve without delaying reuse of the current components.

## 11 — Running, Testing, and Debugging

Begin with the native page. From the repository root:

```console
.venv/bin/python -m http.server --directory docs/examples/components/component-guide
```

Open `http://localhost:8000/native.html`. Confirm the text, click the button,
and inspect the `greet` event message. In developer tools, expand
`<gnr-guidegreeting>` and its open shadow root. Change the `name` attribute in
the Elements panel; the button text should update immediately.

Then run the automated integration proof:

```console
node docs/examples/components/component-guide/integration.test.mjs
```

It verifies four boundaries: direct custom-element definition and attribute
rendering; the public composed event; collection activation and grammar mapping;
and a reactive `^person.name` update through a mounted `Application`.

Check the Python declaration independently:

```console
.venv/bin/python -m py_compile \
  docs/examples/components/component-guide/greeting_declaration.py
```

For the existing manifest-generation proof, run:

```console
.venv/bin/python docs/examples/components/textbox/generate.py --check
.venv/bin/python -m pytest -q tests/test_component_guide.py
```

### Common failures

- “already been registered” means definition ran twice without the
  `customElements.get()` guard.
- An element with no shadow content usually means its module was not imported,
  registration failed, or the tag names differ.
- `unknown wc collection` means the adapter did not execute before `wc_requires`
  was resolved, or the collection name is misspelled.
- An unsupported `greeting` recipe means the collection was not required or the
  Python declaration was not composed into the authoring builder.
- A literal name that works while `^person.name` does not suggests an incorrect
  Data path or an update made outside the application's live mutation flow.
- An event visible only inside shadow DOM needs its `bubbles` and `composed`
  contract checked.

Test behavior rather than private markup where possible. This guide inspects the
shadow button because it owns the example, but application tests should prefer
the host's public properties, attributes, events, and visible accessible result.

### A disciplined debugging order

Follow the chain in the same order the runtime uses it. First confirm the module
loads without a syntax or import error. Next check
`customElements.get('gnr-guidegreeting')`; if it returns nothing, stop at native
registration. Then inspect `getCollection('component-guide')`; if it is missing,
the adapter did not execute. After mounting, inspect the builder's instance
schema and confirm `greeting._meta.render_tag` is `gnr-guidegreeting`. Only then
investigate Data paths and reactive updates. This order prevents a missing
module from being misdiagnosed as a binding problem.

When lifecycle behavior is suspect, add temporary counters around connection,
disconnection, listener installation, and cleanup. Mount, remove, and remount
the host. One user action should still produce one public event. Remove those
counters after the issue is understood; the durable test should assert visible
behavior and cleanup rather than depend on diagnostic logging.

Run the smallest relevant check while editing, then run the focused existing
component suite. A native unit test can prove the browser contract, while the
mounted application test proves collection and Data integration. Neither alone
proves the full path. Keep both failures readable: a future maintainer should be
able to tell whether a regression belongs to the element, its adapter, the
builder grammar, or reactivity.

## 12 — A Practical Component Checklist

The greeting proves the path, not every component category. Use the following
sequence when starting a real component.

### Define the browser contract

- Choose a valid, stable custom-element tag and semantic role.
- State which inputs are attributes and which are properties, including null,
  boolean, number, and object behavior.
- List public events, their payloads, and whether they bubble and cross shadow.
- Specify connection work and matching disconnection cleanup.
- Choose light or shadow DOM deliberately; expose a small CSS custom-property
  theme surface when consumers need styling control.
- Prefer native semantic controls and verify keyboard, focus, zoom, contrast,
  and screen-reader behavior.

### Connect the current Gramlot runtime

- Give the recipe a grammar entry with the exact `render_tag`.
- Register an idempotent collection and import its adapter before requiring it.
- Require the collection through `wc_requires` or `wcRequires()`.
- Compose the matching Python `@element` declaration when Python authors need
  the recipe.
- Test literals and the supported `^`/`=` path behavior that the component
  actually promises.
- If it edits Data, implement and test the established value/event contract,
  validation, focus, null, form, and cleanup responsibilities instead of
  inferring them from a display example.

### Maintain the alpha description contract

Use the alpha catalogue for identity and children, and document richer parameter,
resource and accessibility contracts next to the implementation. Keep generated
files inspectable and reproducible. The current schema is alpha, not frozen.
Do not claim automatic package discovery or typed parameter export that the
implementation does not provide.

Browser implementations own DOM and events; collections connect descriptions to
activation; generated Python mixins expose the same recipe names. The shared
control base and services keep each field focused on its actual differences.
Use the executable examples and conformance tests when adjusting this alpha.
