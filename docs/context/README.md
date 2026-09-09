# Gramlot project memory

Updated: 2026-09-08. This is a record of owner decisions and inherited work, not a new API specification.

Read [decisions](decisions.md), [conversation summaries](conversations.md), [open work](open-work.md), and the [first-version scope](first-version.md) before continuing implementation. [Historical documents](../history/README.md) retain detailed source evidence. New user instructions take precedence over every historical record.

## Current direction

**Gramlot — GRAMmar for Live Object Trees** is the independent home for the framework previously developed in Genro Pages and Genro DOM JS. The official homepage is https://gramlot.com. The tentative `genro-gui` name is superseded. Live Object Tree (LOT) is intentional vocabulary whose formal semantics remain open; `GRAMmar` evokes Python builders as grammars describing these trees.

**Gramlot Rosetta** is a separate FastAPI consumer and comparison application, intended repository name `gramlot-rosetta`. Its independent installation should expose unwanted framework/host coupling. Generic Bag, TYTX, Builders and server libraries remain external.

The owner is considering a GitHub organization named `gramlot`. `gramlot/gramlot` and `gramlot/gramlot-rosetta` are intended destinations if that organization is established; the existing remote is still `genropy/gramlot`. No organization creation or repository transfer is recorded as completed. Continue local work without inventing a completed transfer.

The owner explicitly corrected Pages licensing: **MIT was an error; Apache 2.0 is the correct project license.** Original historical license files are retained as evidence, with this correction taking precedence for the active migration. Preserve copyright and genuine third-party notices.

The immediate priority is a first usable Gramlot version from the existing prototype. Do not turn the full historical research backlog into a release prerequisite.

## Baseline and actual migration state

| Source | Commit prepared | Content |
| --- | --- | --- |
| Genro Pages | `0683f5dca8ea04b7047fed56e68317b27b9aa745` | Python page authoring, startup/host integration, browser page modules, tests and manual |
| Genro DOM JS | `d888cefbb4dfb65868148afb2e00cabe84b4de08` | Standalone DOM runtime, binding, widgets, forms and tests |
| Demo Rosetta | `08486b466b4971b89675090ed07509929354a697` | FastAPI app; React, Vue, Python and JS comparison recipes |

The local preparation contains 464 tracked files and eight separately retained draft notes, with verified Git blobs and SHA-256 hashes. The selected DOM source is the `codex/python-js-alignment` worktree, not its older canonical `main`. Rosetta already pins the selected Pages and DOM commits. Preparation snapshots are under ignored `temp/migration-2026-09-08/` on the original development Mac.

**Update 2026-09-09:** Python and browser runtime sources have been copied and renamed into Gramlot, and an alpha distribution is being prepared. See [release status](../release.md) for current installation checks and the unpublished Builders dependency blocker. Test results in historical documents still refer to their original checkouts and dates.

## How the memory is preserved

Five Pages-related Codex tasks were identified in the app. Their visible text was recovered from their local session records because the app's paginated summaries omitted some recent items. The local archive contains 1,808 role-tagged text records before classification of injected instruction blocks. It includes user text and assistant commentary/final answers, not tool output, private reasoning or developer/system messages. Historical file/skill instructions embedded as user-role text are marked as injected context, not owner decisions.

The archive has Markdown and JSON copies, message numbers, timestamps and hashes in ignored `temp/conversations-2026-09-08/`. Message numbers in the summaries refer to those copies. The summaries and historical documents are versioned here, so the important decisions travel with a clone even without the original Codex session storage.

Coverage is the five identified local Pages tasks, September 5–8, 2026. This is not a claim to export every Genro discussion from every account, application or collaborator. Seventeen non-text attachment blocks were identified; their image/file bytes were not copied into the text archive. Some initial requests were supplied as attachments, so their detailed intent is also recovered from linked documents and coordinator messages. Original sessions remain intact.

## Reading rules

- Owner corrections supersede earlier suggestions: for example `formula` has no `func` alias, the CSS direction is native, and Rosetta is a separate repository.
- A proposed class, API or directory shown in the old manual is not approved merely because it appears in a diagram.
- Historical commands and absolute paths describe the former environment. Use them as provenance, not current installation instructions.
- Distinguish an implemented prototype, a historical test report, an accepted requirement, an open design decision and a suggested enhancement.
- Keep the source repositories and local archives intact. No historical task is resumed, messaged or delegated merely because its instructions were copied into this memory.
