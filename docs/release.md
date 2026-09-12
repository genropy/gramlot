# Gramlot release status

Latest checkpoint: implementation commit `ef23584` on develop contains the
integrated RPC foundation and example presentation. The owner authorized committing
and pushing develop, explicitly without release. Historical uncommitted checkpoints
below describe the preceding verification. No tag or publication is authorized.

## Current source version: 0.1.2

The owner assigned version **0.1.2** to the consolidated current line on
2026-09-12. Python and internal JavaScript package metadata use this version;
browser manifests derive it when rebuilt. This is a source version assignment,
not a published release. No 0.1.2 tag or publication has been performed.
Gramlot remains pre-alpha; 0.2.0 beta is the next development target.
Previously built 0.1.0a1 artifacts are historical candidates and must not be
renamed or presented as 0.1.2. Rebuild and verify before any release.

## 0.1.2 scope update — 2026-09-12

The owner explicitly includes the Data RPC foundation in 0.1.2, rather than
reserving it for 0.2.0. The experimental changes have been integrated into the
canonical checkout as uncommitted work on develop, with source version 0.1.2.
main has not yet been advanced. This is a local release candidate, not publication.

Included: @endpoint/@source and MRO discovery, TYTX page services, browser readiness
before main, SourceNode-owned busy refusal, _delay, boolean _lockScreen, the shared
server-call service and triangle example. The associated bounded contentPane
remote and process-local store infrastructure are carried with this foundation.
Existing example presentation changes are preserved.

The legacy `(result, resultattrs)` protocol is not yet implemented explicitly;
JSON-to-Bag conversion, reusable Page instances and page_id remain open. Do not
claim full dbSelect or legacy RPC compatibility. See the
[consolidated contract](development/data-rpc-consolidated-contract-2026-09-12.md).
Before tagging, review the final diff, align publication policy, and verify the
actual release commit and artifacts. This scope update authorizes no registry,
CDN or GitHub publication.

## Published release: 0.1.0a1

**0.1.0a1**, first alpha, published on PyPI on 2026-09-09.

The tag-triggered workflow passed CI and uploaded the wheel and source archive.
A fresh environment installed `gramlot[fastapi]==0.1.0a1` from PyPI successfully.

- [PyPI release](https://pypi.org/project/gramlot/0.1.0a1/)
- [Publishing run](https://github.com/genropy/gramlot/actions/runs/34339515923)

Read the Docs is active: [English manual](https://gramlot.readthedocs.io/en/latest/).
The first successful build (34468533) published commit a924e2b.

The candidate includes Python authoring, typed Source transport, browser runtime,
widgets, inspector APIs, optional FastAPI integration and an English Sphinx manual.
The FastAPI extra is optional; core installation does not load a server framework.

## Local validation

- 83 core Python/integration tests pass without the FastAPI extra.
- 9 FastAPI adapter tests pass in an environment with its optional dependencies.
- 212 browser runtime unit tests pass.
- Sphinx HTML builds with warnings treated as errors.
- Wheel and source archive pass strict Twine validation.
- The wheel is built from the source archive, then installed and verified in
  an isolated environment without optional server dependencies.
- Installed adapter browser navigation and discovery were verified locally.

## Build

```sh
npm --prefix js/dom ci --ignore-scripts
python scripts/prepare_assets.py
python scripts/build_browser_distribution.py
python -m pip install build twine
python -m build
python -m twine check --strict dist/*
```

The browser build emits a content-addressed ZIP and embeds the identical payload
under `gramlot/resources/browser/` in the wheel. Its manifest inventories public
ES-module entries, lazy inspector resources, licenses, hashes, sizes and media
types. `scripts/verify_browser_distribution.py` checks ZIP/wheel byte parity.
The build hook checks every browser asset against the prepared manifest, and the
installed wheel requires no Node tooling. Browser ZIPs and checksums are uploaded
as a separate CI artifact, so Twine and PyPI only receive Python distributions.
The alpha filename has been rebuilt during development: identify local candidates
by hash or browser build ID, not version alone.

## Automation and service setup

See [publishing instructions](development/publishing.md) for CI, Read the Docs
and the PyPI Trusted Publisher fields. Publishing requires an authenticated
account on the external services; configuration files alone are insufficient.

## Local integrated RPC candidate verification — 2026-09-12

Canonical develop, source 0.1.2, uncommitted integration:

- Full Python suite: 142 passed, 3 dependency deprecation warnings. The first
  sandboxed run had one localhost-server failure and four skips; the complete
  run with localhost permissions passed with no skips.
- Full DOM JavaScript suite: 365 passed. Previously recorded jsdom
  requestAnimationFrame diagnostics still appear; passing assertions do not
  establish that these diagnostics are resolved.
- Chromium: 3 passed against the integrated checkout's bundle on localhost:8068,
  covering startup, local/Python parity, remote Source, busy refusal and layout.
- Browser candidate: gramlot-browser-0.1.2-fd9a953c6325fc51.zip, 45 payload files.
  No fresh wheel parity or clean-install check is claimed for this build.
- git diff --check passed. All 37 inventoried incoming worktree files remain
  byte-identical to their pre-integration copies. Backups and the integration
  inventory are in /private/tmp/gramlot-rpc-integration-012.

main remains 07bf835; no v0.1.2 tag was created. This record is local verification,
not CI completion or publication. The final release gate is still required.


Documentation validation before commit: Sphinx HTML build passed with warnings
as errors (`-W --keep-going`). The remote preflight found no develop branch;
branch push creates it without changing main or sending tags.
