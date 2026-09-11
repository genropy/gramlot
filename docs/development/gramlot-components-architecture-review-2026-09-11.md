# Gramlot browser component architecture review

Date: 2026-09-11. This is an architecture assessment and migration proposal,
not an approved public API or authorization to refactor runtime code. Proposed
class and capability names are illustrative. Existing behavior, recorded owner
decisions, and open questions are identified separately below.

## Outcome

Gramlot should use a small number of browser base classes for stable DOM shapes,
plus narrow capability mixins for behavior that genuinely crosses those shapes.
Stateful collaborators should remain composed objects. This fits JavaScript's
single inheritance, makes reuse visible, and avoids a universal widget superclass.

The useful browser families are:

1. a lifecycle-aware component base;
2. a control-host base for a component whose public value is represented by one
   native control;
3. a popup-trigger base for dropdown buttons and other anchored popups;
4. menu and menu-item bases for composite navigation and command behavior.

The useful mixin capabilities are decoration, disabled/read-only state forwarding,
a thin validatable/field-state adapter, and possibly action dispatch once two real
action components exist. Source/Data binding is owned by the application/builder
boundary. Validation evaluation, draft policy and async coordination remain owned
by the single `FormField`/`Validator` implementation; a browser mixin may install
and expose the widget-facing adapter without copying that engine.

`WidgetLabel` and `InputNullState` are already the right kind of reusable,
composed capability. They must be reused rather than reimplemented. Their public
integration seams need clarification before extracting base classes, especially
because form rendering currently reaches into `_widgetLabel.box` and several
services reach into `_input` and `_nullState`.

Owner correction after review: use `numberTextBox` (decimal places and formatting),
`dateTextBox` and `dateTimeTextBox` as guiding
cases for the first architecture slice. `dateTextBox` already derives from
`GnrInput`; `dateTimeTextBox` has no declaration or implementation in the inspected
active sources. Its legacy contract must be inspected before proposing its shape.
That assessment is now recorded in
[Typed components: legacy and architecture review](typed-components-legacy-architecture-review-2026-09-11.md).
It refines the hierarchy by placing shared field behavior above single-control
and composite-control field bases.
Color picker remains evidence of duplication, not the selected migration pilot.

## Three different composition systems

The word "component" currently covers three distinct systems. They should share
contracts where useful, but should not be forced into the same inheritance model.

### Python declaration composition — existing

`GramlotBuilder` already assembles plain declaration mixins before `HtmlBuilder`
([`src/gramlot/builder.py`, lines 7-26](../../src/gramlot/builder.py)). The input
tags are declarations with no browser implementation inheritance
([`src/gramlot/grammar/inputs.py`, lines 7-44](../../src/gramlot/grammar/inputs.py)).
`AuthoringNode.validate()` is fluent syntax which writes `validate_*` attributes
onto the same Source node; it does not install validation behavior in a widget
([`src/gramlot/builder.py`, lines 82-99](../../src/gramlot/builder.py)).

This is schema composition. Its mixins group authoring vocabulary and let one
compiled builder own the dialect. They are not a model for browser mixin order,
DOM lifecycle, or services. Duplicate Python declaration names should fail a
preflight check rather than silently depend on MRO ordering, as already proposed
in the [widget module organization study](widget-module-organization-study.md).

### Browser implementation composition — partially existing

The browser runtime currently has one local `GnrInput extends HTMLElement` family
and many direct `HTMLElement` subclasses. `GnrInput` owns native-control creation,
shadow structure, value reflection, focus anti-echo, disabled/read-only forwarding,
change bridging, null state, and decoration
([`js/dom/src/collections/inputs.js`, lines 54-141](../../js/dom/src/collections/inputs.js)).
Its subclasses override explicit hooks such as `_createControl`, `_configure`, and
`_buildContent`; that is a good use of single inheritance because they share a
stable control-host shape.

