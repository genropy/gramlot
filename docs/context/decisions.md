# Recorded decisions and corrections

Updated: 2026-09-08. Sources: the [five conversation summaries](conversations.md), preserved project documents, and the current Gramlot conversation. Message references identify the local historical archive; statements below do not establish untested implementation claims.

## Identity, ownership and first delivery

- Gramlot is an autonomous project, not a GenroPy subpackage. It unifies the work in Pages and DOM JS. Homepage: https://gramlot.com. Keep the supplied logo and the tagline **GRAMmar for Live Object Trees**.
- Rosetta becomes **Gramlot Rosetta**, in a separate repository, because it is a FastAPI application consuming the library.
- The GitHub `gramlot` organization is being considered; creation/transfer has not been confirmed.
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
