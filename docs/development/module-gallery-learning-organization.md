# Modules, gallery and progressive learning

Date: 2026-09-10. Analysis and proposed organization, not an approved file move
or implementation plan. Based on current Gramlot and read-only gramlot-site
sources. Preserve the accepted gallery and uncommitted inspector work.

## Current organization

Python `src/gramlot/builder.py` now assembles the authoring facade from plain
declaration mixins under `src/gramlot/grammar/`. Methods continue to expose
**kwargs without narrowing the established attribute contract. `page.py`,
`transport.py`, inspector recipes and the optional FastAPI adapter retain their
separate responsibilities.

JS `js/pages/src/builder.js` is the Gramlot assembly/inspector entry point. It
loads several DOM collections. `js/dom/src/collections/inputs.js` combines
input grammar, components and CSS. The stable `layout.js` collection entry
assembles extracted formlet and labledBox modules, while all decorated widgets
use the shared decoration module. RecipePolicies provides inherited presentation
behavior. FormService, FormField, Validator, FormController and
ValueSnapshot/MemoryStore are separated under forms/. Application coordinates
input writeback and the form service; it must not become a second validator.

`collections/forms.js` registers the specialized form component separately.
The Pages `GramlotBuilder` now imports and requires that collection explicitly.
The executable memory-form lesson verifies the Python/TYTX and direct-JS entry
paths, the `gnr-form` render tag, state projection, async pending state, save and
baseline restoration.

The site already separates catalogue (`widgets/`, catalog.json) and tutorial
(`examples/`, /tutorial/). Eleven inputs have one basic Python/JS example each;
labledBox, formlet and form entries are pending gallery coverage. Three tutorial
examples cover live binding, presentation and local scopes. The first example
already combines two fields, live commits, labels, placement and widths: too
many new choices for the first learning step. The Sphinx manual currently covers
page startup, FastAPI and inspector, not a complete widget/shared-concepts guide.

## Responsibility model

| Responsibility | Python authoring | JavaScript runtime | Documentation |
| --- | --- | --- | --- |
| Widget-specific input behavior | Input declarations and parameter descriptions | Input components and conversion | Individual widget reference |
| Common label/box decoration | Shared attribute vocabulary and labledBox declaration | WidgetLabel and explicit container | Dedicated labledBox reference |
| Field arrangement | formlet declaration and defaults | Formlet layout and shared policy resolution | Dedicated formlet reference |
| Validation | Shared validate_* configuration vocabulary | Field validation and Validator | Shared validation guide/reference |
| Form ownership | form declaration | FormService, FormController, baseline/save adapter | Dedicated form reference |
| General layout | Container declarations | Layout collection | Layout widget references |
| Recipe lifecycle and assembly | GramlotBuilder, AuthoringNode, WebPage | GramlotBuilder, Application | Authoring/application reference |

Validation is a shared field capability, not a layout widget. Formlet remains
usable without a form. A form owns state and saving but does not choose columns.
Label decoration must not be copied into every input implementation or manual.
Keep editor conversion, normalization, user-data validation and declaration
validation distinct while presenting a simple flow to the user.

## Proposed module direction

Keep Python and JavaScript in their current language roots; match responsibility
names rather than requiring identical file trees or one directory per widget.
Do not move all files merely to erase the historical dom/pages names.

A possible Python structure is collections/inputs.py, decoration.py, layout.py
and forms.py for declaration groups, plus shared attribute descriptions grouped
by decoration, field defaults and validation. Keep builder.py as the assembly
and authoring facade entry point. Module paths and composition machinery are
proposals. Do not assume multiple inheritance of compiled Builders classes
merges grammars: the existing foundations audit found a counterexample. Prove
supported composition before extracting declarations, and preserve imports.

On the JS side, retain forms/ as the behavior layer. Extract labledBox/formlet
from general layout only when their boundary is tested; give them clear shared
presentation ownership. Keep widget-label.js and recipe-policies.js shared.
Do not clone their logic into input modules or move validators into layout.
Split inputs.js by input family when behavior warrants it, retaining a collection
entry point. Keep nearby CSS with components where practical; no need to create
three almost-empty Python/JS/CSS files for every widget immediately.

