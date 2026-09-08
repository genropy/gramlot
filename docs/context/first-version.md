# First usable Gramlot version

Updated: 2026-09-08. **Proposed execution scope**, derived from the owner's request to reach a first version quickly. This document does not claim that the version is already implemented, released or published.

## Objective

Bring the existing Pages/DOM prototype into Gramlot, under its new project identity, with an observable runnable example and preserved behavioral tests. Keep Gramlot Rosetta as the independent FastAPI consumer. The first result should let the owner use and inspect the existing functionality immediately after migration.

Use the exact [prepared baseline](README.md#baseline-and-actual-migration-state). New store APIs, grouplet design, a routing redesign and additional validators are recorded work, not prerequisites for this first integration.

## Necessary work

1. Recheck the source commits and the prepared copies. Import Python and JavaScript code into the chosen unified layout, retaining original repositories and notices.
2. Adapt the package/import identities, string-based worker imports, browser import maps, resource locations and test loaders as a coordinated change. Keep external `genro_*` dependencies and wire contracts intact. Correct Pages' erroneous MIT license to the owner-confirmed Apache 2.0 license for the active code.
3. Provide reproducible local setup and a working launch command that uses Gramlot's source/resources. A working source checkout is the first milestone; describe any remaining packaging limitation honestly. Verify packaged-resource behavior before promising installation from an independent artifact.
4. Run the inherited DOM, Python and cross-language tests against the new locations. Check an actual browser for startup, typed source loading, input binding, inspector, label/default behavior and memory forms. Compare failures with the source baseline; do not weaken contracts to hide regressions.
5. Copy Rosetta into its separate destination and switch its Pages/DOM downloads to the same verified Gramlot revision. Preserve nine examples, four implementations, shared HTML frame, source viewer, live JS modes, common/local data and inactive Orders. Check FastAPI usage and browser behavior from that consumer.
6. Record exact versions, commands, test results and known limits. Commit on `main`. Set GitHub destinations only after the organization choice is concrete. No PyPI/npm publication is implied.

## Exit criteria

- The owner can launch a demonstrable Gramlot prototype using documented commands.
- Python and browser code come from the same Gramlot checkout/revision; Rosetta uses that revision as an external consumer.
- Imported tests and real-browser checks have current results; unresolved baseline defects are separately described.
- The current overview says Gramlot, the active license is Apache 2.0, and old names retained in historical provenance or external dependencies are explicit.
- This project memory and the original source documents remain available, so work can continue without replaying five conversations.

This small integration can be delivered before expanding the framework. Existing experimental form/layout functionality should be preserved, not advertised as a new production guarantee.
