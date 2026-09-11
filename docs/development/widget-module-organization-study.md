# Widget module organization study

Date: 2026-09-10. This is an architecture proposal for owner review. It does
not authorize runtime changes, public API changes, dependency patches, asset
publication or file moves.

## Outcome

Keep the existing Python and JavaScript roots and give them parallel
responsibility boundaries. On Python, assemble plain declaration mixins into
the single public `GramlotBuilder`. On JavaScript, retain the existing
collection entry points and IDs while extracting runtime behavior by input and
layout family when a concrete slice needs it. Keep CSS with the behavior that
uses it unless it becomes a truly shared theme resource.

This structure fits the two languages' different jobs: Python declares the
portable authoring grammar, while JavaScript owns DOM behavior and lifecycle.
Putting Python, JavaScript and CSS for each widget in one physical directory
would look symmetric but would mix build systems, make Python package and
browser asset boundaries less clear, and create many nearly empty triplets for
thin widgets. Parallel responsibility names provide navigation without that
false equivalence.

The first implementation slice should prove this organization with `textBox`,
shared decoration and conformance gates. It should not reorganize every widget
or change the public collection IDs first.

## Constraints and accepted decisions

The organization must preserve the compatibility baseline in the
[textBox contract proposal](textbox-contract-proposal.md) and
[legacy differences register](../context/legacy-differences.md):

- retain `^` reactive and `=` passive pointer syntax and current Source
  representation; do not add `bind`, `read` or `literal` helpers;
- retain `default`, `default_value` and `default_<attribute>` while their exact
  precedence remains compatibility work;
- do not restrict `dtype` to text-only values without a separate decision;
- keep `formlet` a layout usable without a form;
- keep the intentional `labledBox` spelling and use the same decoration
  mechanism as `lbl` wrapping;
- separate label, box and field styles;
- apply inherited defaults while preserving explicit child values;
- update reactive label/layout presentation without replacing the focused
  field or losing its identity;
- use `lbl_position` for decoration and `label_position` for explicit
  `labledBox`, with `L/R/TL/TC/TR/BL/BC/BR`; the former `lbl_side`/`side`
  placement names are not aliases;
- treat the final `live` versus `liveUpdate` name and the relationship to
  `intermediateChanges`/`updateOn` as unresolved.

Legacy compatibility is the default policy except for recorded owner changes.
The naming and type choices above are not incidental module-design decisions.

## Verified current structure

Python declarations now live in coherent plain mixins under
[`src/gramlot/grammar/`](../../src/gramlot/grammar/), assembled by the single
public `GramlotBuilder`. The input mixin declares eleven inputs in the `inputs`
collection, including the dedicated multiline `textBoxArea`; `colorpicker`
remains in its own collection. Layout, decoration, forms and intentional native
HTML overrides have separate declaration modules. The
`div` override admits Gramlot custom children. The current `details` override
restricts the installed HTML grammar (`summary[0:1]` plus flow content) to
`summary,div` and loses the summary cardinality; it requires compatibility
review rather than being presumed an indispensable extension.

The installed public Builders implementation supports a useful local
composition path. A focused 2026-09-10 probe assembled two such mixins with
`HtmlBuilder` and successfully nested one declared test element under the other.
`_pop_decorated_methods` in
`genro_builders/builder/_utilities.py` (lines 336-384 in the inspected
installation) scans
decorated methods on **non-BuilderBase** mixins, keeps those methods available,
and gives class definitions priority before MRO order. Therefore plain
declaration mixins plus one compiled `GramlotBuilder` are supported without an
upstream change. This is different from multiple inheritance of independently
compiled Builder subclasses: the current schema initialization copies only the
first Builder subclass schema, so it is not a grammar merge mechanism.
`include_components` is per instance and limited to `@component` methods; it is
not a replacement for collection declarations.

