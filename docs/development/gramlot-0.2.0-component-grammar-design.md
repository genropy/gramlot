# Gramlot 0.2.0: component contracts and composed grammars

Design for owner review · 2026-09-12

Status: detailed proposal, not an approved API or implementation plan in execution.
This is step 1 of the 0.2.0 beta consolidation. Phase A is design; phase B is an
isolated worktree experiment after review. Completion of this step does not by
itself qualify the whole framework as beta. No release, consumer migration,
Builders modification or worktree creation is authorized by this document.

## Prerequisite added by the owner: dataRpc, remote and server requirements

Owner correction, 2026-09-12, after review of the first design: examine dataRpc
and remote before proceeding with the component manifesto. Usable server
communication is a foundation of the target framework, and components that
require a server must have their required services available. The later standalone
clarification permits configured external services; the blanket prohibition is
superseded. This prerequisite takes precedence over the earlier sequence below.

First compatibility baseline: [legacy dataRpc and serverCall audit](datarpc-servercall-legacy-audit-2026-09-12.md).
It also traces callable method serialization, previously left unresolved.

Initial source inspection confirms that HTTP communication already exists through
urlResolver/openApiResolver and the OpenAPI client. These are not an implemented
dataRpc/page-method contract or remote server-built Source. The current FastAPI
adapter registers initial document and recipe routes; no general RPC or remote
fragment dispatcher was found in the inspected active sources. Historical
logical-block plans are design input, not completed server support.

Before freezing the manifest, design three separate contracts:

1. dataRpc: invoke an explicitly exposed service, pass a snapshot of typed
   parameters, handle success/error and optionally publish a Data result.
2. remote: configure an existing container to receive server-built Source,
   including component requirements, scope, preparation, replacement and disposal.
3. Component/server dependency: declare the services/capabilities a component
   requires, with input/output and context requirements, resolved by the host.

Recommendation, not yet an approved schema: express named required capabilities,
not just a serverRequired boolean. A component declares its communication needs;
a shared Gramlot service client and host adapter implement transport and exposure.
Do not create bespoke networking in every widget. Derived components inherit
requirements and overrides must account for changed requirements. The effective
application contract computes transitive requirements and checks host provision.

Standalone pages must reject selected components with unsatisfied server
requirements during construction/export where known, and before activation for
late-loaded Source. Do not silently substitute mock services or remove behavior.
Serving a page through HTTP does not establish that the required application
services exist. Standalone packaging does not prohibit configured remote services;
a hosted Gramlot service for standalone applications is parked for later design.

Open questions for this prerequisite: service reference/exposure syntax; typed
arguments/results/errors; read versus mutation concurrency; remote Source ownership
and failure behavior; app/request/page identity; authentication and authorization
owned by the host; where a collection supplies optional Python service code; and
how manifests describe requirements without embedding deployment URLs or exposing
arbitrary Python methods. Review these before selecting extension activation APIs.

Evidence: [server-services audit](data-services-design-audit.md),
[logical-block plan](logical-blocks-plan.md),
[HTTP resolvers](../guides/http-resolvers.md), and current
`src/gramlot/grammar/resolvers.py` / `src/gramlot/contrib/fastapi/application.py`.

## Development starting point — 2026-09-12

The owner selected a main/develop cycle. Existing work was consolidated locally
on main at c5a5b37; develop starts there and retains this design and the RPC audit.
See [branch policy](branch-policy.md) and [verification checkpoint](consolidation-checkpoint-2026-09-12.md).
A later authorized RPC experiment now exists in sibling gramlot-datarpc-poc on
codex/datarpc-poc, with uncommitted code. main subsequently advanced to 07bf835
(source version 0.1.2), merged into develop at dbf6eec. See the
[page services plan](page-services-design-2026-09-12.md) for current evidence.
Component-manifest choices remain unfinalized.

The agreed first RPC PoC compares triangle area computed by local dataFormula
with the same calculation performed by a Python method through dataRpc. Both use
the same base/height inputs. The RPC variant requires server services; the local
variant can run standalone. This selects the example, not a completed RPC API.

The result type is automatic from TYTX; no _result_dtype is required for this
initial contract. The adapter serializes the ordinary Python result, the browser
decodes it and assigns the typed value to Data. Numbers, including Decimal when
returned, are valid results alongside text and Bag. JSON/dict/list conversion to
Bag remains an explicit unresolved boundary. A numeric triangle result does not
require resolving that conversion before experimentation.

