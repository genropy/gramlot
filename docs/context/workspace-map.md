# Canonical workspace and retirement map

Updated: 2026-09-09. Operational location policy requested by the owner; this is not an API redesign.

## One active framework

The only active framework checkout is:

`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot`

Python code belongs in `src/gramlot`, DOM runtime in `js/dom`, browser page modules in `js/pages`. Keep maintained documentation here; use this repository's `temp/` for local drafts and verification. Do not create new development checkouts or deliverables under `Documents/ChatGPT`. Resolve any future worktree location explicitly under Sviluppo.

Generic Builders, Bag, TYTX and server repositories remain independent. Their experimental worktrees are not alternate Gramlot development locations.

## Current locations

| Location | Role and action |
| --- | --- |
| `sub-projects/gramlot` | Active framework; clean main at dd1aec3 before this documentation change |
| `sub-projects/genro-pages` | Historical source at 0683f5d; imported into Gramlot; no new framework work |
| `sub-projects/genro-dom-js` | Historical main at 2d83956; selected migration source was d888cef in the old worktree; no new framework work |
| `/Users/gporcari/Sviluppo/genro_ng/demo-rosetta` | Current canonical comparison app at 08486b4; migration to a separate Gramlot Rosetta repository is still pending in the verified release record |
| `/Users/gporcari/Documents/ChatGPT/genro-pages` | Legacy staging and recovery area only; contains registered worktrees, symlinks and unique local material; do not delete as a whole |
| `.../worktrees/genro-pages` | Clean detached historical checkout at 72e7729; retire only after checking ignored local material and running services |
| `.../worktrees/genro-dom-js` | Clean selected migration source d888cef; retained until consumer paths and worktree registration are retired |
| `.../worktrees/genro-builders` | Preview dependency 25ae619, required by Gramlot's recorded distribution verification; must not disappear before replacement is tested |
| `.../worktrees/genro-bag` and `.../worktrees/genro-bag-js` | Local modifications differ from their canonical repositories; preserve and assess before retirement |
| `.../worktrees/genro-tytx` | Symlink to canonical TYTX, not another checkout; do not follow it recursively during deletion |
| `.../temp/demo-rosetta-worktrees/*` | Old app worktrees; integration contains local changes, some matching main and some different; do not merge or discard blindly |

## Preserved evidence

`temp/workspace-cleanup-20260909/inventory.json` records HEADs, branches, statuses, worktree registration and SHA-256 hashes of copied modified/untracked files. Binary-capable tracked patches and copies of those files are stored beside it. Copies were hash-checked. This is a targeted recovery snapshot, not a full backup of ignored files, environments or Git history.

The legacy DOM untracked `PATTERNS_DISABLED` and `examples/gallery.html` are preserved there as well. Dirty does not imply newer or correct: compare semantics with canonical changes before migrating any patch. The existing relocation archive and original directories remain intact.

## Application project configuration

Verified after the owner's correction on 2026-09-09: the app project `gramlot` now points to `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot` and is recognized as a Git repository. The stale Gramlot project-path issue is resolved.

The `genro-pages` project still points to the historical staging directory. Start new framework tasks in the corrected Gramlot project. Existing historical tasks may retain their original working directories; correcting the saved project path does not establish that all existing tasks were relocated.

## Remaining cleanup gates

1. Finish and verify the separate Gramlot Rosetta migration, identifying its real canonical path. Its name is decided; no nonexistent checkout should be advertised as active.
2. Resolve the Builders preview through a tested canonical/released dependency. Preserve the dependency version contract; do not switch to another branch merely to simplify paths.
3. Compare Bag/Bag JS local changes and Rosetta integration differences with maintained versions. Keep recovery material even if changes prove obsolete.
4. Audit ignored files, symlinks, editable installs, running services and remaining absolute-path references before moving/removing worktrees. Process inventory was unavailable in this sandbox; no service was stopped or certified unused.
5. Use Git worktree operations for registered worktrees; do not remove directories by hand or move a shared Git administration directory without repairing links.
6. Once independent startup and browser checks pass, archive old GitHub repositories with successor links if explicitly approved. Remote archival/deletion has not been performed by this cleanup.

No runtime changes, repository moves, worktree removals, merges, commits or pushes were performed in this pass. Historical banners and this map establish the working boundary now, while preserving the unresolved material for a safe physical cleanup.

## Published Builders verification — 2026-09-09

The owner reported that 0.23.2 is published. A fresh `pip download --no-deps --only-binary=:all: genro-builders==0.23.2` succeeded. The wheel SHA-256 is `1343a57ea8e2ba384a5fbc59e72da1e945c6f76206b0ff745066a86af2405ecc` and is preserved under `temp/workspace-cleanup-20260909/published-builders/`.

Direct source comparison shows that the public wheel lacks the preview changes for SourceBag TYTX registration, the opt-in data_recipe_alias, and preservation of data-element grammar overrides. Publication availability is resolved; equivalence with the tested preview is not. No installed environment was changed. The cleanup dependency gate concerns these differences, not whether version 0.23.2 exists on PyPI.

## Development readiness follow-up

See [transition checkpoint](transition-to-gramlot.md) for fresh tests. The historical Pages virtualenv has a non-editable Builders install originating from the preview directory, but its formula override behavior differs from the current preview checkout. Do not equate direct_url provenance with current checkout contents.

## Rosetta migration update — 2026-09-09

The canonical `/Users/gporcari/Sviluppo/genro_ng/demo-rosetta` checkout now contains
the local Gramlot Rosetta migration. It consumes Gramlot dd1aec3 and Builders
preview 25ae619 through its normal setup; separate Pages/DOM imports are removed.
16 backend and 49 browser tests passed against the canonical framework checkout.
The default dependency setup also fetched successfully; genro-asgi is absent from
the consumer environment. See that checkout's docs/GRAMLOT-MIGRATION.md for final
checks and limitations. This supersedes earlier “migration pending” statements
for local code only. Changes are uncommitted; remote/directory names still remain
demo-rosetta. Public-wheel installation and physical cleanup remain separate.

## Public dependency detachment — latest checkpoint

GramlotBuilder and its transport boundary now replace the preview-only GUI behavior. Gramlot .venv uses public dependencies; temp/public-wheel-env verifies the built distribution. Rosetta uses the installed wheel and public Builders, without PYTHONPATH overrides by default. The preview worktree is no longer a runtime requirement for these two consumers. This does not authorize physical deletion of preserved worktrees or unique Bag/Rosetta changes.

## Server independence — owner decision, 2026-09-09

Gramlot must not depend on Genro ASGI, including through an optional extra. A future separate application repository will combine Gramlot and Genro ASGI for business applications. This supersedes earlier suggestions for gramlot[asgi] or an optional in-package host adapter.

The integration has been extracted from the Python package and browser assets: application/routes, worker, server configuration, host-specific startup document, WSX/RPC client and bootstrap. Exact originals and associated host tests are preserved under docs/history/asgi-extraction-20260909 with a SHA-256 manifest, excluded from wheels and source distributions. They are recovery material for the future repository, not an active integration maintained inside Gramlot.

Gramlot retains the builder, typed transport, browser runtime, widgets, inspector, recipes and host-independent tests. The CLI only serves local HTML documentation via the Python standard library; it no longer launches an application server. Rosetta owns its FastAPI integration and now installs the Gramlot wheel normally, without --no-deps. No server framework is required by Gramlot.
