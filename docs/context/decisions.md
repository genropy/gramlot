# Recorded decisions and corrections

## Installable example applications — owner decision, 2026-09-11

User-facing applications produced here should be installable from Chrome, as in
Rosetta. Tutorial and gallery now have separate PWA identities, manifests, icons
and install prompts. Their service workers fetch live content and show recovery
instructions if the local server is unavailable; installation does not bundle
or start the server. Chrome exposed the Install app button for both applications
in the browser verification. No installation was performed on the user's behalf.

## Display format, mask and locale — owner decision, 2026-09-11

Keep `format` and `mask`: resolve the typed Bag value, convert it to text according
to format, then insert that text into mask at `%s`. Presentation never changes
the stored value. Locale defaults to the page unless overridden on the display
node. Locale, format and mask can all be literal values or ordinary reactive/passive
pointers, preserving existing `^` / `=` semantics. Date/time named styles follow
short/medium/long/full conventions. The alpha implements these plus a documented
bounded LDML subset; see [display formatting](../guides/display-formatting.md).
Data-node metadata precedence and a local datetime transport remain unsettled.

## Group boxes — owner decision, 2026-09-11

Add `groupBox` using the existing `lbl` vocabulary and shared label decoration.
A centered title bar (white on dark) and an underline variant distinguish a
labeled group from a simple field label. Optional copy exports the group's
associated Data branch as JSON; the branch is defined by the group's datapath,
not reconstructed from its rendered children. Optional drag is useful for future
collections and floating groups containing charts or tables. These are separate
capabilities: initial drag supplies a transferable payload; automatic collection
reordering, drop handling and floating-window behavior remain future work.

## Field tools and calendar confirmation — owner decision, 2026-09-11

Expansion icons belong inside the field's visual border. Tool attachment must be
shared by compatible components, rather than implemented separately for dates,
keypads or color pickers. The first consumer is the date calendar; this does not
authorize implementing the other tools yet. Label decoration, tool presentation,
popup lifecycle and editor validation retain separate responsibilities.

Selecting a calendar day changes the editor draft and leaves the popup open.
Leaving the combined field/tool focus region, including clicking outside,
confirms through the field's normal parsing and validation path. Moving between
the textbox, trigger and calendar must not commit. Escape cancels the draft.
This supersedes the alpha's immediate commit and close on day selection.

## Free text date editor — owner decision, 2026-09-11

`dateTextBox` uses an ordinary text input with unrestricted text selection and
caret movement. This supersedes native segmented date editing and regex-based
native/text switching. An internal draft is parsed on Enter/blur; Data receives
only the committed typed date. `symbolic` enables expressions; compact/local/ISO
dates work without it. A reusable calendar provides optional pointer selection.
The local `dateTimeTextBox` decision below is unchanged.


## Local datetime editor — owner decision, 2026-09-11

`dateTimeTextBox` uses one native `input[type=datetime-local]` and edits a local
date and time without a timezone offset. The consuming server owns conversion
to UTC for persistence. The browser field must not implicitly convert the value
to UTC or treat it as an already established UTC instant.

This supersedes the typed-component assessment's proposed UTC model and
two-control datetime editor. A composite-field base is not required for this
pilot. Local datetime transport representation, server timezone context and
daylight-saving ambiguity handling still need explicit contracts; this decision
does not select a TYTX type or add server dependencies to Gramlot core.

## Numeric and temporal formatting — owner clarification, 2026-09-11

For `numberTextBox` and the other components under review, GenroPy legacy is
the reference for documentation and behavioral comparison. Inspect its actual
contracts rather than treating current Gramlot behavior as the specification.
The owner identifies historical formatting vocabulary and syntax as confusing,
including `pattern` and ambiguity about the kind of format being declared.
Formal continuity with those historical conventions is not required when a
clearer, more elegant solution is available. Propose coherent numeric and temporal
formatting terminology and syntax, distinguishing stored values, editing,
display formatting, parsing and precision/rounding behavior.

