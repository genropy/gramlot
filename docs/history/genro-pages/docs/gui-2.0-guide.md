# GUI 2.0 — Authoring guide and best practices

Version: 0.1  
Last updated: 2026-09-06  
Status: Living record of agreed authoring directions; not a declaration of complete API support.

This guide records the owner's directions for GUI 2.0. It will grow into an
introduction to building pages and reviewing components. Keep it separate from
implementation logs. Check it before authoring or changing GUI examples, and
update it when the owner agrees a new convention. Do not promote a proposal or
an unverified compatibility claim to an implemented feature.

Runtime architecture: [retained legacy contract](architecture/runtime-legacy-contract.md)
and [incremental reorganization plan](architecture/runtime-reorganization-plan.md).
The public mental model is one genro per page with source-node recipe scope;
small ES modules implement its services. Mobile interaction is a first-class
review requirement, not a later responsive styling pass.

## 1. Build the application through recipes

Author application pages in Python. Their recipes construct a SourceBag, which
is transported through TYTX and mounted by the browser runtime. JavaScript
builders remain available for client-side construction and experiments.

The laboratory must exercise this same path. Its controls, editor hosts,
containers and inspectors belong in its recipe; they must not be assembled
with ad hoc `document.createElement()` calls outside the builder.

Direct DOM work belongs inside component implementations and integrations such
as CodeMirror. Represent the integration as a recipe component with explicit
values, events and lifecycle handling. Keep the laboratory interface and the
experiment's SourceBag/data distinct, and label inspector views accordingly.

## 2. Let main describe the page

Use ordinary Python methods to divide a page into meaningful parts. `main()`
should read as the page's composition, rather than contain every widget detail.
Use descriptive names and short English docstrings explaining each part's
purpose. Split by responsibility, not by an arbitrary line count.

Illustrative organization, not a required set of framework hooks:

```python
def main(self, root):
    """Assemble the JavaScript laboratory."""
    self.initialize_data(root)
    self.build_header(root)
    self.build_command_bar(root)
    self.build_editor_and_preview(root)
    self.build_bag_inspectors(root)

def build_header(self, pane):
    """Introduce the laboratory and its execution modes."""
    pane.h1("JavaScript laboratory")
    pane.p("Rebuild starts a fresh experiment; Apply changes the current one.")
```

These are regular methods, not a reason to add another lifecycle or mixin
mechanism. A helper that builds content should receive its target pane explicitly.

## 3. Preserve familiar data authoring

The intended recipe spelling is `pane.data(...)`, as in legacy Genropy, rather
than requiring page authors to use `dataSetter(...)`. The existing implementation
may remain behind an alias if its semantics match. Verify the interaction with
the builder's own data-store API before implementing the spelling.

Prefer a compact Bag initialized from a dictionary for a coherent group of
initial values. Keep the result as a branch of the page's data tree. Use a
container's `datapath` and relative bindings to make that ownership explicit.

GUI syntax — `data()` is now available in WidgetTestBuilder and GalleryBuilder.
`Bag(dict(...))` construction has a focused check; nested dictionary and full
branch notification compatibility remain to verify:

```python
root.data("lab", Bag(dict(
    code="",
    auto=False,
    status="Ready",
    dataXml="",
    sourceXml=""
)))
pane = root.div(datapath="lab")
pane.codeMirror(value="^.code", language="javascript")
```

Verify both `data()` and `Bag(dict(...))`, including nested dictionaries, against
the actual packages. Also verify that initializing a branch and binding to its
children preserves the single data tree and expected notifications.

## 4. Treat legacy compatibility as observable behavior

Preserve recipe names and parameter semantics where practical. Inspect legacy
code and its test/test15 examples before claiming compatibility.

For example, widget `color` and label `lbl_color` have distinct targets;
`lbl_font_size`, `lbl_font_weight` and label placement should not silently style
the input itself. Separate local parameter support from inherited container
defaults: implementing the former does not establish the latter.

