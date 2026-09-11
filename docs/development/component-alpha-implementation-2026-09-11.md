# Gramlot Component alpha implementation

Date: 2026-09-11. The owner authorized a practical first implementation, to be
adjusted through use. This checkpoint supersedes the earlier reports' statement
that no component migration has started. It does not freeze the architecture.

## Delivered contract

`getComponentBases()` returns realm-local `GramlotElement` and `ControlElement`
classes after a DOM exists. Importing the public module needs no DOM.
GramlotElement owns connection hooks and disposers; ControlElement shares native
control construction, value reflection, focus protection, lock forwarding,
change bridging and the existing InputNullState collaborator. Its customization
hooks preserve the existing input subclasses, including the symbolic date editor.

`Decorated(Base)` installs the single WidgetLabel service and exposes `decoration`.
`FieldState(Base)` delegates presentation through the shared field-state helper.
ControlElement already applies both. `fieldControl` and `isNullValue` provide a
public seam for FormField, with old private-field fallbacks where needed for
existing adapters. FormField/Validator still own validation, async state and Data
writes. A shared `markEdited(event)` eliminates double invalidation of one input
event seen by both field capture and application delegation.

All current browser components now use `registerComponentCollection()` description
adapters. Existing DOM implementations need not inherit a control base to be
Gramlot Components. Registration generates grammar, verifies actual custom-element
definition and attaches `constructor.gramlotComponent`. The host still explicitly
imports and selects collections; no arbitrary package scanning or code loading
was introduced. Legacy grammar registration remains compatible.

## Inventory

- Inputs: textBox, textBoxArea, filteringSelect, comboBox, passwordbox,
  numberTextBox, dateTextBox, timeTextBox, horizontalSlider, verticalSlider,
  checkbox. All share ControlElement.
- colorpicker now shares ControlElement while retaining its original undecorated
  shadow shape and native null color fallback.
- Layout adapters: formlet, labledBox, panel, box, borderContainer, tabContainer,
  tab, contentPane, stackContainer, stackButtons.
- Other adapters: copyButton, palette, storeTree, form and optional CodeMirror.
- Inspector: application-tool adapter with existing explicit host initialization;
  it does not add a Python recipe or alter its disposal semantics.

The 27 recipe descriptions live in `js/dom/src/components/builtin-components.json`.
`scripts/generate_components.py` produces the JS catalogue and the five existing
Python grammar family modules. These remain open `**kwargs` declarations with
render metadata, preserving current Source authoring behavior. External packages
can explicitly select their own trusted JSON and output directories.

## Developer guide

`docs/development/component-guide-content.md` is the handbook source.
`scripts/build_component_guide.py` rebuilds the 12-chapter HTML, example ZIP and
complete offline guide ZIP. Chapters 3, 7, 8 and 10 explain the actual bases,
mixins, registration, generator and limits. The existing greeting example uses
the descriptor registry; a new NoteField example demonstrates a three-hook
textarea specialization with real binding and validation integration.

## Verification

- 275 JavaScript tests pass, including all existing runtime tests and four new
  alpha checks: every current collection in two DOM realms; an external control's
  reconnect, focus, null, field-state and resource lifetime; registration errors;
  single draft invalidation per input event.
- The executable handbook integration passes for native greeting, descriptor
  activation, reactive name and NoteField writeback/validation.
- The full Python run with `GRAMLOT_CLIENT_MODULES="$PWD/build/test-client"`
  produced 102 passed, 1 skipped and one environment failure: the manual CLI's
  local HTTP bind is rejected by the execution sandbox (Operation not permitted).
  This failure is unrelated to component migration. The bare suite requires that
  documented module-alias environment; without it the JS bridge resolves obsolete
  sibling paths.
- Generated catalogue parity and every Python recipe's open attributes/render
  identity are covered by `tests/test_component_alpha.py`.

## Deliberate alpha limits

The identity catalogue is not a complete typed parameter schema. The earlier
textBox generation proof remains separate evidence for richer declarations and
the Builders 1.0 attribute-export gap. Descriptor selection is explicit; package
installation/discovery remains host-owned. Existing non-control implementations
are adapted, not all rewritten onto a forced superclass.

Numeric Decimal editing/formatting remains unresolved; valueAsNumber still
narrows that path. No new datetime component was added during this migration:
its owner-selected shape is definitively native datetime-local, local values,
server UTC conversion. No menu, store, resolver, RPC or publication work was added.
Symbolic date parsing and source-slider work remain intact.