This supersedes the earlier strict legacy-naming policy for the formatting
contract under discussion. It authorizes exploring improved APIs, not treating
any proposed spelling, formatting language or rounding policy as already approved,
nor an unrelated redesign of all legacy authoring conventions.

## Input presentation preferences — owner decisions, 2026-09-11

The null background decoration must appear only when explicitly enabled through
a preference. The shared input decoration now defaults off; the teaching preview
offers a persistent Show null values checkbox. This affects presentation, not
null data, editing, accessibility descriptions or native checkbox indeterminacy.

numberTextBox values must align right by default. This is implemented in the
shared input stylesheet, without adding alignment attributes to examples.

## Inline expressions — owner decision, 2026-09-10

Retain `==expression` in Gramlot for computed attribute values and service-call
parameters. Expressions use other named parameters; reactive inputs cause
dependent attribute values to update. Unlike dataFormula, an inline expression
does not create a separate Data destination. Keep ^ reactive paths and = passive
reads distinct. Implementation remains pending; dependency analysis, expressions
referencing other expressions, cycles and errors still need explicit rules.
The preceding question about implicit provider startup was not answered by this
approval and remains open.

## Logical declaration syntax — owner decision, 2026-09-10

dataFormula accepts a JavaScript expression, for example `price * quantity`,
with named inputs declared as attributes. dataController accepts a JavaScript
script. Authors need not wrap either in a complete JavaScript function. This
changes the intended contract from the current function-string convention;
implementation and migration of existing recipes remain pending. It does not
approve legacy macros, hook names or automatic startup behavior. See the
[logical blocks plan](../development/logical-blocks-plan.md).

## dataSetter assignment — owner decision, 2026-09-10

The owner also confirmed initialization order for the branch being built:
all its dataSetters first, then missing-only defaults, then formulas/controllers
explicitly requested before build, then widget construction, then logic requiring
built widgets. This approves the order, not automatic execution of every provider,
hook spelling, forced construction of lazy branches or remote replacement details.

dataSetter assigns the declared value unconditionally, including Python None
and JavaScript null. Defaults separately initialize missing data only, preserving
existing null, false, zero and empty strings. The legacy data declaration's
special rule that null preserves an existing node is not retained. This settles
assignment semantics, not whether setters replay on rebuild or the remaining
logical-block API and scheduling choices. See the
[logical blocks plan](../development/logical-blocks-plan.md).

Updated: 2026-09-08. Sources: the [five conversation summaries](conversations.md), preserved project documents, and the current Gramlot conversation. Message references identify the local historical archive; statements below do not establish untested implementation claims.

## Server independence — owner decision, 2026-09-09

Gramlot must not depend on Genro ASGI, including through an optional extra. A future separate application repository will combine Gramlot and Genro ASGI for business applications. This supersedes earlier suggestions for gramlot[asgi] or an optional in-package host adapter.

The integration has been extracted from the Python package and browser assets: application/routes, worker, server configuration, host-specific startup document, WSX/RPC client and bootstrap. Exact originals and associated host tests are preserved under docs/history/asgi-extraction-20260909 with a SHA-256 manifest, excluded from wheels and source distributions. They are recovery material for the future repository, not an active integration maintained inside Gramlot.

Gramlot retains the builder, typed transport, browser runtime, widgets, inspector, recipes and host-independent tests. The CLI only serves local HTML documentation via the Python standard library; it no longer launches an application server. Rosetta owns its FastAPI integration and now installs the Gramlot wheel normally, without --no-deps. No server framework is required by Gramlot.

## Identity, ownership and first delivery

- Gramlot is an autonomous project, not a GenroPy subpackage. It unifies the work in Pages and DOM JS. Homepage: https://gramlot.com. Keep the supplied logo and the tagline **GRAMmar for Live Object Trees**.
- Rosetta becomes **Gramlot Rosetta**, in a separate repository, because it is a FastAPI application consuming the library.
- Owner decision on 2026-09-09: remain under `genropy`. The separate `gramlot` organization proposal is withdrawn. Keep the existing remotes `genropy/gramlot` and `genropy/demo-rosetta`; no transfer or rename is authorized by this choice.
- Apache 2.0 is the intended license, including Pages. The owner says the old MIT file was erroneous. Preserve authorship and third-party attribution.
- Prioritize an initial working version; record unfinished research without silently adding it to the first delivery. Preserve originals and migrate by copy. The existing instruction for this work is to use `main`, without a development branch.
- Do not publish to PyPI/npm, add new features, or create elaborate CI as an incidental part of naming and migration.