For the laboratory, automatic reconstruction is an explicit option triggered
when focus leaves the code editor. Clearly distinguish rebuilding a recipe from
applying commands to existing Bags. Do not make a full recipe silently append
duplicates under a button that implies replacement.

## 5. Make examples explain themselves

All pages and examples use English, including visible instructions, labels,
sample data, status messages, accessibility labels and displayed Python recipes.
For manual checks, put the steps and expected results in the page itself;
the reader must not need the development conversation to understand the test.

Keep one review page per widget/container, with named `test_*` cases, brief
docstrings, and independent data paths. Show Live and the actual Python source
in separate tabs. If a case only calls another method, its source is technically
accurate but may not explain the example: prefer a self-contained teaching case
or make the dependency visible.

An isolation example should make the independence of its fields easy to observe.
Use clear English labels such as “Independent example”, not an unexplained test
identifier as the only explanation.

## 6. Present source as literal text

Use an established highlighter for read-only source, or CodeMirror when editing
is needed. CDN delivery is accepted for the current laboratory; pin dependency
versions and verify the actual browser load.

Never feed isolated source tokens such as `=` or `^` back through recipe binding
interpretation. Code must remain literal text. Test exact displayed content,
including operators and markup-like strings, not merely the presence of colors.

XML inspectors are diagnostic views of the real Bags, not the transport format
or a substitute for the source tree. Preserve readable structured metadata;
`[object Object]` is not a useful representation. Read-only viewers must remain
selectable and reflect changes without modifying the inspected Bags.

## 7. Use the laboratory to expose missing framework features

Accessibility, keyboard/focus behavior, themes, reactive changes and cleanup
belong in component review. Reusable tools such as a floating palette and a
Data/Source inspector should become components, rather than a special DOM-only
implementation that bypasses the mechanisms being tested.

Report exactly what exists: XML views are not an inspector with node editing;
a fixed panel is not a floating palette; a recipe without action declarations
still has a separate controller. Do not describe announced work as completed.

## Follow-up register

- Review legacy `dojo.connect` and `genro.publish` / `genro.subscribe` semantics
  as described below; introduce the replacements when a concrete GUI feature
  needs them, rather than porting the entire machinery in advance.
- Refactor the Python playground into the small methods described above.
- Extend GUI data alias coverage to future GUI dialects; current laboratory recipes use it.
- Verify dictionary and nested-dictionary Bag initialization.
- Move related playground values into a coherent branch once those checks pass.
- Continue reviewing declarative actions, inherited label styles, palette and
  inspector support; these are not established by this document.

See [the experiment record](hello-world.md) for implementation history. Consult
the current code and tests for the exact supported API.

## First visual baseline: compact Genropy-inspired theme

Use a restrained, coherent visual baseline close to legacy Genropy: 13px body
text, compact controls, light neutral panels, thin borders, small corner radii,
and restrained blue focus/selection cues. Avoid oversized titles, buttons and
floating windows. Keep visible keyboard focus and increase button targets on
coarse-pointer devices. This is an initial theme to review, not a completed
accessibility certification or full legacy theme port.

The demo theme lives in `js/src/theme.css`. Shared CSS custom
properties reach component shadow roots; retain existing semantic variables
where available, including label, field, panel and palette properties. Explicit
recipe styles continue to override theme defaults. Component internals belong
in their collection, not in page-specific selectors reaching into shadow DOM.

Palette title bars should be thin (initial target: 24px). The title bar must not
show a focus outline or gain an extra border on focus. Use a subtle background
change for keyboard focus while retaining visible focus on action buttons.
The owner's legacy inspector and theme-editor screenshots are visual references
for compact proportions and configurable theme variables; their accent colors
are examples, not a requirement to adopt an orange/purple theme.