`GnrColorpicker` is a separate direct subclass but repeats most of that protocol:
shadow/control construction, `InputNullState`, `WidgetLabel`, composed `change`,
connect/disconnect, focused-value protection, locked-state forwarding, and
null-aware value access
([`js/dom/src/collections/colorpicker.js`, lines 19-59](../../js/dom/src/collections/colorpicker.js)).
Its `null` representation intentionally differs: it falls back to `#000000`, so
shared structure must allow type-specific `writeControlValue()` behavior.

### Runtime Source/Data services — existing and separate

`BuilderBase.runtimeValues()` resolves pointers, registers reactive readers, and
treats decoration bindings specially for data widgets
([`js/dom/src/builder-base.js`, lines 231-264](../../js/dom/src/builder-base.js)).
`Application._enableInput()` owns delegated write-back and `updateOn` selection
([`js/dom/src/application.js`, lines 185-224](../../js/dom/src/application.js)).
`DomTarget` preserves component identity for decoration/form patches
([`js/dom/src/target-wrapper.js`, lines 69-124](../../js/dom/src/target-wrapper.js)).

These are page/runtime responsibilities. A component should provide a value or
command adapter and composed events; it should not parse Gramlot paths, find Source
nodes, register reactive readers, or write Data itself. `storeTree`'s `gnr-set`
event is the established exception-shaped adapter: the widget emits a pointer and
value, while the application performs the mutation
([`js/dom/src/collections/storetree.js`, lines 145-160](../../js/dom/src/collections/storetree.js);
[`js/dom/src/application.js`, lines 262-271](../../js/dom/src/application.js)).

## Evidence of reuse and duplication

### Shared implementations that must remain singular

- `WidgetLabel` alone parses and routes `lbl_*`, `label_*`, `box_*`, `box_l_*`
  and `box_c_*`, creates stable label/content regions, assigns accessible label
  relationships, and observes reactive decoration attributes
  ([`widget-label.js`, lines 25-153](../../js/dom/src/collections/decoration/widget-label.js)).
  Inputs, color picker, copy button, store tree, explicit `labledBox`, and layout
  components already consume it. A base class or mixin should install this same
  collaborator; it must not duplicate its routing or markup rules.
- `InputNullState` alone owns the null/empty distinction for native controls,
  null presentation, checkbox indeterminacy, ARIA description, Backspace clearing,
  locks, and delayed blur commit
  ([`input-null-state.js`, lines 2-83](../../js/dom/src/input-null-state.js)).
  It is shared by the input family and color picker. It should remain a composed
  state object because it has its own state machine and control-specific policy.
- `Validator` evaluates ordered rules without writes, while `FormField` owns draft,
  cancellation, generation, async completion, write and presentation
  ([`validator.js`, lines 1-20](../../js/dom/src/forms/validator.js);
  [`field.js`, lines 86-147](../../js/dom/src/forms/field.js)). Moving this logic
  into every validating widget would duplicate a working field capability.
- application-level event delegation is already one implementation for input
  write-back and command execution. Components should emit the agreed events, not
  each implement Source lookup and recipe evaluation.

### Concrete duplication worth removing

`GnrInput` and `GnrColorpicker` repeat seven related operations listed above.
This is enough evidence for a common control-host base. The extraction must retain
their real differences: input subclasses choose parsing and public property
semantics; color uses `#000000` as the native fallback; checkbox exposes `checked`;
selection inputs separate captions from committed identifiers.

The selection component also implements a complete anchored listbox inside
`inputs.js`: toggle creation, open/close, fixed positioning, outside pointer,
scroll and resize listeners, active option, and keyboard handling
([`inputs.js`, lines 311-409](../../js/dom/src/collections/inputs.js)). This resembles
future popup/menu infrastructure but is not yet proof that one class can serve
combobox listboxes and menus. ARIA roles, focus ownership, selection semantics,
typing, and close rules differ. The positioning and external-listener lifecycle
could later become a composed `AnchoredPopup` service after dropdown/menu code
provides a second consumer.

