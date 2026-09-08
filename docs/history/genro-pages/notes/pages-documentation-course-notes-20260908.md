# Pages documentation — course-inspired outline

Version: 0.1 · Updated: 2026-09-08 · Status: 🔴 DA REVISIONARE

## Purpose and evidence

The owner supplied the [Genropy base course](https://docs.genropy.org/corso_genropy/index.html)
as a second source of inspiration for examples and future Pages documentation.
This proposal complements the legacy gallery survey in
`temp/legacy-gallery-reference-2026-09-08/`. It is not an approved publishing plan.

This is a selective reading of the course index and core chapters, not a complete
recipe/screenshot inventory or an execution audit. Anagrams and Dygraph pages
could not be retrieved during this pass; their titles alone are not evidence of
implementation details. Existing gallery screenshots remain separate evidence.

The course's [datastore chapter](https://docs.genropy.org/corso_genropy/datastore.html)
progresses from shared text to bound presentation properties and includes an
editable inspector scoped to the example. For Pages, use the running example's
Data and Source editor to connect observable changes with their declarations.

The [relative paths chapter](https://docs.genropy.org/corso_genropy/relative_path.html)
shows repeated configurable blocks with independent data, followed by a variant
whose padding and font size are shared. This is a particularly useful Rosetta
candidate: reuse becomes visible through independent and coordinated interaction.

The [Source and Data chapter](https://docs.genropy.org/corso_genropy/source_and_data.html)
explains the two stores, change propagation, origin-based anti-echo, and relative
source-node context. Adapt the conceptual explanation to Pages' actual runtime
and typed transport; do not copy legacy XML startup or global APIs as current facts.

## One collection of executable examples, several reading paths

| Surface | Reader's question | Content |
| --- | --- | --- |
| Tutorial | How do I learn this by doing? | Ordered small steps, runnable recipe, one exercise, expected result |
| Manual / conceptual guide | How does this system behave? | Source/Data/DOM relationship, scope, types, commit events, lifecycle, hosting boundaries |
| Reference | What exactly does this API accept and do? | Parameters, types, defaults, binding support, ownership, events, errors and executable examples |
| Gallery / Rosetta | What can I build, and how is it expressed elsewhere? | Results and real recipe code, with fair React/Vue comparisons where useful |

Use stable example identifiers across these surfaces. Show the same executed
recipe, tests and documented result state instead of maintaining separate copies.
Rosetta remains a comparative reading path; learning Pages should not require
learning React or Vue. Python and JavaScript authoring should have equivalent
examples when supported, with hosting/bootstrap details linked separately.

## Proposed learning sequence and candidate exercises

1. Static text, ordinary HTML and a styled container.
2. A widget with lbl/lbl_*/box_* and a readonly counterpart.
3. One editable value and several readers; inspect Data before and after commit.
4. Binding text, color, size, background and spacing; inspect Source attributes.
5. Initial values and defaults: distinguish missing, null, empty string, zero and
   false. Document only the contract actually implemented in the selected release.
6. Extract a reusable recipe fragment; create independent instances using relative paths.
7. Combine local state and shared state: independent text/color, common size/padding.
8. A simple calculation with a readonly result, then groups of subtotals.
9. Reusable RGB controls and derived presentation values.
10. Buttons, event context, conditional reactions and scheduled work.
11. Layout containers, selection and dynamic content; lifecycle cleanup.
12. Optional host integration and remote requests using a small common backend.

The [formula chapter](https://docs.genropy.org/corso_genropy/dataformula.html)
provides three useful candidates: triangle area, personal balance, and colorMaker.
Start with the area calculation before grouped totals and RGB composition.
Readonly numeric formatting is a proposed follow-on exercise; native
input[type=number] is not evidence of localized formatting support in Pages.

The [dice example](https://docs.genropy.org/corso_genropy/diceroller.html)
suggests a later exercise on press/release, repeated updates and multiple instances.
Use a reproducible seed for screenshots and test timer cleanup. Keep its shared
variant outside the first scope.

## Documentation depth

Each tutorial page should give the objective, runnable result, actual recipe,
short explanation of the new concept, an inspector experiment and a reference link.
Detailed parameter descriptions belong in the reference. Framework familiarity
may be assumed where explicitly stated; an introduction need not explain every
line of Python or JavaScript.

Reference entries must distinguish ordinary HTML attrs, widget attrs, lbl_* and
box_*, state values and formatted output. Include readonly vs disabled, commit
on focus loss vs continuous input, accepted units and unsupported combinations.
Link each claimed behavior to a tested example and an applicable runtime version.
Code-generated signatures can seed entries; semantics and lifecycle require prose
and behavioral evidence.

## Scope and next concrete slice

Keep database adapters, Genropy project/package/site architecture and Shared
Objects outside the initial Pages learning path. Server hosting should be a
separate optional section, consistent with standalone DOM and reusable Pages.

First draft one complete tutorial unit: an editable text and color, a labelled
readonly result, and a guided Data/Source inspector exercise. Attach a compact
reference entry for its binding and decoration parameters. Use this unit to settle
the editorial format before expanding into a full manual.

Before adopting later examples, record: source URL, learning objective, Pages
prerequisites, implemented/missing behavior, Python/JS variants, Rosetta relevance,
verification interaction, and screenshot state. A legacy recipe is inspiration,
not an assertion that its API already exists in Pages.


## Reader bridges from React and Vue

Owner direction (2026-09-08): add contextual callout boxes titled "Coming from
React" and "Coming from Vue" to help readers connect familiar concepts with Pages.
These are optional aids within the tutorial/manual, not prerequisites or separate
courses. The main explanation must remain understandable without either framework.

Place a box beside the first relevant concept. Keep it short: the familiar concept,
the Pages mechanism serving a similar purpose, and the significant difference.
Use a tiny pair of snippets only when it clarifies behavior; link to the full
Rosetta example for executable comparison. Avoid simplistic equivalence tables
that imply identical ownership, reactivity or lifecycle semantics.

Candidate locations (editorial topics, not verified API equivalences):

- State and binding: explain how a Pages Data path connects controls and readers;
  contrast the mechanisms used by the corresponding React/Vue example.
- Derived values: distinguish a value calculated for rendering from a computation
  that writes a result into the Pages datastore.
- Reusable fragments and relative paths: show independent instances and shared
  values without assuming recipe helpers have component lifecycle semantics.
- Events and input commit: make focus-out versus continuous updates explicit.
- Source and Data: explain why Pages exposes an editable source tree as well as
  application data, using an inspector exercise.
- Cleanup: connect ownership of subscriptions and timers with the lifetime of
  the page or source node; avoid declaring a one-to-one lifecycle API mapping.

Each callout should use the idiomatic React/Vue implementation already verified
in Rosetta, current official documentation and the actual Pages contract. Readers
must be able to skip the boxes without losing the tutorial's reasoning. Reference
entries may link to these explanations instead of repeating them for every API.