On JavaScript, [`collections/inputs.js`](../../js/dom/src/collections/inputs.js)
contains grammar, components and styles for `textBox`, `textBoxArea`, `filteringSelect`,
`comboBox`, `passwordbox`, `numberTextBox`, `dateTextBox`, `timeTextBox`,
`horizontalSlider`, `verticalSlider` and `checkbox`. `colorpicker` is a
separate collection. [`collections/layout.js`](../../js/dom/src/collections/layout.js)
contains `formlet`, `labledBox`, `panel`, `box`, `borderContainer`,
`tabContainer`, `stackContainer`, `contentPane`, `stackButtons` and `tab`.
[`collections/forms.js`](../../js/dom/src/collections/forms.js) separately
registers `form` and its `gnr-form` component.

The Pages builder statically imports and requires `inputs`, `layout`, `forms`,
`colorpicker`, `storeTree`, `palette` and `clipboard`. The progressive examples
exercise the forms collection through that normal entry point in both
Python/TYTX and direct JavaScript. [`application.js`](../../js/dom/src/application.js)
still imports and constructs `FormService` and `Validator` eagerly; future
capability loading remains a separate design question.

The present collection lifecycle has five distinct events:

1. a browser module is downloaded and evaluated through a static import;
2. `registerCollection(name, spec)` stores its descriptor in the global
   registry;
3. a builder selects a collection and `_resolveCollections()` merges grammar;
4. the collection's `defineComponents()` registers custom elements;
5. Source rendering creates component instances.

Current "lazy" behavior only delays step 4. It does not dynamically download a
module. True lazy loading would require an async module resolver, a resource
map, error/retry behavior and an async-safe builder lifecycle; none exists yet.

There are also correctness constraints that file moves cannot solve:

- `_resolveComponents()` and `_resolveCollections()` both mutate the builder
  constructor's `_classSchema`; `schemaTagNames` caches constructor
  `_tagNames`. Builders with different enabled components or collections can
  therefore affect each other. Both schema and tag-name caches need
  instance-owned snapshots or immutable derived values.
- Collection grammar currently merges with last-wins object assignment.
  Accidental duplicate tags are silent.
- `_copyImportedSource()` validates the tag but copies attributes directly and
  lets incoming `_meta` override schema `_meta`; it bypasses `setChild`.
  Inspector Source edits likewise bypass initial recipe creation checks.
- `scripts/prepare_assets.py` and `hatch_build.py` explicitly include
  `src/gramlot/builder.py`, `inspector.py` and `transport.py` in provenance
  inputs. New Python declaration modules require updates in both places, or an
  accepted switch to a vetted recursive grammar-source inventory. JavaScript
  sources under the existing DOM/Pages roots are already copied recursively.

## Inventory and ownership

The target groups thin variants with the behavior they actually share. A group
is a conceptual ownership boundary, not a promise of one file per widget.

| Family | Current public tags | Target responsibility |
| --- | --- | --- |
| Text | `textBox`, `textBoxArea`, `passwordbox` | single/multiline editing, commit policy, text filters; password remains a thin specialization |
| Numeric/temporal | `numberTextBox`, `dateTextBox`, `timeTextBox` | conversion, display and typed constraints, preserving per-type behavior |
| Selection | `comboBox`, `filteringSelect` | option/query behavior and selection identity; filteringSelect specializes comboBox |
| Checkbox | `checkbox` | checked/null/caption semantics over the common input base |
| Range | `horizontalSlider`, `verticalSlider` | range and commit behavior; vertical slider specializes horizontal behavior |
| Color | `colorpicker` | color value UI while reusing common field, null and decoration services |
| Decoration | implicit `lbl` wrapper, explicit `labledBox` | label element, label/box style routing, positions and reactive presentation |
| Formlet | `formlet` | field arrangement and inherited presentation defaults, standalone from forms |
| Basic layout | `panel`, `box` | generic layout surfaces |
| Border layout | `borderContainer`, `contentPane` | region layout and pane lifecycle |
| Switching layout | `tabContainer`, `tab`, `stackContainer`, `stackButtons` | selection, visibility, focus and disposal across panes |
| Floating layout | `palette` | separately activated movable/resizable container used by the inspector |
| Form | `form` | field membership, state, validation coordination and save lifecycle |