## Framework and legacy relationship

Legacy is evidence and experience, not an unconditional specification. Inspect what each mechanism solved, preserve valuable mental models, and replace weak or obsolete implementation choices deliberately. Modern JS/CSS and manageable modules are preferred to copying the old giant modules. Document concrete behavioral differences. [First Pages: 514–535, 836–861.]

The Python author should understand the code produced for a page, including when an LLM writes it. Recipes describe real UI; the displayed source must be the code actually executed, not an illustrative substitute. English code, example text and maintained technical documentation were requested. The Italian collaborator guide is an explicitly requested exception. [First Pages: 298–380, 491; Rosetta: 38–77.]

Keep source and data distinct, with rooted hierarchical Bags and stable observation boundaries. Python constructs the recipe; client presentation reactivity executes in the browser. Preserve typed source hydration through TYTX JSON and MessagePack, including SourceBag `XS` and mixed ordinary Bag branches. [First Pages: 26–80, 202–265.]

Preserve meaningful GET/SET/PUT/FIRE behavior, relative paths and source-node callback context. DOM event connection, method advice and publish/subscribe are different responsibilities; modern replacements should preserve the supported semantics and dispose their registrations. The desired per-page application owns its services and cleanup. The historical global name `genro` is not a reason to mechanically rename every external host key. [First Pages: 121–153, 411, 507–535.]

Mobile is a first-class requirement: pointer/touch behavior, usable handles, cancellation, keyboard operation, scrolling and zoom all matter. Browser automation is not equivalent to verification on a real mobile device. Palette keyboard manipulation was requested as optional because always-on movement could confuse users. [First Pages: 399–407, 520–522.]

**Native widgets, CSS and themes remain the chosen direction. Tailwind and Bootstrap were explicitly discarded.** Earlier optional-theme brainstorming is superseded. The theme should be compact, coherent and readable, with restrained control sizes. [Coordination: 161–171; First Pages: 390–399.]

## GramlotBuilder dialect ownership — owner decision, 2026-09-09

The owner approved the basis described in [GramlotBuilder](gramlot-builder.md): Python and JS counterparts owned by Gramlot, extending HTML authoring and sharing the browser-runtime contract. SVG grammar composition is to be verified; a standalone SVG variant is optional. Generic data-element removal remains an evaluation under Builders #43. This later decision takes precedence over older statements that generic Builders must adopt Gramlot's parameter names. Precise signatures and datastore-access naming still require an explicit contract.

## Authoring and state

Use relative paths for reusable local state and absolute paths for intentionally shared state. A repeated panel should be reusable by changing `datapath`; mixing local and common settings is a core teaching example. Default values initialize **missing** data only, preserving present `null`, empty string, zero and false. [Rosetta: 139–179, 245–251, 277–280; Coordination: 72.]

Do not force method decomposition on tiny examples. The latest Rosetta correction is: examples through Local scope remain in `main()` (top-level code in JS); Repeated panels adds only the reused `text_panel()` helper. Split further when actual reuse or complexity warrants it. This supersedes the earlier broad instruction to split all recipes into many documented methods. Avoid repetitive `build_` prefixes in application recipe helper names. [Rosetta: 43–58, 237–241, 281–285.]

**`dataFormula` uses `formula`, with no `func` compatibility alias.** Update Python, JS, recipes, tests and documentation together. The owner rejected adding debt at this early stage. This rename does not authorize changing expression syntax. `dataController` retains its separate `func` contract. Positional destination/formula authoring was requested. [Coordination: 180–190; Rosetta: 227–244.]

