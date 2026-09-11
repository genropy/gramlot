# Grammar foundations audit

Verified against Python genro-builders 0.23.2 installed in Gramlot's environment
and the current Gramlot JavaScript sources. This is an implementation audit,
not approval of a new grammar format. No runtime changes were made.

## Findings from executable probes

| Probe | Python | JavaScript |
| --- | --- | --- |
| Declared integer receives a string | Rejected | Accepted by setChild |
| Unknown keyword on a closed declaration | Rejected | Accepted |
| Omitted annotated required parameter | Rejected | No corresponding argument validator in setChild |
| Omitted unannotated required parameter | Accepted | Not established as a signature contract |
| Omitted parameter with default 3 | Default is not inserted in Source | Default is not inserted in Source |
| Child inside a void element | Rejected | Accepted through the source proxy |
| Integer parameter receives '^count' | Rejected as a string | Accepted without typed validation |
| Export typed parameter schema | attributes is null | Nothing complete to import from Python |

Python probe: define an @element(sub_tags='') field with count: int = 3;
call field(count='wrong'), field(cout=2), field(count='^count') and field().
The first three reject; field() yields empty attributes. to_grammar exports the
method docstring but attributes remains null. With count: int and no default,
omission rejects. With count unannotated and no default, omission is accepted.

JS probe: defineGrammar with a field entry, sub_tags='' and an attributes entry
for integer count/default 3. setChild accepts count='wrong', cout=2 and omitted
count; no default is inserted. wrapSource(builder.source).field().field() is
also accepted. The supplied attributes entry is an observation of ignored data,
not a proposal of an already supported attribute-schema format.

## Documentation and inheritance

Python preserves the entire method docstring as element documentation and
extracts annotated parameter validators separately. It does not turn parameter
prose into a documented, portable parameter schema. The export explicitly sets
attributes to None in builder/_grammar_export.py:_element_form.

The inherited HTML div declaration itself has **kwargs, no docstring and an
explicit list of permitted HTML children. Therefore merely inheriting HTML does
not provide exhaustive attribute documentation. Gramlot's override changes that
list to '*'; it does not remove an already complete div parameter description.
The observed effect is broader children, which allows custom widgets. Removing
it blindly would restore a child list that does not name those widgets.

Gramlot declares its widget methods with **kwargs, so their typo/type checks are
absent and documentation is missing. JS webcomponent() likewise returns doc:null
and attributes:null. Generated HTML JS grammar already starts from a partial
Python export. A complete manual cannot yet be generated from this grammar.

## Collection composition and isolation

Python BuilderBase.__init_subclass__ copies the first inherited _class_schema.
A probe with two independently compiled builder classes A(one) and B(two), then
Both(A, B), retains one but not two. This does not establish that every mixin
strategy fails: the supported composition contract needs an explicit test before
choosing collection classes. Do not assume arbitrary multiple inheritance merges
compiled grammars.

JS _resolveCollections builds a merged object but assigns it to
this.constructor._classSchema. Probe: load audit-a with extra on instance a of
Probe, then construct unconfigured instance b of Probe: b.schema.extra exists.
The comment claiming per-page schema isolation does not match this behavior.
Object.assign also makes duplicate collection element names last-wins, without
an explicit collision declaration. The new collection architecture must settle
isolation and collision policy before adding more families.

## Ownership and next gates

1. **Generic Builders:** define/export a complete attribute contract, including
   types, requiredness, defaults, documentation and serializable constraints.
   Clarify unannotated required fields, default semantics and composition of
   independently defined grammars. Complete HTML attribute documentation rather
   than assuming that inherited HTML is already exhaustive.
2. **Gramlot JS:** consume that contract and enforce equivalent creation rules;
   preserve per-instance collection isolation and make collisions explicit.
3. **Gramlot-specific authoring:** distinguish a literal from a binding expression.
   A bound integer is not just an arbitrary string. Validate resolved values in
   the browser under a documented policy; do not make generic Builders interpret
   Gramlot pointers.
4. **Shared HTML/widget attributes:** define how declared fields combine with
   style, events, accessibility/data attributes and lbl_/box_/fld_ families.
   **kwargs currently means arbitrary names, not an inherited validated vocabulary.
5. **Parity gate:** equivalent Python and JS cases must agree on valid values,
   typos, requiredness, null, defaults, parent/child constraints and bindings before
   reorganizing widgets into paired Python/JS/CSS collection directories.

The DOM form validation subsystem is a different concern from validating authoring
instructions. Existing form validation must not be cited as grammar validation.

## Code entry points

- Python Builders: builder/base.py, _utilities.py:_extract_signature_info,
  _grammar.py:_validate_call_args, _grammar_export.py:_element_form;
  contrib/html/html5_elements.py.
- Gramlot Python: src/gramlot/builder.py.
- Gramlot JS: js/dom/src/builder-base.js:defineGrammar/setChild/_resolveCollections;
  js/dom/src/collections.js:webcomponent; collections/inputs.js and layout.js.

No collection relocation, public API change, dependency patch, release or issue
creation was performed by this audit.