`Application._enableInput()` marks a form field's draft dirty on an input event
([`application.js`, lines 210-219](../../js/dom/src/application.js)), while
`FormField.render()` also attaches a capture listener that invalidates and marks
the same field dirty ([`field.js`, lines 168-177](../../js/dom/src/forms/field.js)).
This is overlapping ownership and may cause duplicate state publication. It is
not established as a behavioral defect by this review. The desired boundary is
one field adapter/listener owned by `FormService`, with application delegation
calling that adapter when a registered field exists and directly writing only an
unregistered field.

### Similar code that should stay local

One-time listeners attached in a constructor to elements exclusively owned by the
same shadow root do not automatically need per-disconnect removal: host and child
are collected together. External document/window observers, subscriptions,
timeouts and async effects do require explicit cancellation. `CopyButton` already
invalidates async generations and clears its timer on disconnect
([`clipboard.js`, lines 25-48](../../js/dom/src/collections/clipboard.js));
`storeTree` unsubscribes its Bag and label observer
([`storetree.js`, lines 85-105](../../js/dom/src/collections/storetree.js)).

Input-specific behavior should not be flattened into a shared base merely because
methods look alike. Textarea remaining-count semantics, checkbox caption/checked,
selection caption-to-code commit, numeric parsing, range orientation, and color
fallback remain family hooks or subclasses.

## Proposed browser relationships

The following names are proposals, not public API commitments.

```text
HTMLElement
  GramlotElement                         lifecycle + owned disposers only
    FieldElement                         field adapter + shared field state
      ControlElement                    one native control; event/value bridge
        TextControlElement              textBox, passwordbox, textBoxArea
        TypedControlElement             number/date/time
        ChoiceControlElement            comboBox -> filteringSelect specialization
        CheckboxControlElement
        RangeControlElement             horizontal -> vertical specialization
        ColorControlElement             duplication evidence, not selected pilot
      CompositeFieldElement             several controls, one bound value
        DateTimeFieldElement            proposed date + time composition
    PopupTriggerElement                 dropdown button; later combo button
    MenuElement                         item focus, keyboard navigation, submenu
    MenuItemElement                     command/submenu/separator variants

capability mixins (outermost behavior wrappers, applied once):
  Decorated(Base)                       installs the existing WidgetLabel
  LockableControl(Base)                 forwards disabled/readonly to control(s)
  Validatable(Base)                     exposes/installs the field-state adapter
  Actionable(Base)                      candidate only after button + menu item prove it

composed collaborators:
  WidgetLabel                           label/box DOM and reactive attributes
  InputNullState                        null state machine for eligible controls
  FormFieldAdapter                      validation presentation/read/write seam
  AnchoredPopup                         candidate after two compatible consumers
```

A plausible declaration illustrates the intended order:

```js
class ControlElement extends Decorated(LockableControl(GramlotElement)) {}
class TextControlElement extends ControlElement {}
class ColorControlElement extends ControlElement {}
```

Mixin application should happen in one module, not independently in each leaf.
Each mixin must declare the members it requires and supplies. Two mixins must not
silently override the same lifecycle callback. JavaScript cannot enforce final
methods, so `GramlotElement` should establish one lifecycle convention and
conformance tests: hooks either chain `super` or register independent callbacks.
One possible convention uses stable callbacks that call protected hooks:

```js
connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this.onConnect();
}
disconnectedCallback() {
    if (!this._connected) return;
    this._connected = false;
    this._disposeConnection();
    this.onDisconnect();
}
```

This base should maintain two lifetimes:

- instance lifetime for shadow DOM and listeners on owned controls, installed once;
- connection lifetime for `MutationObserver`, Bag subscriptions, document/window
  listeners, timers, and abort controllers, recreated after detach/reattach.

A per-connection disposer stack must be emptied on disconnect and recreated on
reconnect. It must not remove one-time owned-control listeners permanently. Async
callbacks additionally need an instance generation/token check like `CopyButton`.

