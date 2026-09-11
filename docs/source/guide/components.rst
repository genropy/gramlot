Build a Gramlot component
=========================

A Gramlot component is a browser custom element plus a recipe grammar entry.
The grammar gives Python and JavaScript authors a stable recipe name; its
``render_tag`` links that recipe to the custom element registered by a
collection. Treat the component description as source and generate language
declarations from it. Do not reconstruct a contract from
``observedAttributes``: importing browser modules can register elements or
otherwise require a DOM, and observed attributes describe implementation
mechanics rather than the whole authoring API.

This chapter includes a complete, isolated ``textBox``-based proof. Its
descriptor format is an example used to test the workflow, not a frozen public
Gramlot schema.

Implemented alpha
-----------------

The current runtime now provides ``getComponentBases()``, ``Decorated``,
``FieldState`` and ``registerComponentCollection()`` through ``gramlot-dom``.
Inputs and colorpicker share ControlElement; other existing implementations use
thin description adapters. The identity catalogue at
``js/dom/src/components/builtin-components.json`` generates the production open
Python declarations and JavaScript descriptions with
``python scripts/generate_components.py``. This alpha preserves existing recipe
names and ``**kwargs``; it does not yet catalogue every typed parameter.

The rebuilt developer handbook at ``docs/guides/component-development.html``
explains the executable shared-base example and lifecycle hooks. The richer
textBox proof below remains useful evidence for parameter generation and the
public Builders exporter limitation; its envelope is distinct from the small
production alpha catalogue.

Describe the contract
---------------------

A component manifest is the author-maintained description in this proof. It
answers these questions explicitly:

* **Identity:** What recipe name, custom tag, collection and implementation
  module identify the component?
* **Parameters:** Which attributes are component-specific, what types and
  defaults do they have, and what does each one mean? Keep ``**kwargs`` when
  the authoring contract intentionally accepts open attribute families.
* **Shared attributes:** Which named Gramlot sets provide binding, decoration,
  validation or form behavior? Reference sets rather than copying their
  parameters into every component description.
* **Children:** Is the component void, unrestricted or constrained to named
  child recipes?
* **Data and events:** Which host property represents the value, which events
  bubble and cross the shadow boundary, and when does write-back occur?
* **Lifecycle:** What is connected, observed or subscribed, and what is cleaned
  up when the element disconnects?
* **Presentation:** Does the component use shadow DOM, which CSS custom
  properties form its theme surface, and does it use shared label decoration?

The worked descriptor contains those parts:

.. literalinclude:: ../../examples/components/textbox/textbox.component.json
   :language: json
   :caption: docs/examples/components/textbox/textbox.component.json

Its ``shared_attributes`` names refer to one catalog. The catalog can describe
both explicit parameters and open families such as ``lbl_*``, ``box_*`` and
``validate_*`` without duplicating them in every widget:

.. literalinclude:: ../../examples/components/textbox/shared-attribute-sets.json
   :language: json
   :caption: docs/examples/components/textbox/shared-attribute-sets.json

Know which layer owns behavior
------------------------------

Gramlot resolves literal values and the existing ``^`` and ``=`` path syntax,
adds pointer metadata, selects the ``input`` or focus-out ``change`` write-back
event, supplies form state and validation services, and applies shared
``lbl_*``/``box_*`` decoration. A component should expose a stable host
``value`` (or ``checked`` where appropriate), emit composed bubbling events,
preserve an active editor during presentation updates, synchronize supported
native attributes, clean up external observers/listeners, and define its own
shadow structure, accessibility and theme variables.

The existing ``gnr-textbox`` follows that split. Its collection registers the
custom element only when the builder requires ``inputs``. The component owns
the inner input, null-state bridge, focus protection and ``WidgetLabel``
observer; the application owns data paths and form persistence.

Generate and compose the declaration
-------------------------------------

Run the example generator from the repository root:

.. code-block:: console

   .venv/bin/python docs/examples/components/textbox/generate.py
   .venv/bin/python docs/examples/components/textbox/generate.py --check

The generator recognizes explicitly selected ``*.component.json`` files in the
example directory. The first command writes four reviewable files per
descriptor under ``generated/``. The second proves that they still match the
descriptor and shared-set sources.

``textbox_declaration.py`` contains an ordinary declaration mixin with an
explicit typed signature and an open ``**kwargs``. ``GuideTextBoxBuilder``
composes that mixin with public ``BuilderBase``. The generator then calls the
public ``GuideTextBoxBuilder.to_grammar()`` method to produce
``textbox-builder-grammar.json``. No browser module is imported or executed during
generation.

.. literalinclude:: ../../examples/components/textbox/generated/textbox_declaration.py
   :language: python
   :caption: Generated Python declaration

``textbox-contract.js`` embeds that exact Builders export, retains the
descriptor's parameter documentation in a clearly separate example envelope,
imports the declared implementation module, and registers the isolated
``guideTextBox`` recipe. Requiring its collection therefore renders the real
``gnr-textbox`` implementation without registering a second custom element.
The production ``textBox`` recipe is unchanged.

Exporter boundary
-----------------

The installed ``genro-builders`` 0.23.2 package keeps explicit signature names,
annotations and defaults in its Python class schema and uses them for call
validation. Its public ``builder_grammar`` 1.0 exporter currently emits
``attributes: null`` for every element. It does export the method docstring,
child and parent constraints, inheritance, namespace and ``_meta`` including
``render_tag``.

The example envelope keeps parameter metadata beside the unmodified standard
export so the JavaScript proof can inspect it. That envelope is a local,
demonstrative adapter. It does not claim that Builders 1.0 transports
attributes or establish a production descriptor format. A future shared format
must be agreed with the Builders attribute-export contract before generated
files replace production widget declarations.

Recognition, loading and registration
-------------------------------------

The proof recognizes descriptors by an explicit directory plus the
``*.component.json`` convention. It validates format version, unique
recipe/tag/collection identity, the ``gnr-`` custom-tag prefix, known shared
sets and supported example types. It then derives Python class names, Python
signatures, standard Builders grammar, JavaScript collection adapters and RST
parameter tables. The second descriptor proves the same path covers
``textBoxArea`` including ``remainingHint`` without rewriting that parameter
contract in Python or reference documentation.

Recognition does not load a component into a page. A host still imports a
selected generated adapter and requires its named collection. Registration then
uses the descriptor's collection and implementation module; collection
activation defines the custom element. This explicit chain avoids scanning the
filesystem or network and avoids executing browser code during Python
generation. Automatic application discovery and the missing Builders attribute
export remain future integration work; the current registry does not discover
arbitrary components by itself.

The proof generates a small Python source file instead of synthesizing methods
only in memory. Builders reads real function signatures and type hints when it
constructs a class; generated source keeps those signatures, defaults and
docstrings inspectable by editors, documentation tools and reviewers. A future
manifest loader could create equivalent declaration classes dynamically, but
that would not fix the current ``attributes: null`` export and would make the
Python surface harder to inspect. In both approaches the manifest remains the
parameter source; the generated Python, JavaScript adapter and RST table are
derived artifacts checked for staleness.

Review the generated declaration, run the reproducibility check, exercise a
Python recipe with false, empty, null and ``^``/``=`` values, and mount the
export through the JavaScript builder. For an implemented multiline component
that follows these responsibilities, see :doc:`../reference/textbox-area`.