Cross-cutting services have one owner:

| Concern | Owner | Used by |
| --- | --- | --- |
| Pointer parsing and Source updates | core Source/builder layer | every bound widget and reactive layout value |
| Null/default initialization | common field policy | all inputs; forms observe outcomes |
| Label/box construction and styles | decoration | inputs, `labledBox`, decorated layout children |
| Field styles | each field family plus shared input base | input controls only |
| Inherited recipe defaults | recipe policy layer | formlet and other containers that expose defaults |
| Value conversion | input family | validator and form receive normalized outcomes |
| Validation | validator/field layer | standalone fields and forms |
| Dirty state and save | forms | forms only |

Decoration does not depend on inputs: `labledBox` and layouts also use it.
Formlet does not depend on forms. Forms may coordinate registered fields, but a
field and its validation must remain usable outside a form.

## Options considered

### 1. Keep the current monoliths

Leave `builder.py`, `inputs.js` and `layout.js` as the main ownership units.
This has the lowest immediate churn and no packaging changes. It keeps unrelated
input behavior, grammar, CSS and tests coupled; it also gives no clear home for
portable declarations, shared decoration or family-specific documentation.
The growing files make textBox changes appear local when their label/default/
form consequences are not. This is suitable as a temporary baseline, not the
target organization.

### 2. Co-locate Python, JavaScript and CSS by feature

Create feature directories that contain their Python declarations, JavaScript
components and optional styles, with common modules shared across features.
This is viable and gives excellent locality when one team changes a complete
feature. Gramlot does not build the two languages through one module system,
however: Python imports/wheels and browser assets still need separate discovery,
manifests and tooling inside every feature directory. Thin widget variants
would also sit beside language-specific infrastructure they do not use, while
decoration and form services cross several features. The added build and
packaging rules outweigh feature locality for this repository; this is a real
alternative, but not the recommendation.

### 3. Parallel responsibility modules in the current language roots

Keep Python grammar under `src/gramlot`, browser behavior under `js/dom/src`,
and stable JS collection facades under `collections/`. Mirror responsibility
names such as inputs, decoration, layout and forms, while allowing language-
appropriate internal grouping. This uses the verified pure-mixin extension
point, preserves browser import boundaries and groups thin components by real
behavior. It also permits incremental extraction behind current public imports.
This is the recommended option.

## Proposed target tree

The tree shows end-state ownership. A directory should be created only when its
first implementation slice needs it.

```text
src/gramlot/
  builder.py                    # public facade, assembly, AuthoringNode
  grammar/
    __init__.py
    native_html.py              # div/details overrides under compatibility review
    inputs.py                   # plain input declaration mixin(s)
    decoration.py               # labledBox declaration
    layout.py                   # formlet and layout declarations
    forms.py                    # sole form declaration/HTML override owner
    shared/
      decoration.py             # label/box attributes and reference text
      field.py                  # binding, null/default and field attributes
      validation.py             # validation configuration vocabulary
      html.py                   # inherited HTML vocabulary/override provenance

js/dom/src/
  collections/
    inputs.js                   # stable inputs registration/grammar facade
    colorpicker.js              # stable colorpicker collection facade
    layout.js                   # stable layout registration/grammar facade
    forms.js                    # explicit forms registration/grammar facade
    palette.js                  # retain separate palette collection facade
    input/
      base.js                   # common field/null/decoration integration
      text.js                   # textBox, passwordbox
      typed.js                  # number/date/time
      selection.js              # comboBox, filteringSelect
      checkbox.js               # checkbox-specific behavior
      range.js                  # horizontal/vertical sliders
      color.js                  # colorpicker behavior, used by its facade
    decoration/
      widget-label.js
      labled-box.js
    layout/
      formlet.js
      basic.js                  # panel, box
      border.js                 # borderContainer, contentPane
      switching.js              # tabs and stacks
    form/
      element.js
  forms/                        # existing field/validator/controller/save services
```