Advanced palette keyboard commands are opt-in with `keyboard=True` (default:
false). This enables arrow-key movement/resizing and Escape-to-close, and makes
the title/resize handles tab stops. Ordinary buttons and content retain normal
keyboard accessibility regardless of this option.

## Events, topics and shortcuts: compatibility review pending

Keep the legacy connection and publish/subscribe mechanisms in the review
scope. The owner authorizes bringing this work forward when it helps a concrete
feature, such as inspector selection/highlighting or coordination between
components. This records a direction, not implemented compatibility.

Distinguish three responsibilities:

- Connections observe a specific object's event or method call. Review both
  uses of `dojo.connect`: DOM events and connections to JavaScript methods.
  A DOM event listener alone does not reproduce the latter's semantics.
- Publish/subscribe delivers named messages between components without a direct
  reference. Review `genro.publish` / `genro.subscribe`, payload arguments,
  callback context, delivery order, synchronous behavior, scoped topics and
  declarative recipe subscriptions against legacy code and test/test15.
- The agreed shortcut direction is a registry of named commands and configurable
  key combinations, preserving practical legacy declarations. It is separate
  from optional palette movement/resizing keys. A minimal page-owned registry
  now opens the inspector; full legacy declarations remain to implement.

For each mechanism, verify ownership and automatic disposal on source-node,
component or page destruction, avoiding duplicate registrations after rebuilds.
Keep reactive Bag subscriptions responsible for state changes; messages should
not create a second data synchronization mechanism. Define page/iframe scope
explicitly: local publish/subscribe must not silently become websocket traffic.
If cross-frame delivery is needed, review it with the root-page messaging design.

Start with the smallest behavior required by the consuming feature, with an
observable laboratory example. Record unsupported legacy cases explicitly.

## Initial Data/Source inspector

The demo serves `inspector.py` through `/inspector` as a TYTX Python recipe.
Its separate Application holds only tool state. Each storeTree receives the
actual inspected page Bag as its store, without copying or reparenting it.
Ctrl+Shift+D toggles the palette; a recipe-authored button exposes the same
command. The initial registry checks exact modifiers and ignores repeat and
composition events, and is disposed when replacing the inspected page.

Selection shows path, value and attributes, updated on Bag changes. This first
version is read-only: editing, search, DOM highlighting, frame scope and the
playground experiment target selector are pending. In the playground it inspects
the enclosing page, not the separate experiment. Tree keyboard navigation also
remains part of the storeTree accessibility review.

Palette visibility now uses the normal `value="^opened"` binding. DOM container
reconciliation compares renderer-owned attributes before connection, retaining
matching children and runtime state during property updates. Structural changes
that cannot be reconciled still replace the affected subtree; this is not a full
keyed structural diff. The palette, tabs, trees, launcher and detail bindings are
all constructed by the Python recipe.

## Container review — first verified slice

Legacy references: `gnrjs/gnr_d11/js/genro_widgets.js` (StackContainer,
TabContainer, BorderContainer) and `projects/gnrcore/packages/test/webpages/layout/`
(`stack_tab.py`, `bordercontainer.py`) in the Genropy reference checkout.

| Behavior | Current GUI 2.0 status |
| --- | --- |
| Change selected tab from data or tab button | Available through `value` / child `key` |
| Keep local field state during selection/layout changes | Regression tested; matching child DOM survives |
| Palette visibility containing tabs and real tree stores | Normal binding restored; regression tested |
| Border headline/sidebar, slots and mouse splitters | Available; layout-change preservation and active-drag cleanup tested |
| Legacy `selected` index / `selectedPage` name / `pageName` | Available for tab and stack; paired bindings synchronize |
| `contentPane(region=...)` and dynamic `regions` Bag | Not ported; current recipes use child `slot` |
| StackContainer and stackButtons | Initial implementations and dedicated Python examples available |
| Showing/hiding/selected topics, switchPage next/prev | Page-local topics available; next/prev skip unavailable pages |
| Closable/hidden/disabled tabs, selection fallback after deletion | Implemented with SourceBag deletion and regression tests |
| Full structural reconciliation, iframe survival on subtree replacement | Not established by property-update tests |
| Splitter keyboard/touch behavior and tab accessibility | Still under review |

