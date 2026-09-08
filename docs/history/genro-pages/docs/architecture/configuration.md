# Configuration grammars and runtime application

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

Static examination on 2026-09-05. Sources: sibling genro-builders, genro-bag and genro-asgi repositories under /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects. No runtime tests or source modifications performed.

## Intended model clarified by the user

An implementation class owns configurable parameters and an associated grammar. Class grammars compose into the system grammar. Python recipes, possibly composed through imports, describe initial configuration; defaults and resolvers supply missing or external values. Runtime consumers read their paths in a common configuration Bag. Dynamic changes need notification and owner-side application methods. Web-edited overrides must be persistable and the chosen profile applied during startup.

## What the code establishes

- genro-builders/builder/_decorators.py: @element is declarative. Its signature and metadata define the language; its method body does not implement runtime behavior. Schema records include argument validation information, nesting and collection rules.
- contrib/config/config_builder.py: ConfigBuilder defines the layout. A mount marked subbuilder=app:grammar reads the grammar from the class/object supplied by the recipe. BuilderBase.get_subbuilder adapts grammar classes to builders. The host owns the mount node's attributes; the mounted grammar governs its children.
- genro-asgi/config/elements.py: application uses subbuilder=app_class:grammar; storage similarly mounts its provider grammar. AsgiConfigBuilder composes ConfigBuilder with AsgiServerGrammar. Capability grammars can also be combined as Python mixins. This is not automatic discovery of all uppercase class constants.
- BaseApplication declares grammar and exposes config(path), prefixing applications.<code>. The grammar's ownership and runtime ownership are related explicitly.
- ConfigHandler executes recipes and merges parent layers before the main recipe using source.bag_update(..., ignore_none=True). Executed sources preserve grammar identity; plain XML/JSON dumps are not equivalent replacements for these recipes.

## Values, defaults and resolvers

ConfigHandler reads an attribute through: explicitly written value; annotated signature default; call-site default; KeyError. Paths are root-relative, with the final segment interpreted as an attribute: server.port reads configuration.server?port. Signature defaults are resolved at read time and are not necessarily materialized in the source Bag. A missing node cannot supply a mounted grammar's default; None means missing in this read contract.

EnvResolver is a genro-bag synchronous resolver reading the process environment. It supports a default, typed conversion and cache_time (zero by default). Config attributes can hold resolvers where their signatures admit BagResolver. Re-reading an environment variable is not a general notification service for external changes.

Consequently a UI needs more than a raw Bag dump to display configuration accurately. It should distinguish declared value or resolver, inherited/default value, profile override and effective value. Persisting all resolved values would inadvertently freeze environment-derived values and defaults.

## Runtime mutation is not automatically runtime application

Bag.subscribe and node attribute mutation notifications exist in genro-bag. The ConfigHandler is a read facade, not a generic hot-reconfiguration coordinator. No general configuration subscription wiring was found in the ASGI source search. Objects that copied a value at construction will not change merely because the source Bag changes.

The intended subscription mechanism therefore needs owner-side application behavior. A configuration edit may require a new timer, pool reconciliation or another concrete action. Validation of a group of edits should precede publication/application; notifying arbitrary subscribers after each unvalidated field write would expose intermediate states. This is a design consideration for phase 2, not a proposed implementation already approved.

A common server configuration tree also does not mean one Python object shared across worker processes. Changes owned by a remote worker need explicit delivery and application on that process.

## Existing orchestration example

SpaApplicationGrammar declares orchestration -> commander -> groups -> group. profiles_path, profile_name and control_enabled belong to orchestration. boot_group_settings composes GroupPolicy defaults, recipe setpoints, named profile and env_settings, in that precedence order. env_settings is an explicit runtime dict supplied by the recipe, distinct from an EnvResolver embedded in an attribute.

OrchestrationProfileStore reads/writes JSON objects and uses temporary-file/fsync/replace writes. Saving in the archive does not apply a profile. At boot a selected profile is read before the effective group configuration is supplied to the commander. The overlay is currently constrained to one group.

SpaCommander.apply_group_settings serializes applies with an asyncio lock, builds and validates a candidate GroupPolicy, computes changed settings and CPU reconciliation, then commits through group.apply_policy. It tracks active_profile, configuration_generation and last_apply. It changes the live policy; it is not a generic mutation of ConfigHandler.builder.source followed by subscribers.

GroupPolicy owns several defaults and cross-field validations today; these are not all derived from the grammar. Structural process parameters are excluded from profiles. Profile null can have a meaningful off/unlimited interpretation, unlike ConfigHandler's None-as-missing contract. A future general editor must preserve these distinctions.

## Consequence for the bridge admin UI

The durable center is class-owned configuration grammar plus the runtime configuration contract. HTML/HTMX is only presentation. The editor should consume schema information and owner-provided apply capabilities, persist deliberate overrides, and show the actual effective state. It should not invent an independent catalogue of parameter names/defaults or bypass existing orchestration validation.

Grammar introspection can support form generation, but does not automatically supply every label, grouping, editability rule, cross-field invariant or restart requirement; open **kwargs cannot yield a complete closed form schema. These requirements must be attached to the owning configuration capability without prematurely defining another framework.

This analysis qualifies the earlier bridge proposal. Before implementing pages, establish how class grammar, configuration read paths, effective runtime state, profile precedence and change application relate. The selected frontend can then be replaced without redefining configuration semantics.
