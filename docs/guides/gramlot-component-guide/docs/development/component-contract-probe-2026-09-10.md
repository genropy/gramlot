# Component contract generation probe — 2026-09-10

The owner selected a component-description-first direction: describe a Gramlot
component explicitly, generate Python declarations that Builders can compose,
and export the composed grammar to JavaScript where it is associated with the
browser implementation. This supersedes treating independently handwritten
Python declarations as the necessary origin of every component contract. The
concrete descriptor shape in `docs/examples/components/textbox/` is a bounded
worked example and has not been approved as a stable public format.

## Installed Builders evidence

The Gramlot virtual environment reports `genro-builders 0.23.2` from
`.venv/lib/python3.14/site-packages`, with no `direct_url.json`. A focused class
probe verified the installed behavior rather than relying on an older audit:

- `@element` retains `documentation`, `declared_names`,
  `accepts_var_keyword`, typed validators/defaults and `_meta` in the Python
  `_class_schema`;
- those fields enforce explicit types while `**kwargs` leaves the intended
  attribute families open;
- public `BuilderBase.to_grammar(path)` emits `builder_grammar` 1.0;
- the public export preserves documentation, structure and `_meta.render_tag`;
- its per-element `attributes` field is always `null`, so signatures, types and
  defaults do not make the round trip in version 1.0.

The installed exporter file and the adjacent source checkout happened to have
the same SHA-256 (`7455efd0f44ffb682de98ad39ec2ff1f65dc58c5e61907675434ab1580aa3c4b`),
but the test and generator use the installed distribution. No Builders source
or installed file was modified.

## Bounded adapter

The example generator recognizes explicitly selected `*.component.json` files
plus named shared attribute sets,
writes an explicit open Python declaration, composes it with `BuilderBase`, and
invokes only `to_grammar`. Its generated JavaScript module embeds the standard
export unchanged and carries descriptor parameters in a separate example
envelope. It registers `guideTextBox` against the existing `inputs` collection
and `gnr-textbox`; it does not duplicate production `textBox` registration.

This demonstrates the requested data flow and makes the exporter gap visible.
It is not a private exporter extension and does not establish the envelope as a
generic framework contract.

A second convention-named descriptor covers `textBoxArea`, including
`remainingHint`. The generator derives its explicit Python declaration,
Builders grammar, JavaScript association and RST parameter table. Production
runtime code still implements the native control and lifecycle. The current
application registry requires an explicit module import and collection request;
it does not yet discover components automatically. Loading, custom-element
registration and grammar export are separate steps, and indiscriminate
filesystem/network scanning is outside this proof.

Generating inspectable Python source was selected for this proof over in-memory
method synthesis. Builders compiles real signatures/type hints at class
creation, while checked-in generated source remains visible to editors and
documentation tools. A dynamic manifest loader is feasible through the same
plain-mixin extension point, but it would not solve the 1.0 attribute-export
gap and would make the declaration surface less reviewable. The manifest and
shared sets remain the sole parameter catalogue in either design.