The `data`/`store` naming question is **not resolved**. `builder.data` and `SourceBagNode.data` conflict with a callable recipe `data(...)`; alternatives discussed were `store` plus `data`, `setData`, and `pageData`. Earlier proposals must not be promoted into an approved generic Builders API rename. Coordinate an organic update across Python and JS when this decision is taken. [First Pages: 987–995, 1031, 1153–1171.]

## Labels, inputs and inspector

`lbl` wrapping and explicit `labledBox` should share a mechanism. Keep label, box and field styling separate; a field's `font_size` must not enlarge its label. Preserve the intentional legacy spelling `labledBox`. The established positions are `L`, `R`, `TL`, `TC`, `TR`, `BL`, `BC`, `BR`; `lbl_*`, `box_*`, `box_l_*`, `box_c_*`, `fld_*` and inherited defaults need coherent precedence. Explicit child attributes take precedence. Label placement and styling can be bound to data and change without losing focus or identity. [Forms: 2–20; Coordination: 45–58, 87–93; Rosetta: 104–108, 277–280.]

`formlet` is layout: fixed/responsive columns, gaps, relative scope and shared presentation defaults. `form` owns data/validity/save behavior; `labledBox` owns titled presentation. A formlet can exist outside a form. The implemented subset excludes wrapping mode and the legacy formbuilder/database adapter. [Forms: 37–49.]

Focus-out is the default text commit behavior. The owner extended typed editing and explicit null behavior beyond the inspector to input widgets: Backspace on an empty value can produce null, no separate Set null button, and checkbox indeterminate state represents null. Optional `blankIsNull` normalizes empty values to null and is disabled by default in Pages. Null presentation and invalid presentation are distinct. [Coordination: 107–139; Forms: 10–20.]

The inspector operates on the live Data and Source Bags through their APIs; it does not rewrite source files. Preserve numbers, booleans, strings and null. Conversion failure must not partially mutate the model; complex unsupported values remain read-only. Value/attribute editing should commit on focus-out, use appropriate typed widgets, and reflect application-side changes. The desired UI has a light tree, a split editable property grid, scrollable details and the path at the bottom. Earlier Apply-only proposals were refined by this later direction. [Coordination: 40–44, 74–86, 107–122, 157.]

## Validation and forms

The owner approved the labeled-box/validation/memory-form implementation after the explicit contract proposal. Local and asynchronous validation, typed baselines and save protection were reported implemented; verify the selected source after migration rather than reusing old counts as certification. [Forms: 9–20.]

- Preserve legacy local rules and their meaningful ordering: `notnull`, `len`, `min`, `max`, `email`, `regex`, `select`, `call`, plus the distinct `empty`/`case` transformations. `notnull` precedes `empty`; do not accidentally make a default satisfy a required-value check by changing the order.
- Numeric parsing/type/scale, formatting, normalization and application validation are separate. Generic integer/precision validator suggestions were withdrawn after the owner pointed out the numeric widget contract.
- Email is a warning by default, with configurable severity. Conditions, custom messages, source-node context and dependent revalidation are part of the retained direction.
- Typed invalid values can remain in the Bag. Errors and pending validation block save; warnings do not. Stale asynchronous results must not overwrite newer state. Validation completion must not trigger an unrequested save.
- Preserve changes made while a save is running. Use a typed baseline and explicit `restoreBaseline()`; do not assume legacy `reset()` means baseline restoration.
- Memory persistence is implemented separately from eventual database adapters. `validate_remote` currently has a supplied-function hook, not a complete automatic legacy RPC contract.
- `filteringSelect` validates a selected option identity; `comboBox` permits free text. Empty selection is not requiredness: `validate_notnull` supplies that constraint.

[Forms: 10, 53–67.]

**Stores must be studied as first-class collection entities before implementing `localnodup`.** The identity belongs to the collection contract. `_identifier` is not just an ad hoc validator string, and different legacy store families have different rules. Exclude the current item using stable identity, inspect filtered-out items where required, and never claim whole-collection uniqueness from a partial virtual cache. Keep database `nodup`, remote validation and local duplicate checks distinct. [Forms: 68–76.]