The second tabContainer and borderContainer laboratory examples now explain
state preservation rather than merely repeat the first example. Inspector node
editing and its lower-panel redesign remain deferred at the owner's request.

## Local filteringSelect and comboBox: first slice

Both names are available in the inputs collection and Python laboratory grammar.
`values` accepts comma-separated entries or newline-separated entries when a
newline is present, with `code:caption` pairs. This follows legacy BaseCombo's
local-values convention. filteringSelect displays the caption and commits the
code; unknown or ambiguous typed captions show an error and retain the previous
committed value. Empty input clears the value. comboBox commits free text.
Both commit on change, not each keystroke; invalid filteringSelect text is never
written to the Bag. This is a local input guard, not business validation.

Suggestions now use a themed component-owned listbox with an integrated chevron
button. The button opens all choices; typing filters captions. Arrow keys move
selection, Enter commits, Escape closes, and focus loss closes the popup.
The input exposes combobox/listbox ARIA relationships. Popover top-layer support
keeps the popup outside ancestor clipping where available; resize, outer scroll
and outside clicks close it, with listener cleanup on disconnect. This replaces
the native datalist popup after visual review. Cross-browser and assistive-technology
review is pending. Bag storepath/storeid/storecaption, remote queries, selected
metadata, required-field handling and the legacy validation hooks are not yet
implemented. Invalid text currently leaves the last committed Bag value intact;
form save gating must account for that when the form lifecycle is implemented.

Dedicated Python Live/source pages demonstrate both widgets. The borderContainer
layout selector now uses filteringSelect with headline/sidebar options.

### Splitter review

Border splitters now have a visible 6px track outside the scrolling content.
The region owns the resized dimension and its slotted child fills that dimension,
preventing the blank strip previously left after enlargement. Pointer dragging
uses deltas (no jump on grab), primary-button filtering and pointer capture when
available; mouse events remain a fallback. Drag listeners are removed on release,
cancel, window blur and container disconnect. Minimum sizes are 40px horizontally
and 30px vertically; expansion reserves the same minimum for the center when
layout measurements are available. These are initial fixed limits, not a port of
legacy configurable min/max and persisted region sizes.

The second borderContainer example exposes all four colored regions with
splitters. Tests cover directions, minimum sizes, release and disconnect; the
left splitter was also dragged in the browser and visually checked for content
fill. Full touch-device testing, keyboard resizing, dynamic region replacement
and legacy region-size Bag persistence remain pending.


### Named and positional selection for tabs and stacks

Both containers accept `selectedPage="^.page"` with child `pageName`, or
`selected="^.index"` with zero-based indices. Existing `value`/`key` recipes
remain supported. `contentPane(pageName=..., title=...)` is available as a child
of tab/stack; this does not yet implement legacy border `region` translation.
When both selection pointers are present, changing either synchronizes the other
after the renderer attribute batch. On initial construction selectedPage takes
precedence. Contradictory simultaneous changes have no separately specified
legacy precedence contract yet.

`stackButtons(stackNodeId=...)` finds the container by its `nodeId` in the current
document, lists its pages, switches selection and follows external Bag changes.
Use unique nodeIds within the document. Direct component events connect this
controller; they are not a full implementation of genro publish/subscribe.
Subscriptions/observers are detached when the controller disconnects.

The laboratory has separate stackContainer/stackButtons pages and updated tab
examples for name and index selection. Tests cover bidirectional name/index
synchronization, controller clicks, and retained local field state. The following
sections cover dynamic selection and page lifecycle. The full dynamic add/remove
compatibility contract and frame routing remain pending.


### GUI data alias and dynamic stack follow-up