`GramlotBuilder` would inherit the plain declaration mixins and `HtmlBuilder`,
then Builders would compile one schema. The mixins are not separately usable
Builder classes. Assembly must define one owner for every method; because the
supported MRO scan gives the first occurrence priority, a preflight test should
fail on undeclared duplicate method names instead of relying on ordering.

Collection entry points keep the public IDs `inputs`, `colorpicker`, `layout`,
`forms` and the separate `palette`. Splitting behavior does not itself create
new collections or new download boundaries. Styles remain in their family
module initially. Extract a shared style module only for tokens actually shared
by two families.

The `grammar/shared/` files are the proposed target home for shared attribute
definitions and concise reference data. Declaration mixins consume them; an
upstream Builders exporter hook would serialize their supported schema fields
into a generated package resource for the JavaScript grammar checks and the
documentation generator. The generated resource must have provenance and must
not be hand-edited. Until that exporter hook exists, these modules may centralize
Python declaration data, but JS and documentation remain parity-tested consumers
rather than claims of a generated single source of truth.

## Dependency direction

The intended edges are explicit:

```text
Python: GramlotBuilder -> plain declaration mixins -> Builders decorators/schema
        grammar modules -> no JavaScript, form-service or server dependency

JavaScript collection facade -> family grammar + family component definitions
input families -> input base -> Source/pointer + null policy + decoration
layout families -> Source/pointer; decorated layouts -> decoration
labledBox -> decoration
formlet -> recipe/default policy + decoration (never -> forms)
form element -> forms service interface
forms service -> field registry + validator + save adapter
Application -> core builder and, currently, eager forms services
FastAPI adapter -> Gramlot public package; core Gramlot never -> FastAPI
```

`WidgetLabel` belongs to decoration even if it remains at its present path for
the first slice. Moving a file without changing or clarifying these edges has no
architectural value.

## Grammar, composition and validation

The desired source of truth is a portable grammar covering tag names,
attributes, binding acceptance, child rules and reference data. Current
Builders export does not carry a complete attribute contract, while JavaScript
still has a separate permissive grammar. No new private schema format should be
introduced as part of the textBox extraction.

The viable local step is to keep Python declarations and JS grammar visibly
parallel, add structural parity tests, and generate documentation only from
fields that the exporter actually guarantees. A complete portable export needs
an upstream Builders contract for attribute metadata, inheritance, constraints
and provenance. That upstream work is identified but not authorized. If it is
unavailable, an explicitly approved Gramlot adapter is the fallback; it should
not become an accidental second public grammar.

Composition needs two collision categories:

- **Declared native HTML extension/override.** `form`, `div` and `details` are
  current intentional-name overrides. `div` admits Gramlot custom children;
  `details` currently narrows the installed HTML grammar and needs review;
  active `form` also maps runtime rendering to `gnr-form`. Their sole provider,
  expected base tag and compatibility effect must be explicit and tested.
- **Collection or component collision.** Two Gramlot collections defining the
  same tag or custom element should fail unless the consuming builder explicitly
  declares a compatible override. Silent last-wins merging is unsuitable.

The implemented foundation now snapshots the effective schema and tag-name
index per builder instance, so collection and component activation cannot alter
another builder or its class grammar. It deliberately retains the established
resolution order: collections merge in their declared order and a later
collection wins, then local components win. That order is covered by regression
tests and preserves intentional HTML overrides. A stricter rejection policy is
still pending because the repository does not yet classify every supported
override separately from an accidental collision.

An effective builder schema and its tag-name index should be produced per
instance from immutable base data. Component and collection resolution must not
write constructor caches. This covers both `_resolveComponents()` and
`_resolveCollections()`, not only collection merging.