## Hosting, routing and Rosetta

Both lightweight hosting without mandatory user/page registries and stateful SPA/worker hosting matter. Rosetta explicitly tests FastAPI without installed Genro ASGI. A reusable external-host adapter should eventually be supplied by the library; the current demo adapter is not proof that such a distributable adapter already exists. [First Pages: 970–1023; Rosetta: 2–34.]

The latest architectural direction separates recipe classes from endpoint classes, potentially in the same module. HTTP and WebSocket endpoints should be reusable by other clients; request, page and connection lifetimes differ. The owner wants to discuss loader/builder/routing contracts before implementation. Do not resurrect speculative decorators or dynamic-mixin pseudocode as approved APIs. [Rosetta: 252–267; Coordination: 191–193.]

Earlier owner constraints on routing still matter: a path identifies a stable class, remote calls must not mutate it based on bootstrap kwargs, and per-page data comes from the store selected by page identity rather than arbitrary mutable fields on a reused instance. Multiple stacked `@route` decorators were rejected; use supported aliases. Exact page-id routing/resolver details were parked. [First Pages: 1088–1150.]

Keep `httpMethod='WSK'` as the WebSocket RPC convention and make the default configurable. One physical WebSocket on the root page with separate logical iframe identities is a target; do not claim complete multiplexing from a simpler registered-channel test. `dataRpc` accepting a Python exposed method means serializing an allowed route reference, not transporting an executable callable. [First Pages: 150–189, 901–905, 1036–1041.]

Rosetta retains the shared **plain HTML frame**, independent iframe examples, separate Page/Boilerplate/Common source categories, live JS recipe editing in Manual/Live/Focus out modes, and the inspector outside the recipe. Keep React and Vue idiomatic and behaviorally comparable. Evaluate semantic authoring differences and visible shared costs, not contrived line-count victories. Orders remains in standby until explicitly requested. [Rosetta: 52–108, 113–159.]

## Development transition checkpoint — 2026-09-09

The owner requested that current findings be retained in Gramlot and that readiness to continue there be assessed. The [transition handoff](transition-to-gramlot.md) recommends using the unified repository now; public dependency independence, Rosetta verification and old-worktree deletion remain distinct gates. The parent/facade proof does not settle data naming or authorize changes to generic node ownership.

## Optional FastAPI adapter — subsequent owner decision, 2026-09-09

The owner approved gramlot.contrib.fastapi and `gramlot fastapi serve [directory]`.
The directory defaults to the current working directory. Discover public Python
files in pages/ at startup; each defines Page(WebPage), optionally with title.
No main.py or application.json is required. GramlotApplication subclasses FastAPI
for custom applications; mount_gramlot supports existing applications. FastAPI
and Uvicorn are optional dependencies. This supersedes the earlier blanket
server-adapter restriction only for FastAPI; Genro ASGI remains excluded.

## English Sphinx manual and metadata — 2026-09-09

The owner requested the general guide, FastAPI guide and reserved metadata
reference in an English Sphinx manual in Gramlot. Use genro_toolbox.metadata
(already available in 0.14.0); do not duplicate the decorator. It sets class
attributes directly. Only title is currently interpreted as page metadata.
Docstrings describe pages but are not rendered by the current adapter.

## Binding syntax preserved — owner decision, 2026-09-10

The owner rejects binding syntax changes in the textBox contract proposal. Keep
`^path` and `=path` and their existing Source representation; do not introduce
`bind()`, `read()`, `literal()`, or tagged binding/literal objects. An escape
mechanism may be considered in the future if needed, but none is specified or
authorized for implementation now. This decision does not approve the other
proposed textBox restrictions or attribute changes.

## Legacy compatibility priority — owner decision, 2026-09-10

Preserve GenroPy legacy authoring syntax, attribute names and behavior unless a
change is absolutely indispensable. This supersedes earlier latitude to replace
legacy choices for modernization or API tidiness alone. Verify the relevant
legacy implementation before proposing a difference; document the concrete
necessity and discuss any indispensable incompatibility with the owner before
implementation. Existing explicit owner corrections remain in force.

