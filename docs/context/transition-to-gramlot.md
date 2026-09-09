# Continue development in Gramlot

Date: 2026-09-09. Status: development transition recommended now; independent public installation and physical retirement remain separate gates.

## Operational decision

Use `/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/gramlot` for all new framework work. The selected Pages and DOM sources are already imported. Do not wait for GramlotBuilder, remote services or the final loader design before using this repository: implement and discuss those changes here. The saved Gramlot project points here; historical tasks can still retain their old working directory.

This is a transition of the development home, not a claim that the alpha is ready to publish or that old directories can be deleted. No runtime change, remote archival or publication is performed by this note.

## What is ready, and what is not

| Area | Evidence / status | Effect on continuing here |
| --- | --- | --- |
| Unified source | Python in src/gramlot; DOM in js/dom; page browser modules in js/pages | Ready for framework development |
| Durable context | Decisions, legacy service inventory, builder draft and feasibility report in docs/context | New tasks can resume without the old conversation |
| DOM tests | Fresh run: 212 passed on 2026-09-09 | Automated baseline available; not a live-browser certification |
| Python/integration tests | See fresh-run result below; earlier release preparation recorded 106 passed with preview | Keep environment provenance explicit |
| Public Builders 0.23.2 | Downloaded wheel lacks preview alias, transport registration and override-preservation behavior | Blocks claiming public-only compatibility; does not block work in Gramlot |
| Local environment | Current verification borrows the old Pages virtualenv; its copied Builders install does not preserve formula overrides | Still needs a reproducible Gramlot-local environment before old environment retirement |
| GramlotBuilder | Approved ownership direction, draft contract, isolated parent/proxy proof | First focused implementation task in Gramlot |
| Rosetta | Separate consumer migration not certified by this review | Do not silently switch consumer paths or claim completion |
| Physical cleanup | Unique old changes and recovery material preserved; running services not audited | Keep old checkouts until their specific cleanup gates pass |

## Starting point for the next Gramlot task

Read AGENTS.md, docs/context/README.md, decisions.md and open-work.md. Then read gramlot-builder.md, gramlot-builder-verification.md and legacy-data-remote-services.md. The workspace map identifies canonical and recovery directories.

1. Establish a Gramlot-local development environment with exact dependency provenance. Until replacement is verified, identify Builders preview by commit 25ae61950717afae10e1d43d8318f272122202ac, not merely version 0.23.2, which is shared with different public code. Do not patch installed generic classes or hide worktree overrides.
2. Complete the smallest builder contract: Python/JS dialect, browser-only execution, declaration argument mapping, Data initialization and transport. Treat generic schema reinjection as a real unresolved issue under Builders #43.
3. Exercise the proposed facade on a representative nested recipe before selecting it. The constructor has no parent argument; recipes can already build into an existing destination without changing ownership. data naming remains open. Verify callbacks, subbuilders, node identity and serialization.
4. Integrate the chosen builder into the current loader and migrate representative examples, then verify forms, inspector and startup. Loader/routing redesign and full legacy remote support are separate work.
5. Validate the independent Rosetta consumer and a clean public-package installation before retiring preview dependencies or publishing.

The legacy record/selection helpers are optional domain adapters. Their absence, and the full remote/grouplet backlog, must not become accidental prerequisites for the first builder slice.

## Preservation and handoff

Maintained documents are versionable in docs/context. Probe scripts and machine-readable results currently live in ignored temp/gramlot-builder-probe-20260909; they exist on this machine but do not travel in a normal clone. Move enduring conformance cases into tests when implementation begins. The report preserves their conclusions and limitations.

The documentation changes remain uncommitted at this checkpoint. Review and commit them in Gramlot before treating them as shared repository history; no commit or push is implied by local files being present.

## Fresh environment diagnosis

The first source-suite run with the historical Pages virtualenv produced 103 passes and 3 failures. One is substantive: the installed Builders schema still requires func, so the formula recipe fails. Its direct_url points to the preview worktree but the install is non-editable; that path and version 0.23.2 do not prove it contains the current checkout's code. Do not describe this environment as the exact tested preview without verifying its behavior.

The manual-server and registered-worker tests both passed when rerun with localhost socket permissions. Their initial failures were environmental. DOM independently passed all 212 tests.

An explicit source override to the verified preview checkout at commit 25ae619 is used for the baseline confirmation below. This is a disclosed diagnostic/development dependency, not public installability or independence from Documents/ChatGPT.

### Confirmed baseline

Fresh full run on 2026-09-09: **106 Python/integration tests passed in 51.10 seconds**, with the explicit Builders preview source override and permission for localhost sockets. Together with 212 passing DOM tests, this supports continuing framework development in Gramlot now. Live browser checks, an independent local environment and a clean public-only installation are still separate outstanding checks.

Reproduction from the canonical Gramlot root (temporary preview dependency is intentionally visible):

```sh
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src" /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages/.venv/bin/python -m pytest -q -p no:cacheprovider
npm --prefix js/dom test
```

## Later Rosetta checkpoint

Rosetta has now been migrated locally to Gramlot in its existing canonical demo-rosetta checkout. The previous pending-consumer entries are superseded by workspace-map.md and Rosetta docs/GRAMLOT-MIGRATION.md. The migration remains uncommitted and source-based; no remote rename or public-wheel compatibility is claimed.

## GramlotBuilder detachment completed locally

The new builder, authoring root and explicit snapshot transport now pass 110 Python/integration and 212 DOM tests with public Builders 0.23.2 in Gramlot .venv. A separate clean wheel installation passes the distribution check. Rosetta uses that installed wheel with public Builders and no source override or genro-asgi, passing 16 backend and 49 browser tests. The preview is no longer needed for these consumers. Optional-host package metadata, publication and unrelated physical cleanup are still separate tasks. All changes remain local and uncommitted.

## Server independence — owner decision, 2026-09-09

Gramlot must not depend on Genro ASGI, including through an optional extra. A future separate application repository will combine Gramlot and Genro ASGI for business applications. This supersedes earlier suggestions for gramlot[asgi] or an optional in-package host adapter.

The integration has been extracted from the Python package and browser assets: application/routes, worker, server configuration, host-specific startup document, WSX/RPC client and bootstrap. Exact originals and associated host tests are preserved under docs/history/asgi-extraction-20260909 with a SHA-256 manifest, excluded from wheels and source distributions. They are recovery material for the future repository, not an active integration maintained inside Gramlot.

Gramlot retains the builder, typed transport, browser runtime, widgets, inspector, recipes and host-independent tests. The CLI only serves local HTML documentation via the Python standard library; it no longer launches an application server. Rosetta owns its FastAPI integration and now installs the Gramlot wheel normally, without --no-deps. No server framework is required by Gramlot.