Validation must run at every mutation boundary: Python recipe authoring, direct
JS `setChild`, imported/hydrated Source, component expansion, and inspector
Source insert or update. Hydration must define which transport metadata is
trusted; imported `_meta` must not silently replace protected schema metadata.
Inspector rejection must leave the prior node intact. These are proposed
requirements, not verified current behavior.

Authoring/schema validation remains separate from runtime field validation.
The former checks tag/attribute/child structure and binding-shaped values; the
latter checks normalized user data, reports errors or warnings, and participates
in form validity when a form exists. A form adds dirty/save coordination; it
does not own text conversion or formlet layout.

## Per-widget impact

| Widget/layout | Structural impact | First required regression |
| --- | --- | --- |
| `textBox` | first text-family extraction and explicit contract | Python/JS declaration parity; `^`/`=`; null/default; blur and selected live policy; focus-preserving label updates |
| `passwordbox` | thin text-family specialization | existing value/commit behavior and decoration; avoid exposing unsupported new claims |
| `numberTextBox` | typed family | zero/null/default and conversion on each edit path |
| `dateTextBox` | typed family | null/default and date conversion/round trip |
| `timeTextBox` | typed family | null/default and time conversion/round trip |
| `comboBox` | selection family base | free-text acceptance, option identity, keyboard selection and binding writeback |
| `filteringSelect` | comboBox specialization | identity restricted to valid options, filtering and selected value stability |
| `checkbox` | its own module over the common input base | false versus null, caption/label routing, writeback |
| `horizontalSlider` | range family | range and continuous/final commit behavior |
| `verticalSlider` | slider specialization | orientation plus horizontal behavior parity |
| `colorpicker` | conceptual input behind existing separate collection | null/default, label reuse, unchanged collection activation |
| `formlet` | standalone layout module | outside-form use, columns/gap, inherited defaults and explicit child precedence |
| `labledBox` | decoration module | all approved positions, label/box/field style separation, same mechanism as `lbl` |
| `panel`, `box` | basic-layout family | child rendering, style and disposal parity |
| `borderContainer`, `contentPane` | border family | region sizing, moves and disposal |
| `tabContainer`, `tab` | switching family | selection and focus/identity across reactive changes |
| `stackContainer`, `stackButtons` | switching family | selected pane/button synchronization and disposal |
| `palette` | retain its separate collection and floating-layout ownership | drag, resize, theme, focus and disposal, including inspector use |
| `form` | adjacent forms boundary, not a layout dependency | actual collection activation, field registration, validation/dirty/save |

`codeMirror`, `copyButton` and `storeTree` are adjacent consumers of shared
decoration, selection or lifecycle behavior. They remain in their existing
collection boundaries and outside the first input/layout reorganization; their
inspector and gallery paths still participate in integration regressions.

## Staged path

1. **Freeze observable boundaries.** Add conformance fixtures for current Python
   schema, JS collection registration, Pages collection activation and packaged
   asset provenance. Record the intentional native HTML overrides.
2. **Prove the Python composition mechanism.** In a focused test, assemble two
   plain declaration mixins plus `HtmlBuilder`, including a declared `div`
   extension. Demonstrate that all methods are present and that duplicate
   ownership fails in Gramlot's assembly check. Do not use multiple compiled
   Builder subclasses.
3. **Extract the textBox slice.** Move declarations through an `inputs` plain
   mixin and extract only the JS text family/base pieces needed for textBox.
   Preserve the public builder import and `inputs` collection entry. Implement
   the accepted binding/default/null/position behavior; do not decide dtype,
   default naming or live naming implicitly.
4. **Stabilize shared decoration and formlet.** Give `WidgetLabel`/`labledBox`
   one owner, keep label/box/field styles distinct, and make inherited defaults
   respect explicit child attributes. Verify reactive updates preserve element
   identity and focus. Keep formlet independently loadable and usable.
5. **Extract remaining input families, then layout families.** Move one family
   only with its focused tests. Keep thin variants together and preserve public
   collection IDs. No per-widget file requirement.