For the textBox proposal, new restrictions, default-name removal, dtype limits
and passive-binding restrictions are not approved. The current Gramlot behavior
is not itself proof of legacy compatibility. Improve contracts and documentation
around verified legacy semantics rather than redesigning the public API.

## Live update naming exception and decoration review — 2026-09-10

The owner permits replacing intermediateChanges with liveUpdate or possibly
live as the explicit exception to legacy naming preservation. The assistant
recommended live; do not record that recommendation as final owner selection.
Alias handling and interaction with existing updateOn remain to be settled.
The owner also requested a review of common lbl/lbl_*/box attributes in relation
to the explicit labeled container. See the development label-decoration audit;
this does not itself authorize renaming labledBox or introducing new syntax.

## Label and box compatibility precedence — owner decision, 2026-09-10

For common label/box meta-attributes, prioritize legacy behavior when resolving
the differences identified in the label-decoration audit. The current Gramlot
host/inner-box split and passing regression tests do not establish the desired
public contract. Align label placement defaults, attribute destinations and the
relationship between lbl shorthand and explicit labledBox with verified legacy
behavior. Preserve earlier explicit owner corrections; implementation details
may differ where they preserve the same author-visible behavior.

## Label position syntax replaces side — owner decision, 2026-09-10

Use only the new label position syntax: lbl_position on decorated widgets and
label_position on explicit labledBox, with L, R, TL, TC, TR, BL, BC and BR.
The owner rejected retaining the old label-placement lbl_side/side syntax as
compatibility aliases; migrate affected label-placement recipes instead. No
precedence rule between old and new spellings is needed. This applies to label
placement, not unrelated uses of side in other APIs. It supersedes the earlier
recommendation to keep both forms and is an explicit exception to legacy syntax
preservation. Omitted placement retains the agreed legacy default direction;
this decision does not approve unrelated changes to label/box behavior.

The local runtime migration is implemented. Decorated widgets use lbl_position,
explicit labledBox uses label_position, and omitted placement defaults to TL.
The layout collection keeps its public ID while sharing one decoration runtime;
focused regressions cover all eight positions and the original eleven inputs;
the later `textBoxArea` input is covered by the same regression.

## Shared label/box documentation — owner decision, 2026-09-10

Individual widget references should contain only basic label usage and a link
to a dedicated labeled-container widget reference. Do not repeat the history,
full lbl/box attribute families, inheritance or routing discussion in each widget.
The dedicated reference explains both explicit composition and how its shared
attributes can be applied across widgets through the decoration syntax. Use one
shared attribute description rather than per-widget copies. Public documentation
explains usage; legacy differences belong in the internal differences register.

The owner referred to the container as labelbox; this documentation organization
does not itself rename the recorded labledBox API. Describe actual coverage and
record unsupported targets as gaps: current plain HTML nodes do not automatically
acquire widget label decoration. Do not claim universal runtime support before
verification.

## Shared learning context — owner direction, 2026-09-10

Treat formlet, validations and form alongside labledBox as shared explanatory
contexts. Widgets are frequently used in formlet. Keep widget-specific reference
concise and explain common layout, validation and form ownership in dedicated
sections. The subsequent module/gallery analysis proposes a progressive learning
sequence; its exact module paths and sequence remain recommendations.

## Experimental teaching pages — owner sequence, 2026-09-10

The first experimental pages must follow this sequence:

1. One text element.
2. One standalone widget.
3. One widget inside an explicit labledBox.
4. Three widgets with their own labels, using the shared decoration attributes
   on the widgets.
5. Five labeled widgets inside a formlet.

The formlet normally declares label placement, box attributes and shared styles
for its widgets. Page 5 must demonstrate those defaults on the formlet instead
of repeating them on every child; explicit child overrides remain supported.
These pages serve to assess Python/JS module organization and the progressive
authoring model, not merely the appearance of a finished data-entry screen.
Validation and form remain in the overall first-phase scope, to follow this
foundation; their exact experimental pages have not yet been specified.