Use one portable contract for names, types, binding acceptance and documentation
when Builders supports it. JS should consume/export equivalent declarations,
not maintain a second hand-written truth. Current schema export is incomplete;
do not claim exhaustive generated references today. Keep manually curated shared
concepts separate from generated parameter tables.

Before collection extraction, address per-instance isolation and collision
policy: _resolveCollections currently writes the merged schema to the constructor
and uses last-wins Object.assign. File organization alone cannot repair that.
Keep core Python server-independent and FastAPI optional.

## Gallery, reference and tutorial have different jobs

Gallery answers “what does this widget do?” Keep direct catalogue navigation.
Individual widget pages show a short purpose, basic working example, specific
options and links to labledBox, formlet, validations and form. Do not repeat
shared mechanics or legacy history. A minimal input example can stand alone;
formlet should be the normal context once multiple fields are arranged.

Dedicated labledBox examples show explicit composition and applying shared
attributes through lbl/box prefixes. Formlet examples show columns, spacing and
inherited defaults. Validation examples show data errors independently of form
saving. Form examples show dirty/valid/pending state and actual memory saving,
not implied database persistence.

For a widget's local progression, allow named variants such as Basic, Specific
options and In a formlet. Do not force every widget to carry identical label,
validation and save lessons. The current one-recipe-per-widget schema needs a
small explicit variant extension; this does not require a gallery redesign.
Each variant must have its own executable Python and JS source and metadata.

Sphinx remains the canonical conceptual/reference manual. The site hosts the
executable illustrations and links to the relevant manual section. The site
build should reuse exact example sources for displayed code; maintained
explanations should not be copied wholesale between the two repositories.
A schema manifest may later supply catalogue metadata, but internal collection
membership must not dictate the public teaching order.

## Owner-selected experimental sequence

This supersedes the earlier suggested contact-example sequence. The objective is
to evaluate Python/JS responsibility boundaries and progressive authoring, not
primarily to deliver a finished data-entry screen.

| Page | Content | Concept introduced |
| --- | --- | --- |
| 1 | One text element | Minimal page/source construction |
| 2 | One standalone widget | Widget-specific declaration and behavior |
| 3 | One widget inside an explicit labledBox | Separate label/container composition |
| 4 | Three widgets with labels | Incorporating shared label/box attributes directly into widgets |
| 5 | Five labeled widgets inside a formlet | Arrangement and centrally declared presentation defaults |

Formlet typically determines label position, box attributes and shared styles
for all its widgets. Page 5 must place these settings on the formlet rather than
repeat them on each child. Preserve explicit per-widget override semantics.
The exact field choices and initial text have not been fixed by this sequence.

Each page must have equivalent executable Python and JavaScript recipes; the
shown source must be the actual executed source. Add only the concepts needed
for its step, explaining shared capabilities at their introduction rather than
repeating them in every widget reference. Keep the catalogue available for all
eleven inputs; these experimental pages provide a separate progressive path.

Validation and form remain in the expanded first-phase scope. Their subsequent
experimental pages are not yet specified. Do not replace the five-page sequence
with a contact form or introduce live-update instruction ahead of it merely
because earlier tutorial examples already exist.

Do not show proposed attribute names as executable until the corresponding
runtime is ready. Legacy differences remain in the internal register, not in
individual widget lessons.

## Bounded next work and checks

1. Finish the common contract inventory and approved naming migration, preserving
   explicit null/default corrections and legacy behavior elsewhere.
2. Verify collection isolation/composition and form activation through the real
   Gramlot entry points. Establish these before a structural extraction.
3. Implement a vertical textBox + labledBox + formlet slice, with shared reference
   material and a few gallery variants. Do not reorganize every widget first.
4. Add validation and form tutorial steps using existing form services. Complete
   public documentation from verified behavior, not an aspirational catalogue.

For each slice, check Python/JS Source and behavior parity, installed wheel asset
resolution, existing gallery consumers, label identity/focus and relevant form
save/validation regressions. Module moves must update packaging manifests and
site runtime mappings where affected. Use a local preview wheel for unpublished
changes; no dependency-pin change, deployment or publication is implied.

This analysis changed only maintained development/context documentation in
Gramlot. No modules or site files were moved or edited, and no new test run was
needed for this documentation-only analysis. The earlier 43 label/form checks
remain evidence for their own checkpoint, not verification of this proposed
organization.
