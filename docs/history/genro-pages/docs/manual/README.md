# Genro Pages and Genro DOM JS: technical source and runtime manual

**Visual orientation:** [Repository maps: current separate repositories and proposed unified GUI](repository-maps.md).


Version: 0.1  
Last updated: 2026-09-08  
Status: 🔴 DA REVISIONARE — draft for technical review. Future architecture is a proposal, not an approved migration.

This manual explains the running experimental system from its source code, then proposes a possible unified repository and portable hosting boundary. The intended reader is a developer taking responsibility for implementation, diagnosis and release. No runtime changes, repository moves or migration were performed to produce it.

## Concurrent work detected during this analysis

The tested client assembly and the authoritative DOM worktree diverged while this manual was being written. New form, validation and labeled-box source appeared in D, and corresponding declarations/tests appeared in P. Read the [closing addendum](07-concurrent-work.md) before using an absence claim from the tested baseline. The original state manifest is a time-stamped observation, not an atomic freeze of another task’s work; `closing-state.json` separately fingerprints the served C runtime and the later worktree.

## Navigable contents

**Part I — Current system, verified against the observed source**

1. [Architecture, dependencies and provenance](01-architecture.md)
2. [Source atlas: responsibilities, symbols, ownership and intervention points](02-source-atlas.md)
3. [Bag, Source, runtime APIs, binding and execution paths](03-runtime.md)
4. [Widgets, tools, maintenance and verification](04-maintenance.md)

**Part II — Future architecture, proposed**

5. [Unified repository, distribution, host adapters and incremental migration](05-proposal.md)

**Reference material**

- [Glossary, concept → module → symbol → test map, gaps and decisions](06-reference.md)
- [Observed repository state and SHA256 file manifest](observed-state.json)
- [Complete source/test symbol navigation index](source-symbol-index.md)
- [Verification record](verification.md)
- [Concurrent work: form/validation implementation in progress](07-concurrent-work.md)
- [Closing source and active-assembly hashes](closing-state.json)

Chapter 3 contains all nine end-to-end execution paths. Chapter 5 includes FastAPI and Starlette illustrations, explicitly separated from executable APIs in the current repositories. Mermaid diagrams are embedded at the points where they explain a mechanism; standalone diagrams and rendering evidence accompany the verification record.

## How to read evidence

**Observed implementation** means that the behavior is present in the source snapshot described here. **Tested** means an existing automated check was executed for this draft; it does not imply every branch in that module is covered. **Historical evidence** comes from existing notes and is labelled separately. **Proposed** means no implementation or approval is claimed.

The working trees contain relevant uncommitted work. A commit hash alone does not reproduce this system. Use `observed-state.json`, the installed-version table and the active client-root description together. Source comments sometimes describe earlier slices; the executable methods and current tests take precedence over those comments.

## Source root notation

Paths such as `P/js/src/bootstrap.js` are repository coordinates, not import specifiers. The linked root opens the checkout on this machine. The symbol atlas provides direct links to individual source files.

| Key | Root and use |
| --- | --- |
| P | [Canonical Pages](/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages): Python recipes, server integration, browser integration, tests |
| D | [Authoritative experimental DOM](/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js): maintained JavaScript DOM source |
| B | [Experimental Builders](/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders): Python grammar and typed SourceBag override |
| C | [Active client assembly](https://github.com/genropy/genro-pages/blob/codex/hello-world/temp/client-releases-20260908): disposable DOM copy plus installed Bag/TYTX artifacts |
| L | [Legacy Genropy](/Users/gporcari/Sviluppo/Genropy/genropy): comparison only |

The preserved `worktrees/genro-pages` checkout is not a development source for this manual. Do not apply fixes there. The experimental dependency worktrees under the old workspace remain relevant even though Pages itself moved.

## First orientation

Python authors a tree describing the page. TYTX preserves the distinction between a SourceBag branch and an ordinary Bag value while carrying that tree to JavaScript. JavaScript reconstructs runtime ownership, evaluates bindings against one page-local data root, and renders native DOM/Web Components. Browser edits enter the Bag notification circuit and cause local patches. The server is not asked to render every keystroke.

A source node, a data node, a custom-element instance and its shadow input are different objects. Most difficult bugs arise when their identities, paths, types or lifetimes are confused. Start with those boundaries before changing rendering code.

## Shared preview edition

This draft is included for collaborator review. Source links point to the shared
preview branches/revisions; the original runtime observations retain their dated
snapshot boundaries. See [collaborator setup](../collaborator-preview.md) for the
newer verified install. The HTML edition omits machine-local source snapshots.
