# Gramlot alpha: host-independent package

Updated: 2026-09-09. Version 0.1.0a1 is built locally and remains unpublished.

## Package boundary

Gramlot supplies Python authoring, typed Source transport, JavaScript runtime,
widgets and inspector. It has no Genro ASGI dependency and no ASGI extra.
A future separate repository will combine Gramlot and Genro ASGI for applications.
Rosetta independently hosts Gramlot with FastAPI.

The previous application, worker, host startup document and WSX/RPC integration
are preserved with their tests and SHA-256 manifest in
[the extraction archive](history/asgi-extraction-20260909/README.md). They are
excluded from the wheel and sdist. Old lab-server CLI instructions are obsolete;
`gramlot manual --directory PATH` only serves existing HTML documentation.

## Build and verify

```sh
npm --prefix js/dom ci --ignore-scripts
python scripts/prepare_assets.py
python -m build
python -m venv /tmp/gramlot-check
/tmp/gramlot-check/bin/python -m pip install dist/gramlot-0.1.0a1-py3-none-any.whl
/tmp/gramlot-check/bin/python -I scripts/verify_distribution.py
```

The build hook validates prepared assets. The wheel contains them and needs no
Node tooling at installation time. Regenerate assets after changing JavaScript.
The distribution check requires a clean environment without genro-asgi, checks
every bundled asset hash, verifies extracted modules are absent and round-trips
an authored recipe through JSON and MessagePack. HTTP serving and application
lifecycle verification belong to consumers.

Public Builders 0.23.2 is sufficient; the old preview is no longer required.
The GramlotBuilder root facade and SourceSnapshot transport implement the GUI
contract without patching generic Builders classes.

## Current validation

A fresh environment installed the wheel and test extra normally, with no ASGI:
83 core Python/integration tests pass. The earlier 110-test total also included
server-specific coverage now preserved in the extraction archive; it is not a
claim that those tests execute at their archived location. Widget rendering,
Data/Source editing, forms and lifecycle coverage independent of the host remain
active. Rosetta's normal wheel installation passes 16 backend tests; all 49 browser
checks also pass, including inspector, forms and repeated panels. The DOM runtime was not
changed by this extraction.

## Publication

No PyPI upload, tag or push has been performed. Before publication, review and
commit the source, choose the final release version and verify built artifacts.
The local alpha filename has been rebuilt during development: identify artifacts
by hash, not only by the 0.1.0a1 version string.