## Responsibilities and extension hooks

### `GramlotElement`

Own connection idempotence and disposer registration. It should know nothing about
Source nodes, values, labels, validation or popups. Hooks: `initializeShadow()`
once, `onConnect()`, `onDisconnect()`. Reconnection is part of the contract.

### `ControlElement`

Own `control`, native `change` re-emission, focused-control anti-echo, control
attribute forwarding, and the public value adapter. Hooks should describe actual
variation: `createControl()`, `configureControl(control)`, `buildControlContent()`,
`readControlValue()`, `writeControlValue(value)`, `boundProperty` (`value` or
`checked`), and `usesNullState`. It should preserve composed `input` and `change`
events so application delegation remains the binding owner.

`InputNullState` is installed only when `usesNullState` is true. It should receive
an adapter if access to `host.value`/`host.checked` becomes too implicit; its state
machine should not be rewritten as mixin methods.

### `Decorated(Base)`

Create exactly one `WidgetLabel` using a declared `decorationTarget` containing
`control`, `content`, and optional existing box/label. Connect and disconnect the
existing observer through the common lifecycle. Expose a stable read-only
`decoration` adapter. Do not expose markup fields as the form contract.

### Validation adapter seam

`FormField` currently assumes `_input`, `_nullState`, `_widgetLabel.box`, shadow
DOM placement, and direct message injection
([`field.js`, lines 43-64 and 168-213](../../js/dom/src/forms/field.js)). A narrow
widget adapter should replace those private reaches:

```text
fieldControl() -> native control
readFieldValue(property) -> typed candidate
writeFieldValue(property, value)
setFieldState({invalid, pending, messages})
isNullValue() -> boolean                 only where selection mapping needs it
```

`setFieldState` lets decoration decide how an error class reaches its box and lets
each component choose where validation messages live. `FormField` and `Validator`
remain the sole owners of validation policy, stale async results, form dirty state,
and writes. Standalone validation still works because a `FormField` may exist
without a form.

A `Validatable(Base)` or `FieldState(Base)` mixin is therefore plausible. Its
responsibility is limited to exposing this adapter and installing presentation
state on connection; it does not contain rule ordering, normalization, remote
calls, generations, writes or form dirty policy. A composed adapter instead of a
mixin remains a credible option if no second component family needs field state.
The first control-host slice should compare both shapes before settling the name
or mechanism.

### Action and event ownership

Current native `button` actions are application-delegated. The renderer marks a
command button, and `_enableCommands()` resolves its Source node, current runtime
attributes, disabled/hidden state, then runs `action` or publishes a topic
([`application.js`, lines 233-252](../../js/dom/src/application.js)). Preserve this
direction for a first Gramlot button component: the component owns native button
semantics and emits a click; the application owns recipe execution and Source/Data
context.

An `Actionable` mixin is justified only if button and menu item need the same host
behavior beyond emitting an activation event. It must not evaluate action strings.
A better eventual event is one composed activation carrying only component-local
facts (original event, item identity); the application/action service resolves
current attributes and executes in Source-node context. Exact event name and
payload remain unsettled.

## Buttons and menus: legacy evidence and bounded implications

Legacy is evidence for semantics, not a request to reproduce Dojo internals.
The cited file was inspected at
`/Users/gporcari/Sviluppo/Genropy/genropy/gnrjs/gnr_d11/js/genro_widgets.js`,
commit `418b4454a6e08445817e858a1b5d2a2c91c2dbf5`.

- `_ButtonLogic` centralizes disabled checking, click suppression/debounce,
  modifier/counter context, child controller activation, `action`, `fire`,
  `publish`, and `fire_*` behavior
  (`genro_widgets.js`, lines 3501-3587 in the inspected legacy checkout).
  Current Gramlot implements only current native button `action`/`publish` through
  application delegation. `fire`, `fire_*`, confirmation, delay, modifiers and
  child logical declarations need explicit compatibility decisions rather than
  incidental inclusion in a base class.