`data_recipe_alias=True` opts the laboratory dialect into `pane.data(...)`.
Python and JavaScript source-root and node calls dispatch to the existing
`dataSetter` recipe node. The internal node tag stays unchanged. Generic HTML
and generic source-node datastore access retain their existing behavior;
GUI authors access the datastore through `builder.data`. Relative-data helpers
continue to work. JavaScript accepts `data(path, value, attrs)` as well as the
existing object argument form. Widget examples, playground and inspector now
use this spelling in their actual Python recipes.

Stack removal tests now cover deleting the selected source page, falling back
to the first remaining page, clearing bound selection when empty, and adding a
new source page afterward. The stackButtons controller follows these changes.
`switchPage` supports names, indices and `*next*` / `*prev*`, without wrapping at
the boundaries, skipping hidden and disabled pages.

### Page availability, closing and local topics

Tab/stack children accept reactive `hidden` and `disabled` attributes and
`closable=True`. Hiding preserves the source page and its contents. Closing via
the close button removes the actual SourceBag node. A cancelable
`gnr-before-close` component event allows a close veto. If the selected page
becomes unavailable, selection falls back to an available page; no available
pages means null selection. Positional indices retain the full child ordering.

The second tabContainer, stackContainer and stackButtons examples provide
checkboxes for availability and close buttons. Reload recreates closed examples.

Application exposes `subscribe(topic, callback, {signal})`, returning an
unsubscribe function, and `publish(topic, payload)`. Topics stay local to the
page. Containers publish `<nodeId>_hiding` and `<nodeId>_showing` with
`{pageName}`, and `<nodeId>_selected` with `{page, selected, change}` where
change is `<pageName>_hide` or `<pageName>_show`. Notifications occur after the
renderer batch settles; this does not reproduce legacy callback timing exactly.
Use explicit nodeIds for application subscriptions.

This is a minimal topic API: legacy overloads, recursive publication, automatic
source-node subscription ownership, dojo.connect method interception and
cross-frame delivery are not implemented. Owners must unsubscribe or abort
their subscription signal when disposed.

### Buttons and declarative local subscriptions

The `widgets/button` page uses native HTML buttons through the recipe builder.
`action` executes trusted author JavaScript with `this` bound to the source node,
`sourceNode`, `genro` (the page Application), `event`, and current resolved
attribute parameters. In particular, `message="=.message"` is read when clicked.
Use `this.SET('.result', message)` / `this.GET('.result')` in this first slice.
Legacy statement macros such as `SET .result = message` are not yet parsed.

Reactive `disabled` and `hidden` use native button behavior, with an additional
source-state check before action execution. `action` takes precedence over
`publish`; a button with only `publish="topic"` publishes `true`, matching the
legacy basic button case. `subscribe_<topic>="..."` on a source node runs with
`payload` (also `_kwargs`) and the same source scope. These subscriptions are
resolved from the current SourceBag at publication time; removing a source node
removes its participation without a retained listener. This initial traversal
is not an indexed topic registry and should be revisited for large pages.

The second example is an ordinary recipe-built button bar plus a stack and
status subscriber. It is not an implementation of legacy `slotToolbar` or
`multibutton`. End-to-end tests click the buttons after Python/TYTX transport
(JSON and MessagePack), then verify stack selection and the subscribed status.

Reference: legacy `genro_widgets.js` `_ButtonLogic` and
`test/webpages/html/button.py`, `test15/webpages/revised/gui/multibutton.py`.
Still pending: inherited action parameters, `_delay` click aggregation and
`_counter`, the default pending-click lock, modifiers, `ask`, `fire`/`fire_*`,
button shortcuts, slot buttons, full dataController and legacy subscription
argument conventions. Local topics remain separate from WebSocket transport.

## Runtime compatibility reference