## Component-description-first direction — owner decision, 2026-09-10

Gramlot component work should start from an explicit component description
covering recipe/custom-element/module identity, parameters and documentation,
shared attributes, child composition, data/event/binding integration, lifecycle
cleanup, CSS/themes and label decoration. Generate compatible Python
declarations from that description; Builders composes them and exports the
resulting grammar for association with JavaScript implementations. This
supersedes the earlier assumption that independently handwritten Python
declarations must originate every contract. Existing ``^``/``=`` syntax and
the open dtype/default contracts remain unchanged.

The initial isolated textBox worked example proves this direction within the
current Builders exporter limits. Its local descriptor/envelope shape is an
implementation experiment, not an owner-approved public format.

Automatic recognition of compliant Gramlot Components is an acceptance target,
not a claim about the current registry. A component-authored manifest is the
preferred contract source to evaluate: Python integrates declarations from a
trusted, explicitly selected manifest, Builders composes and exports the final
grammar, and JavaScript associates it with the selected implementation module
and collection. Recognition, loading, registration and grammar export remain
distinct stages. The exact manifest schema is still an implementation proposal;
do not add arbitrary filesystem/network scanning or execute browser code while
generating Python declarations.

## Dedicated multiline input — owner decision, 2026-09-10

Use ``textBoxArea`` for Gramlot's dedicated multiline input, backed by native
``textarea`` inside its web component. Do not replace or alias the native HTML
``textarea`` recipe. It shares value binding, focus-out commit, null/blank,
labels, formlet defaults, validation and form behavior with other inputs and
forwards the applicable native textarea parameters.

``remainingHint`` is an optional remaining-character threshold tied to
``maxlength``. A nonnegative integer is an absolute threshold; a percentage
string from 0% through 100% is relative to ``maxlength``. It updates from the
current editor draft, follows native UTF-16 length, handles over-limit external
values explicitly and stays hidden when omitted or without a limit.

## Teaching recipe minimalism — owner decision, 2026-09-10

Subsequent owner correction: individual teaching examples should contain only
three or four relevant lines. Put explanations in the hosting page and separate
different concepts into independent examples. Keep the executed code visible;
the import/class/function wrapper may be available separately as the complete
file. Do not compress unrelated statements onto one line to meet this target.

Later presentation correction: show the code only once. Use a Python row followed
by a JavaScript row, each with the live example on the left and code on the right.
JavaScript should be editable in CodeMirror and runnable as a laboratory. The
duplicate complete-file disclosure is superseded by this instruction.

Python must also use CodeMirror, in read-only mode; JavaScript remains editable.

Executable teaching recipes express choices and deviations rather than restating
defaults the framework already supplies. Keep an explicit default only when the
lesson is specifically demonstrating that value, inheritance or an override.
Python and JavaScript examples must remain behaviorally equivalent and the source
shown in the preview must remain the source that actually executes.

## Textbox live option and Rosetta focus-out lesson — owner correction, 2026-09-11

The owner specifies `live=True` (JavaScript `live: true`) as the intended option
for real-time textbox updates, superseding the proposed `updateOn='input'`
authoring spelling. This records the API decision, not verification that the
runtime implements it yet. Rosetta lesson 02 currently uses the default
focus-out commit, with no live option, in all five compared implementations.

Implementation follow-up: `live=True` / `live: true` now selects input-event
write-back, while absent or false keeps focus-out behavior. The earlier
`updateOn` spelling remains a compatibility fallback when `live` is absent.
Rosetta lesson 02 now shows two independent stacked pairs to compare both modes.

## Application navigation skin — owner correction, 2026-09-11

Application menus use a lightweight tree presentation: thin folder icons for
branches, content-specific outline icons for leaves, compact indentation,
regular-weight labels and subtle selection. Avoid heavy buttons, connector lines
and decorative boxes in navigation. The owner reference illustrates hierarchy and
icon style, not a request to turn the current theme dark. Gallery, tutorial and
the composed workspace share navigation-tree.css; ordinary action buttons retain
the previously approved button styling.