- Legacy `Menuline` distinguishes separator, command and submenu; resolves action
  inheritance and context target; and writes `selected`/`selected_*`
  (`genro_widgets.js`, lines 2993-3096). These are valuable semantic categories.
  They should become explicit menu item variants/adapters, while their exact
  inherited-action precedence and selection writes remain to be specified.
- Legacy `Menu` can bind to a parent or external target, serve context menus,
  rebuild from values/store/resolver, filter opening by modifiers/classes, update
  item disabled/hidden state on open, preserve context target, and unbind on
  destroy (`genro_widgets.js`, lines 3120-3401). The first menu slice should not
  claim all of this. External target binding makes cleanup and original context
  target first-class responsibilities.
- Legacy `DropDownButton` owns its dropdown child, refreshes it before opening,
  anchors and sizes it, restores state on close, invokes opening/opened hooks,
  focuses the popup, and recursively destroys the child
  (`genro_widgets.js`, lines 5406-5524). This supports a popup-trigger base plus
  composed popup controller, not inheritance from an input/listbox component.
- The legacy Python declaration distinguishes button, combo button, dropdown
  button, menu and menu item (`gnr/web/widgets/dijit.py`, lines 340-427). Current
  Gramlot has no equivalent dedicated browser collection yet. Public signatures
  must be audited before being declared.

Near-term families should therefore share:

```text
button ----------------------> application action dispatch
menu item -------------------> application action dispatch
dropdown button --owns-------> popup trigger/controller --shows--> menu
context menu ------binds-----> external target(s) and supplies context target
menu --------owns------------> focus/navigation + menu item collection
```

The menu owns roving focus, Arrow/Home/End/Escape behavior, submenu relationships,
open item state, and close-on-command. The popup trigger owns anchor, open/close,
outside interaction, viewport placement and focus restoration. The context binding
owns `contextmenu` listeners and original target. The action layer owns Source
context and Data effects. This separation prevents dropdown buttons, context menus,
and comboboxes from each rebuilding an entire popup lifecycle.

## Lifecycle and cleanup contract

Every component/capability should classify resources when acquired:

| Resource | Owner | Release |
| --- | --- | --- |
| owned shadow child listener | component instance | collected with host; remove only if child can be replaced |
| host decoration observer | `WidgetLabel` | every disconnect; recreate on connect |
| Bag subscription | data widget | unsubscribe on disconnect and before changing Bag |
| document/window popup listener | popup controller | close/disconnect, idempotently |
| context target listener | context-binding capability | unbind target change/disconnect |
| timer/async work | initiating capability | cancel plus generation/abort guard |
| form field listener | `FormField`/adapter | field disposal or control replacement |
| application delegated listener | `Application` | application disposal |

Disconnect must close a popup before dropping document listeners and restore focus
only when its trigger is still connected. Reconnect must not double-register.
Changing an external target or store must release the former resource first.

## Binding contract

Binding remains declarative in Source and centralized in the runtime:

- renderer stamps resolved values and pointer metadata on hosts;
- a component reflects runtime attributes without overwriting a focused draft;
- components emit composed native or Gramlot command events;
- application/form services choose commit timing, parse candidates, validate and
  write Data;
- reactive changes reconcile attributes while preserving host/control identity.

This keeps a button, menu selection, tree selection and input within the learned
Source/Data model without embedding path semantics into DOM classes. A future menu
selection adapter may emit the existing `gnr-set` shape if it writes one explicit
resolved destination; multiple legacy `selected_*` writes likely belong in an
application action service instead. This remains unsettled.

## Tradeoffs

| Choice | Benefit | Cost / guardrail |
| --- | --- | --- |
| small base families | clear stable shape and inherited hooks | avoid a base containing optional menu/form/input branches |
| narrow functional mixins | reuse across unrelated shapes | apply centrally; detect member collisions; specify order |
| composed stateful services | explicit ownership, cleanup and testability | needs small adapters and slightly more wiring |
| application-owned binding/actions | one Source/Data mental model | components cannot operate fully without a runtime adapter |
| native controls and ARIA patterns | browser semantics and accessibility baseline | composite menus still need deliberate keyboard/focus work |
| retain stable collection facades | bounded migration and compatible activation | code may remain physically split behind one collection ID |