6. **Clarify forms activation.** Decide whether Pages should explicitly select
   the forms collection and whether form services should remain eager. True
   dynamic loading is a later design, not a consequence of module splitting.
7. **Adopt portable generated reference data only after its provenance and
   upstream Builders contract are accepted.** Until then, maintain parity tests
   and curated shared-concept documentation.

Any Python grammar split must update both asset provenance implementations and
verify an installed wheel, not only a source checkout.

## Regression gates

| Gate | Required evidence |
| --- | --- |
| Grammar parity | Python and direct-JS examples produce equivalent Source for every input and layout tag; accepted shared attributes remain present |
| Mutation paths | creation, imported JSON/MessagePack hydration, component expansion and inspector Source edits use the same structural rules and roll back failed edits |
| Instance isolation | two builders with different components/collections cannot change each other's schema or tag index |
| Collisions | reviewed `form`/`div`/`details` override effects match their declarations; accidental tag and custom-element duplicates fail deterministically |
| Bindings/defaults | `^` and `=` retain behavior; missing/null/empty/zero/false and both default names match the accepted compatibility baseline across all inputs |
| Decoration | every approved position works; inherited defaults lose to explicit child values; reactive label/layout updates preserve control identity and focus |
| Layout | formlet passes outside and inside a form; all basic, border and switching layouts preserve state, focus and disposal behavior |
| Forms | the real Pages entry path either activates `forms` explicitly or reports it unavailable; validation, pending, dirty, save and restore remain correct |
| Inspector/gallery | embedded and floating inspector edits work; accepted gallery recipes and Python/JS source pairs remain runnable |
| Packaging | source checkout and built wheel expose the same grammar/assets; provenance includes every new Python declaration source; core import stays server-independent |

## Unverified assumptions

The following structural assumptions remain unverified: the focused pure-mixin
probe does not establish collision or complete signature-export behavior; the
proposed family splits have not yet proved that every private import remains
stable; and no true dynamic loader design exists. The exact shared attribute
catalogue, default precedence and dtype conversion behavior remain compatibility
work rather than facts inferred from the target tree.

## Owner decisions needed

1. Select `live` or `liveUpdate`, and settle how the chosen name relates to
   `intermediateChanges` and existing `updateOn`, before the textBox behavior
   slice publishes examples.
2. Confirm that public collection IDs remain `inputs`, `colorpicker`, `layout`,
   `forms` and `palette` while files split internally. This study recommends
   retaining them for compatibility and incremental delivery.
3. `forms` is now part of normal Pages builder activation. Whether form services
   should eventually become capability-loaded remains deferred until there is a
   real async loading design.
4. For portable grammar, approve either an upstream Builders extension or a
   deliberately private Gramlot bridge if upstream work cannot proceed. This
   study recommends parity tests first and an upstream contract before creating
   a new representation.

The `default`/`default_value` relationship and `dtype` restrictions remain
unapproved compatibility questions. They must stay visible in the textBox
contract but do not block choosing the module organization.

## Sources

- [Context index and decisions](../context/README.md)
- [Legacy differences](../context/legacy-differences.md)
- [Gramlot Builder audit](grammar-foundations-audit.md)
- [textBox legacy audit](textbox-legacy-audit.md)
- [Label decoration audit](label-decoration-audit.md)
- [Modules/gallery learning analysis](module-gallery-learning-organization.md)
- [Inspector/gallery handoff](handoff-inspector-gallery-2026-09-09.md)
- [`src/gramlot/builder.py`](../../src/gramlot/builder.py)
- [`js/dom/src/builder-base.js`](../../js/dom/src/builder-base.js)
- [`js/dom/src/collections.js`](../../js/dom/src/collections.js)
- [`js/pages/src/builder.js`](../../js/pages/src/builder.js)
- [`scripts/prepare_assets.py`](../../scripts/prepare_assets.py)
- [`hatch_build.py`](../../hatch_build.py)