## Approved method roles — 2026-09-12

The owner selected `@endpoint` for Data-producing methods and `@source` for
Source-building methods. `main(self, root)` is implicitly @source; additional
remotely callable methods need an explicit decorator. Initial main content and
container remote share the Source contract. The existing experimental metadata
marker has not yet been migrated. See the
[decision register](../context/decisions.md#data-endpoints-and-remote-source--owner-decision-2026-09-12).

## Approved inheritance and state clarification — 2026-09-12

Library mixins and the base page may supply standard @endpoint/@source methods.
Normal Python MRO selects implementations and super() composes them. Unchanged
inherited methods keep their markers; a new override must be decorated again.
An undecorated override is unexposed, except for implicit Source main. This is the
owner's final correction, superseding the earlier inherited-role-on-override note.
A Page is stateless; shared state belongs in a separate dictionary-of-Bags store,
held exclusively throughout each read/write operation. Exact scope, API and async
integration remain open. The browser application should be ready before main
content arrives. See the [page services design and plan](page-services-design-2026-09-12.md)
for contracts, review questions and the preserved RPC experiment's actual limits.

## 1. Objective and owner decisions

Make a component's explicit description the shared contract for Python authoring,
JavaScript runtime selection, grammar validation and generated documentation.
A component may provide a visual element, a nonvisual declaration, a JavaScript
class or a function/module capability. It need not inherit HTMLElement or render DOM.

Recorded in the current conversation:

- GramlotBuilder continues to derive from HTML5 authoring.
- Additional grammar may come from several JSON documents composed during Python
  subclass initialization, alongside inherited declarations.
- Component collections produce `gramlot_grammar_<collection>.json`; an aggregate
  `gramlot_grammar.json` describes available components, parameters, documentation
  and constraints such as permitted children.
- Developers and individual applications can supply new, derived and overriding
  components.
- JavaScript behavior can be introduced into a working context. `pane.import(class)`
  and `genro.extensions.alfa` express possible usage, not settled syntax or scope.
- Design precedes experimentation in a dedicated worktree. Existing dirty work
  must remain intact. Questions should be collected for review unless blocking.

All field names, type algebra, lifecycle names, algorithms and API examples below
are recommendations. They are not additional owner decisions.

## 2. Current implementation: evidence and gaps

Inspected locally against installed genro-builders 0.23.2 on 2026-09-12.
The version identifies the inspected environment, not a query of the latest release.
No runtime or distribution tests were rerun for this design.

| Area | Observed implementation | Consequence for this design |
| --- | --- | --- |
| Python builder | `src/gramlot/builder.py` combines generated declaration mixins with HtmlBuilder; AuthoringNode retains logic, resource, resolver and grid helpers | Preserve facade, Source identity, helper semantics and HTML inheritance; avoid a replacement builder |
| Catalog | `js/dom/src/components/builtin-components.json` carries recipe/tag identity, subTags, capabilities and selected metadata | Useful migration input, not a full parameter/documentation contract |
| Generation | `scripts/generate_components.py` creates JS catalog and five Python declaration families using `@element` and open `**kwargs` | Existing generation can be reused as a transition, but is not JSON-native subclass composition |
| JS registration | `components/registry.js` requires a custom-element tag and a defineComponents callback | Does not yet model plain class/function contributions |
| Collection composition | `builder-base.js` copies class schema into each instance; `_resolveCollections()` merges into that instance using Object.assign | Earlier audit claim of class mutation is superseded; silent last-wins composition still needs replacement |
| Registries | `collections.js` and component descriptions use module-level Maps | App selection, global implementation registration and instance ownership must be separated |
| Python generic compilation | Builders `builder/base.py:__init_subclass__` copies the first inherited class schema, consumes decorated declarations, then builds indexes/validation metadata | Multiple independently compiled schemas are not automatically a supported merge API |
| Generic export | Builders `_grammar_export.py:_element_form` emits `attributes: None` | Current exported grammar cannot supply complete parameter validation or documentation |
| Existing validation | Generated widget declarations intentionally accept arbitrary kwargs; browser field/form validation handles application values | Closing all attributes immediately would break existing authoring and is not authorized |
| Application context | `application.js` creates app-owned topics, resolvers, recipe runtime, validator and forms | Extend existing ownership/services instead of creating parallel app state machinery |

Relevant evidence:

- [Builder architectural basis](../context/gramlot-builder.md)
- [Component alpha and its limits](component-alpha-implementation-2026-09-11.md)
- [Grammar foundations audit](grammar-foundations-audit.md), with the isolation correction above
- [Component tests](../../tests/test_component_alpha.py)
- [Legacy differences](../context/legacy-differences.md), read with subsequent owner corrections
- [Workspace policy](../context/workspace-map.md), whose historical checkout statuses are not current instructions

A public Python JSON ingestion/compilation hook has not been established by this
inspection. The presence of to_grammar is evidence of export, not proof of an
inverse loader. Phase B must prove a supported integration path before migration.

## 3. Boundaries and deliverables

Phase A delivers this architecture, a decision queue, an experiment plan and
acceptance criteria. Phase B delivers a small executable proof and its measured
findings, including failures and corrections to this design.

In scope: explicit descriptions, schema composition, framework/developer/app
layers, selected runtime implementations, construction validation, documentation,
provenance, extension lifecycle and distribution requirements of these mechanisms.

Out of scope: rewriting all widgets, completing HTML documentation, new menus,
remote stores, RPC protocols, formal LOT semantics, visual builder, plugin
marketplace, arbitrary package discovery, live replacement of running components,
consumer migration and publication. Existing field validation is integrated at
its boundary, not rewritten as an incidental consequence of grammar work.

## 4. Separate the artifacts

| Artifact | Purpose | Includes executable code? |
| --- | --- | --- |
| Component description | Author-maintained declaration of one contribution and its implementation reference | JSON-compatible data only |
| Collection grammar | Versioned export of a collection's descriptions and dependencies | References to packaged modules/exports |
| Distribution catalog (`gramlot_grammar.json`) | Inventory of components shipped by a specific distribution, with qualified identities | No |
| Effective application contract | Resolved selection, inheritance, explicit overrides, public recipe aliases and provenance | No |
| Runtime asset manifest | Module/chunk/resource locations, versions and hashes for delivery | References to code bytes |
| Runtime context | Loaded definitions and owned active instances | Yes, in the browser |

The aggregate catalog includes what its declared inputs supply. It cannot mean
all components that exist in unrelated developer packages. An application can
produce its own aggregate from framework, developer and application inputs.
The catalog may contain alternatives; its effective recipe namespace cannot
contain unresolved duplicate names.

Keep grammar schemaVersion, collection release version, framework version and
browser buildId distinct. Record the HTML baseline and all selected collection
versions/digests in the effective contract. A digest checks identity, not quality
or reproducibility by itself.

## 5. Source of truth and extraction

Recommendation: keep the description next to its JS implementation as a pure data
resource. A component module may expose/import that description, but exporting
metadata must not require DOM registration, network access or application startup.
Support description-only JS modules only if extraction is a clearly isolated build
step with deterministic output. Do not infer the full contract from JS execution,
constructor source text, incidental properties or comments.

The preferred initial path is a JSON sidecar consumed by both packaging and the
JS implementation. This advances the existing catalog without requiring Python
to execute JavaScript. The owner should select sidecar versus pure descriptor
module after reviewing developer ergonomics.

The pipeline is:

1. Read explicitly selected collection roots; validate their descriptions.
2. Resolve description inheritance and shared attribute definitions.
3. Emit each collection grammar and the distribution catalog deterministically.
4. Compose an application selection with explicit override declarations.
5. Feed the same normalized contract into Python and JS grammar adapters.
6. Generate reference documentation and optional Python IDE stubs from that contract.
7. Package descriptors and referenced implementations with coherent provenance.

Generated Python code, when used, is a derived adapter or typing aid. It must not
become a second source of parameter defaults or documentation. Python runtime
installation must not require Node or re-extract JS metadata.

## 6. Component model

Use a shared identity/contract envelope with optional contribution facets rather
than forcing all components into a Web Component hierarchy.

| Facet | Example | Contract |
| --- | --- | --- |
| Visual declaration | textBox or a derived note editor | Recipe arguments, binding, children, renderer and resources |
| Nonvisual declaration | A Source-owned extension activation | Arguments, allowed placement, activation and disposal |
| Definition export | A JS class or named function | Module/export identity and documented callable or constructor contract |
| Shared contract | Decoration parameter family | Reusable attributes and documentation, no mandatory executable class |

A collection can contain several facets; a component can expose both a definition
and a declaration that activates it. A plain function must not need a dummy class.
A class export must not be instantiated merely because the catalog mentions it.

Distinguish four identities: qualified component ID, public recipe name, JS
module/export, and custom-element tag where applicable. They may differ.
Example qualified ID: `acme.inputs:moneyTextBox`; the precise separator remains
an implementation choice. Persist provenance even when a public alias is overridden.

### Proposed description fields

| Field group | Content |
| --- | --- |
| Identity | schemaVersion, collection ID/version, component ID, summary, status |
| Dependencies | Required collections and supported versions; implementation resources |
| Inheritance | Explicit base component; shared contract references |
| Recipe | Public name, ordered positional parameters, named parameters, value/content slot, child/parent rules |
| Attributes | Type, nullability, required presence, default semantics, binding modes, constraints, documentation |
| Runtime | Module/export, contribution facet, optional custom-element identity, context requirements |
| Lifecycle | Available activation scope, configuration/update policy, disposal requirements |
| Documentation | Examples, inherited origins, experimental boundaries and supported behavior |

Avoid making current pythonGroup names part of the durable public format: they
are an implementation detail of today's generated Python mixins.

An illustrative fragment, deliberately not a complete or accepted JSON Schema:

```json
{
  "id": "acme.tools:Alfa",
  "summary": "Application-local calculation helper",
  "runtime": {"module": "./alfa.js", "export": "Alfa", "kind": "class"},
  "activation": {"scope": "application", "dispose": "required"},
  "parameters": {
    "precision": {"type": "integer", "required": false,
                  "default": {"kind": "literal", "value": 2}}
  }
}
```

Module references resolve relative to the packaged collection root. No machine
paths, constructor objects or callable Python objects belong in the JSON wire format.
An exporter validates package boundaries and lists external requirements explicitly.

## 7. Composition, inheritance and overrides

Recommended resolution is deterministic and completed before authoring:

1. Load HTML baseline and explicitly chosen collection documents.
2. Validate versions and resolve dependencies; fail on missing or cyclic dependencies.
3. Resolve component inheritance and shared contracts in topological order.
4. Apply developer and application selections and explicit replacements.
5. Validate recipe aliases, parameter signatures, child references and module references.
6. Produce an immutable effective schema plus origin/override trace and digest.

Layer order expresses intended authority: framework, developer, application.
Order alone does not authorize a collision. An override identifies its target
qualified ID and supported version/contract; an accidental duplicate is an error.
Identical repeated dependencies deduplicate, while incompatible versions fail in
the first implementation. Do not introduce a general package solver in this step.

### Three different inheritance relationships

- JS `extends` reuses executable implementation.
- Contract inheritance reuses described parameters, docs and composition rules.
- An override changes the implementation selected for a recipe alias.

None automatically implies the others. Explicitly relate them and test behavior;
metadata cannot prove behavioral substitutability. Recommend a single component
contract base initially, with multiple named shared attribute groups. Conflicting
attribute contributions require explicit resolution, not merge-order luck.

### Proposed merge rules

| Change | Recommended treatment |
| --- | --- |
| New documented optional parameter | Permit in a derived contract |
| Default change | Require an explicit declaration and show it in effective docs |
| Requiredness/type/child restriction change | Report as a contract difference; no claim of transparent compatibility |
| Parameter removal or rename | Explicit breaking change in an application selection; forbidden as a silent framework override |
| Duplicate shared attribute definition | Deduplicate identical definitions; require explicit resolution otherwise |
| Child rule replacement | Explicit replace operation; never ambiguous string concatenation |
| Multiple replacements of the same alias | Fail unless application selection explicitly chooses the winner |

Developer/application customization is allowed to be intentionally incompatible.
Such changes must be visible in diagnostics and app docs, not presented as fully
compatible substitutes. Changes to Gramlot's own public contract still require
owner review under the legacy policy.

### Browser registration boundary

App-local recipe aliases must not depend on redefining an already registered
custom-element tag. Use distinct implementation tags for derived/overriding
visual implementations and resolve recipe alias to render identity per app.
Test two applications in the same document with different overrides. If the
existing global registry/CSS model prevents isolation, surface the gap before
claiming support; an iframe-only test is insufficient evidence.

Do not rely on a scoped custom-element registry as an unverified universal
browser dependency. CSS and shared module mutable state need their own isolation
checks even when tags differ. Definitions can be shared; app state cannot.

## 8. Python integration and subclass initialization

Target: a subclass declares collection resources. Its initialization compiles
HTML inheritance and additional documents into one coherent builder schema.
The class owns its frozen contract; instances own data, Source and runtime state.

Provisional authoring illustration, not a shipped API:

```python
class ApplicationBuilder(GramlotBuilder):
    grammar_sources = (
        "acme_components:gramlot_grammar_inputs.json",
        "my_application:gramlot_grammar_tools.json",
    )
```

Avoid implicit scans or working-directory-relative paths during Python import.
Use explicit package resources or resolved application configuration. Class creation
is synchronous and local; it must not fetch schemas from the network. Report the
source document and component when compilation fails.

Load JSON contributions at the schema compilation seam, before generic validation
and indexes are finalized. Writing directly to `_class_schema` afterwards is not
a sufficient integration: indexes, inherited abstract expansion and call validators
must agree. Do not monkey-patch generic Builders or copy its implementation.

Investigate in this order:

1. Establish whether installed/current agreed Builders offers a public data-schema
   compiler hook usable by Python and decorated declarations alike.
2. If absent, specify a small generic extension: compile a normalized grammar
   contribution using the existing schema/index construction pipeline.
3. Keep Gramlot-specific bindings, runtime metadata and collection resolution in
   Gramlot; generic Builders must not depend on Gramlot or browser semantics.
4. Use generated @element declarations only as a clearly labelled feasibility
   bridge if necessary. That bridge does not complete the requested JSON loader.

Any implementation in the independent Builders repository needs its own explicit
scope. Phase A records the dependency; it does not modify installed packages.

Preserve AuthoringNode's stable wrappers, `.node` and `.store`, generic node.data,
SourceBag/TYTX identity, and browser-only execution of logic. Include name collision
checks against facade methods and Python keywords. Choose a supported alternative
to `pane.import(...)`; both `use(...)` and `importComponent(...)` remain candidates.

Class contracts must not mutate when an application instance activates a component.
If page-specific subsets are needed, derive a stable configured builder class or
select a subset from a prevalidated class contract. Do not silently insert new
Python grammar after a recipe has already been constructed.

## 9. Validation contract

There are five boundaries, not one validator:

| Boundary | Responsibility | When |
| --- | --- | --- |
| Description | Validate schema shape, identifiers and serializable constraints | Export/load |
| Composition | Resolve references, versions, inheritance, overrides and signature conflicts | Class/app compilation |
| Authoring | Validate literal arguments, binding admissibility and Source structure | Python/JS construction and Source import |
| Resolved attribute | Check values delivered by bindings against the component contract | Browser evaluation/update |
| Application data | Field/form business rules, async validation and save barriers | Existing runtime services |

Schema-required presence is distinct from `validate_notnull`. An omitted required
attribute is an authoring error; a bound input can legitimately edit an empty value
that is subsequently invalid for a form. Do not reject form-invalid drafts by
mistaking them for malformed component configuration.

### Portable parameter vocabulary

Start with string, boolean, integer, number, enum, array, object and explicit
unions, plus Gramlot typed-value references (Bag, Decimal, temporal carriers).
Separate nullability from optional presence. Reject unknown type references.
Do not convert Decimal or dates to lossy JSON numbers/strings simply to satisfy
schema validation; their existing transport rules remain authoritative.

For each parameter record allowed input forms: literal, reactive pointer,
passive pointer, inline expression, or a specifically supported behavior reference.
Preserve `^`, `=` and `==` syntax. Named expression dependencies and logical
provider arguments require their own declared open parameter family.

Validate a pointer as a pointer at authoring time, then its resolved value in the
browser. Unresolved paths need an explicit pending/absence policy; do not reject
`^count` as a literal string for an integer field. Preserve missing/null/false/zero
and empty-string distinctions.

Defaults require an explicit category: documentation of a runtime fallback,
literal construction default, or missing-only Data initialization. Initially
preserve existing omission behavior and Data initialization ordering. Do not
insert every documented default into Source or populate Data as a side effect.

### Open attributes and HTML

Inventory native HTML attributes, style declarations, events, aria-/data- attributes,
label/box/field families, logical named inputs and component-specific extension
points before tightening acceptance. A wildcard must specify its purpose and
value contract. Unknown explicit parameters should eventually give useful typo
diagnostics, but the existing `**kwargs` surface is not closed by this proposal.

Use progressive migration: complete and enforce the experimental components;
mark inherited incomplete areas as open and document their coverage. No blanket
strict mode is enabled for all existing recipes. HTML inheritance does not provide
a complete HTML parameter manual; retain namespace/subgrammar distinctions for SVG.

### Children and mutation

Resolve parent and child constraints against qualified component identities and
HTML families, then project to public aliases. Specify intersection of parent
permission and child's parent restriction. Preserve ordering and distinguish
structural children from nonvisual declarations so a logical provider is not
mistaken for a rendered child. Cardinality constraints may require validation at
branch completion rather than rejecting an intermediate construction step.

Apply the same rules to Python building, native JS building, imported TYTX and
supported live Source mutation. Validate before mutation where possible; failure
must preserve the previously valid branch. A failed bound configuration update
should retain the last valid applied configuration and report an error; exact
first-value/invalid-draft handling must be reviewed per component category.

Diagnostics should identify boundary, component ID/version, Source path, parameter,
expected contract, observed value category and descriptor origin. Define stable
error codes for parity tests; avoid including sensitive application values by default.

## 10. Nonvisual JS capabilities and context

Separate loading, definition registration, instantiation and activation.
An import makes code available; it does not inherently start a service.
A configured activation declares ownership and dependencies.

Recommended model for review:

- Runtime loader caches module loading and definition lookup.
- An app-owned extension registry holds selected definitions/active capabilities.
- Application-scoped activation exposes a capability under a chosen name, possibly
  `genro.extensions.alfa`; exact lookup shape remains open.
- Source-scoped activation belongs to the declaring node and is disposed with its
  branch. It must not place every repeated pane instance at the same global key.
- Functions are available as explicit exports or invoked by a declared action;
  classes have explicit construction. No arbitrary code string evaluation is added.

The key question is whether `genro.extensions.alfa` means a definition or an active
instance. Recommend active app capability there, with definition lookup separate.
If the owner prefers definition semantics, choose a separate instance registry
before implementation. Do not silently return either depending on load state.

### Lifecycle state machine

Proposed states: declared → loading → ready → active → disposing → disposed,
with a failed state for load/initialization errors. Definitions without activation
stop at ready. All names and hooks remain provisional.

- Load dependencies before activating dependents; fail cycles before side effects.
- Deduplicate concurrent module loading while keeping instances scope-owned.
- Publish app registry entries only after successful activation.
- On partial failure, dispose successfully created dependencies owned exclusively
  by the failed activation in reverse order; never dispose borrowed app services.
- Removing a Source branch during async loading prevents later activation there.
- Disposal is idempotent and unregisters owned topics, subscriptions and resources.
- Reconnecting a visual element differs from recreating a Source-owned extension;
  document which event ends ownership rather than coupling it to incidental DOM moves.
- Configuration is immutable initially; reject conflicting repeated singleton
  activation. Reactive reconfiguration requires an explicit update contract.
- Replacement of an active class/instance is deferred; overrides are resolved at startup.

Extensions receive only a documented context containing the app coordinator,
relevant Source/Data references and existing service access. Do not introduce
another Data store or event bus. Application-local extension code must not become
a hiding place for imperative UI or fetch bypasses: reusable components/services
implement browser behavior and Python applications declare their use.

## 11. Runtime and Python agreement

The application startup associates its Source with the effective contract identity.
Prefer startup metadata over changing TYTX structural type registration. Verify
that the selected browser runtime understands the contract schema version and
selected component implementations before mounting dependent Source.

A matching digest alone does not prove runtime compatibility. Record supported
runtime contract versions, verify implementation references and run conformance
tests. Reject mismatched contracts explicitly rather than rendering a different
component under the same alias. JS-only authoring uses the same effective contract.

Lazy loading is allowed for known implementations; grammar knowledge precedes
Python construction. Resolve rendering dependencies before dependent widgets mount.
Avoid partially initialized branches and unhandled module failures. Python must
never execute imported JS classes while building or serializing a page.

## 12. Packaging, CI and generated documentation

Framework, developer packages and applications can each ship collection descriptors
and JS resources. A Python package contains pre-exported grammar files; browser-only
consumers receive the same contract in their distribution. Application descriptors
can remain local. No npm/PyPI publication is required to exercise the model.

Extend the existing browser manifest approach with references to selected contract
artifacts; do not conflate grammar and asset schemas. Preserve shared module identity,
lazy resources, licenses and matching ZIP/wheel bytes. External component packages
must declare compatible runtime dependencies and avoid bundling a second Gramlot.

CI gates for this step:

1. Validate descriptions and implementation export inventory.
2. Generate per-collection JSON, aggregate catalog, docs and optional Python stubs
   in a clean directory; compare reproducible outputs.
3. Run a shared positive/negative contract corpus through Python and JS.
4. Exercise app/developer overrides and lifecycle behavior in a real browser.
5. Install a package in a clean Python environment without Node and build its recipe.
6. Serve JS and Python examples using the packaged runtime and matching contracts.
7. Check dependency/version provenance, missing assets, lazy loading and ZIP/wheel parity.

Generated docs show effective and inherited parameters, origin, defaults by category,
binding modes, child rules, extension scope/lifecycle, examples and limitations.
Developer docs show explicit overrides; public widget docs avoid repeating shared
attribute families. Incomplete contracts must be visibly incomplete rather than
filled with invented descriptions.

CI builds and verifies; publishing is a separate tag-controlled action. Preserve
the agreed GitHub Release policy and separate consumer deploys. This step does
not choose beta tag spelling or authorize any registry/CDN publication.

## 13. Phase B worktree experiment

Do not create the worktree until the design review has selected the critical
contracts below. Proposed location: a dedicated sibling under Sviluppo, resolved
at creation time; proposed branch prefix: `codex/`. No Documents/ChatGPT checkout.

Before creation, inventory current tracked/untracked work and choose the exact
base revision. A worktree from HEAD does not contain the current uncommitted bundle,
tutorial or design files. Explicitly identify and copy only agreed inputs with
hash provenance if required; do not stash, reset, stage or commit unrelated work.
Document dependencies and any generated assets required by the experiment.

| Experiment | Concrete proof | Gate |
| --- | --- | --- |
| E1 Generic grammar seam | Equivalent decorated and JSON-defined elements, inherited from HTML; two collection documents | Supported schema/index integration, deterministic roundtrip and no global mutation |
| E2 Contract compilation | Parameters, defaults, binding modes, child constraints and docs from one descriptor | Shared Python/JS fixture results agree; invalid inputs have no partial effects |
| E3 New and derived visual component | Small Python page uses a new control and derived control with shared base behavior | Binding, validation presentation, defaults and generated docs match |
| E4 Application override | Two apps select different implementations for one recipe name in the same document | No tag/registry/CSS/state cross-contamination; overrides traceable |
| E5 Plain class and function | Python declarations use Alfa class plus named function through supported mechanisms | No HTMLElement requirement; definitions distinguished from instances |
| E6 Scope and lifecycle | App singleton plus two repeated pane instances; remove one while loading | Correct isolation, cancellation, exactly-once cleanup and failure reporting |
| E7 Packaged parity | Minimal JS and Python/FastAPI examples consume matching artifact/contracts | Clean installation without Node, lazy resources and manifest checks pass |

Use tiny recipes with literal binding paths and shown source identical to executed
source. Framework JS test fixtures may exercise internals; do not hide application
implementation in large JS support files. Keep experimental component infrastructure
isolated and reusable rather than adding special cases to make the examples pass.

### Acceptance corpus

Cover valid/invalid types, required omission, nullable versus missing, false/zero,
unknown attributes, allowed prefixed families, reactive/passive/inline forms,
parent/child conflicts, incomplete intermediate branches, inheritance cycles,
version conflicts, implicit/explicit collisions, app override precedence,
module/export absence, startup mismatch, duplicate singleton configuration,
async failure and removal, disposal, two apps in one realm, repeated panes,
Source import, live Source edits and unchanged generic HTML behavior.

For each case record input, expected acceptance/error code, expected Source and
runtime behavior. Include typed Bag/Decimal transport and borrowed Data ownership.
Schema tests establish structural guarantees; browser behavior tests establish
implementation conformity. Neither substitutes for the other.

## 14. Sequence, exit criteria and risks

Phase A review order:

1. Source of truth and component facets.
2. Generic Builders integration seam and ownership.
3. Inheritance/override identity and isolation.
4. Validation/default/open-attribute policy.
5. Extension lookup, activation scope and lifecycle.
6. Experiment selection and worktree baseline.

Phase B runs E1 first. If no supported generic seam exists, return with a bounded
Builders proposal rather than concealing a private mutation. E2 follows; E3–E6
prove the component model; E7 validates the installed boundary. No full catalog
migration should begin before those findings are reviewed.

Exit from step 1 requires approved contracts, passing representative experiments,
explicit dependency changes, a reproducible package proof and a migration plan for
the remaining catalog. A rejected experiment is useful evidence, not completion.

| Risk | Mitigation / stop condition |
| --- | --- |
| JSON describes more than Builders enforces | Shared corpus; stop on semantic mismatch instead of generating decorative schema |
| Strict validation breaks legitimate legacy attributes | Inventory families; restrict initial enforcement to complete experimental contracts |
| Catalog becomes another manually synchronized API | One description source; deterministic generation and drift checks |
| Override leaks through global registrations or CSS | Two-app same-document tests and distinct implementation identities |
| Extension becomes a parallel application framework | Reuse app services and Source ownership; review Python examples against Gramlot-only rule |
| Class initialization performs hidden work | Local explicit descriptors only; no JS/network execution |
| Scope grows into full framework rewrite | E1–E7 bounded proof, then owner-reviewed migration scope |
| Dirty baseline is accidentally lost or misrepresented | Explicit worktree inputs and preservation checks before any Git operation |

## 15. Questions for owner review

No question blocks drafting this design. The following decisions block specific
implementation steps; recommendations are offered to make review concrete.

| ID | Question | Recommendation | Needed before |
| --- | --- | --- | --- |
| Q1 | Description source: JSON sidecar or pure JS descriptor export? | JSON sidecar beside JS initially; one author-maintained source | E1/E2 |
| Q2 | Can the experiment include an explicitly scoped change in generic Builders if its public seam is missing? | Separate generic contribution; never copy or monkey-patch internals | E1 completion |
| Q3 | One contract base plus shared groups, or multiple component contract bases? | One base plus explicit groups initially | E2/E3 |
| Q4 | Should an override require compatibility, or permit declared breaking changes per app? | Permit explicit app changes, report diffs; no silent framework breakage | E4 |
| Q5 | What should `genro.extensions.alfa` hold: class/function definition or active capability? | Active app capability; separate definition lookup | E5 |
| Q6 | Does a declaration on a pane activate locally by default? | Source-local by default; explicit app scope for shared service | E5/E6 |
| Q7 | Python spelling for importing/activating a capability? | Separate definition availability from activation; compare `use` and `importComponent` with real examples | E5 |
| Q8 | Duplicate app activation: share or error when config differs? | Share identical configuration; fail conflicting configuration | E6 |
| Q9 | How strict should existing incomplete contracts become in this step? | No blanket tightening; enforce new complete contracts and publish coverage | Migration |
| Q10 | Must same-document applications support different overrides in the first slice? | Yes, essential proof of app scope | E4 |
| Q11 | Can activation configuration change reactively in the first slice? | Immutable initially; explicit future update contract | E6 |
| Q12 | What exact dirty inputs/base revision should the experiment use? | Select after design review; preserve unrelated local work | Worktree creation |

Additional choices to settle through experiments rather than freeze prematurely:
final JSON field spelling, schema dialect, diagnostic codes, package resource syntax,
IDE stub strategy, digest canonicalization, callable invocation declaration and
how structural child groups compose with inherited HTML restrictions.

## 16. Work performed for this design

Read current implementation and prior records, checked installed Builders version
and relevant compilation/export code, and compared a historical audit with the
current instance-schema implementation. Created this document only. No worktree,
source modification, dependency installation, test execution, commit, tag or
publication was performed. Existing release/distribution discrepancies recorded
in the 2026-09-12 handoff reconnaissance remain unresolved and separate.
