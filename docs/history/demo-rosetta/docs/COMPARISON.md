# Hello World comparison

The active baseline is a static title, italic description and labeled greeting, specified in SPEC.md. The
plain HTML frame is shared by all implementations and excluded from application
code. Each implementation renders its own isolated document.

| Application source | Nonblank lines | Bytes |
| --- | ---: | ---: |
| React App.jsx | 11 | 359 |
| Vue App.vue | 6 | 299 |
| Pages recipe.py | 9 | 507 |

These are literal file counts, including imports, declarations and documentation.
Pages expresses the visible content in three builder calls. Vue expresses it in three
HTML elements. This small example does not establish an advantage for complex
pages or authoring with an LLM.

See source-inventory.json for separately measured bootstrap, adapters, framework
setup, shared frame and source viewer. Run scripts/measure.py to regenerate it.
The current Pages adapter still lives in the demo and relies on local dependency
checkouts; it is not yet a packaged library integration.

The source viewer opens the individual page first and offers the common HTML
frame separately. This keeps navigation out of the code being compared without
hiding the supporting implementation.

The previous order comparison is preserved in
../standby/orders/baseline-COMPARISON.md. Its measurements do not describe the
active Hello World demo.

## Comparison principle

Compare semantics first: how each implementation describes page structure,
state, reactive dependencies, events and server interactions. Syntax differences
and raw line counts alone do not establish simplicity.

Attribute source to its responsibility:

- Individual page: its content, specific state, rules and interactions.
- Shared application context: startup, navigation, reusable components and
  cross-page policies such as RPC waiting behavior.
- Library and host integration: runtime bootstrap and adapters.

Show these responsibilities explicitly in the source viewer and measurements.
Shared code has an initial and maintenance cost, but must not be counted again
for each page. A page-specific helper still belongs to the page even if placed
in another file. Every framework may use idiomatic abstractions; compare the
same observable behavior and explain the semantics behind the authored code.

Pages JS adds an independently authored JavaScript recipe. Compare it with Pages
Python for language differences and with React/Vue for composition semantics.
The live CodeMirror editor is demo tooling, not part of the page recipe. Recipe,
execution harness and editor are measured in separate inventory groups.

## Progressive binding examples

Six cumulative increments now follow Hello World. Each framework's example is
independent and includes its own state and behavior. The inventory lists every
example separately instead of treating only Hello World as application cost.

React separates draft text from committed state; Vue likewise commits a draft
on blur. Pages declares updateOn on the binding. Pages dataFormula declares
browser-side conversions for CSS size and boolean styles; Python constructs the
recipe without executing those reactions. Pages uses the verified widget controls with lbl; React/Vue use native controls.
Pages uses horizontalSlider with explicit bounds, step and intermediateChanges;
React/Vue retain the equivalent native range. Output is a readonly field with separate label in all variants.

The shared editor, inspector bridge, routing and example catalog are integration
costs, not costs repeated for every example. No conclusion about a framework's
superiority follows merely from these line counts.