The [runtime contract](architecture/runtime-legacy-contract.md) and
[ownership proposal](architecture/runtime-reorganization-plan.md) distinguish
approved authoring conventions from pending APIs. Continue using Python recipes,
`.data`, small documented construction methods and English examples. Preserve
source-node callback context only where the callback contract defines it; do not
assume every widget or drag callback has the same this. The ownership proposal is
accepted for an implementation trial; public signatures and detailed timing
remain proposals, and its future services are not available today.


## Page and developer-tool disposal

`genro.dispose()` ends a mounted page runtime. It removes its delegated DOM
listeners, data/source observers and queued work, and releases its developer
tools. Repeated calls are safe. Retained data and source Bags remain readable;
external Bag observers and independent page instances are not disposed.

The current developer owner is `genro.dev`. Its `inspector` and `playground`
properties refer to actual mounted tools. Existing `mountInspector` and
`mountPlayground` entry points attach them to that owner. Inspector replacement
removes its shortcut and Bag observers. Playground rebuild disposes only the
previous experiment; the outer Python recipe and editor remain active.

Bootstrap captures each Application locally and ignores obsolete asynchronous
page/tool responses. An old response cannot install an inspector on a replacement
page. This is local runtime ownership, not a definition of server identity,
WebSocket routing, ready/onStart ordering or arbitrary source-subtree lifetime.
Those contracts remain separate work. There is no generic plugin registry.

## Python bootstrap document

`PageDocument(HtmlBuilder)` now composes the initial HTML through `build_head`,
`build_body` and `build_menu`. The page's main recipe remains a separate TYTX
response; the initial `root` host is empty. Shell styles live in `shell.css`,
followed by the existing `theme.css` overrides.

Page classes declare their client implementation explicitly:

```python
class ExamplePage(WebPage):
    client_builder = ("/_assets/pages/gallery.js", "GalleryBuilder")
    client_setup = None
```

The optional setup descriptor names an exported function called with
`(host, application)`. WidgetTestPage already declares GalleryBuilder;
PlaygroundPage declares PlaygroundBuilder and mountPlayground. Registration
names need not match a `widgets/` prefix or `playground` spelling. Metadata is
chosen from the registered Python class, never a query-supplied module URL.

The server validates page and transport and embeds a TYTX JSON startup Bag in
an inert `page-startup` script. Its nested Bags describe endpoints, hosts and
module/export pairs. JSON is escaped at the raw-script boundary to preserve
literal closing tags and Unicode on decoding. This configuration does not
assign a server page ID or establish readiness or a WebSocket connection.

The full bootstrap contracts pass with genro-builders 0.23.2, including its
correction for [#39](https://github.com/genropy/genro-builders/issues/39).
The XML panel retains native `details > summary + pre` markup. Browser checks
cover the laboratory, Hello World, a widget page, transport switching and the
inspector shortcut. The owner confirmed visual and interaction acceptance;
workflow quality-check and finalization are recorded separately in the plan.

The resolution of [#38](https://github.com/genropy/genro-builders/issues/38)
places the future `dataRpc` declaration in a pages-specific mixin using the
builder's existing data-element metadata. It does not establish RPC execution;
its signature, pointer handling and transport remain separate work.

## Registered startup and RPC ownership

Page-integration JavaScript lives under `js/src`; Python page recipes remain under
`src/genro_pages`. Generic DOM construction stays in the standalone DOM library.
The runtime and its services exist before source acquisition. The source is
mounted once, after the page channel has opened; disposal prevents late responses
from reconstructing the page.

`genro.rpc.remoteCall(method, parameters, options)` is the shared page RPC service.
Application configuration supplies `rpc_http_method` (initial default `WSK`), and
`options.httpMethod` overrides it for a call. WSK uses the core WSX envelope and
TYTX; HTTP GET and POST are explicit alternatives. Calls are asynchronous Promises;
no implicit synchronous RPC or automatic retry is provided. This service is the
integration foundation for a future `dataRpc` recipe element, not a claim that
its declarative callbacks or concurrency policies are already implemented.