The design should resist both extremes: copying lifecycle/value code into every
custom element, and building a universal `GramlotWidget` that knows decoration,
forms, binding, popups, actions, stores and layout. Reuse is maximized when each
shared responsibility has one owner and leaf classes provide only their variation.

## First bounded migration slice

The owner selected `numberTextBox`, including decimal places and formatting,
followed by `dateTextBox` and `dateTimeTextBox`, instead of the proposed
input/color-picker pilot. The follow-up review recommends starting with a private
field/single-control base and a Decimal-preserving numeric codec. It keeps display
fraction digits, accepted decimal places, and value-changing quantization separate.
Date then proves typed native ISO editing; date-time proves the composite branch
only after timezone semantics are selected. Exact public formatting syntax and
rounding policy remain owner decisions. See the
[typed-component review](typed-components-legacy-architecture-review-2026-09-11.md#first-bounded-slice)
for scope and gates.
The existing `timeTextBox` is relevant reusable code, not a substitute for the
requested date-time component.

First verify legacy date/date-time declarations and behavior, including value
types, editing, formatting and time-zone treatment. Do not presume that
`dateTimeTextBox` is a native `datetime-local` control or a composition of two
controls. This is a new-component contract question as well as a reuse exercise.
The architecture must be checked against the resulting control shape before
committing to a base that assumes exactly one native control.

Then propose a bounded extraction and temporal-component implementation using
the shared field adapter, decoration and null services. Preserve existing tags,
attributes, binding, validation rules and focus/identity behavior. Conformance
checks must cover temporal values and commit behavior as well as reactive labels,
null versus empty, validation and detach/reattach cleanup. Color-picker extraction
is deferred; its observed duplication remains valid evidence for later reuse.

After that slice, implement a native button plus application action adapter using
the current `action`/`publish` behavior. Then add menu/menu-item and dropdown/context
popup slices. Extract `AnchoredPopup` only when the selection popup and new menu
controller demonstrate compatible positioning/lifecycle primitives.

## Unsettled decisions

- Exact browser base, mixin, adapter and event names.
- Which legacy button behaviors enter the first contract: `fire`, `fire_*`, delay,
  modifiers/counter, confirmation, shortcuts and child logical declarations.
- Menu declaration grammar, separator spelling, submenu shape, values/store/resolver
  sources, and selection write semantics.
- Exact inherited action precedence for menu items and context targets.
- Context-menu target syntax and whether targets may change reactively.
- Popup primitive choice (`popover` API versus a framework-owned top-layer host),
  placement policy, mobile long-press behavior and nested-menu focus strategy.
- Whether combobox and menu share only an anchored-popup service or also any
  navigation utility after accessibility behavior is tested.
- Whether a field adapter is a symbol/protocol, base method set, or composed object.
- Single ownership of form draft invalidation between application delegation and
  `FormField`; current overlap is evidence for review, not a proven user-visible bug.

## Status classification

Existing in current code and covered by the inspected existing tests: Python declaration mixins, the `GnrInput`
family, `WidgetLabel`, `InputNullState`, application-level pointer binding and
command delegation, `FormField`/`Validator`, DOM identity reconciliation, and
cleanup in the named components. No test suite was run for this documentation-only
review. The cited tests describe current Gramlot coverage, not complete legacy
parity or real-device menu accessibility.

Proposed here: the browser class families, lifecycle base, narrow capability
mixins, field adapter seam, action adapter boundary, popup/menu ownership, and the
bounded migration sequence.

Still unsettled: all public button/menu APIs and the compatibility choices listed
above. No runtime implementation, refactor, dependency change, commit, or new task
was performed as part of this review.
