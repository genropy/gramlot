# Gramlot release status

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
python -m pip install build twine
python -m build
python -m twine check --strict dist/*
```

The build hook checks every browser asset against the prepared manifest. The
installed wheel requires no Node tooling. The alpha filename has been rebuilt
during development: identify local candidates by hash, not version alone.

## Automation and service setup

See [publishing instructions](development/publishing.md) for CI, Read the Docs
and the PyPI Trusted Publisher fields. Publishing requires an authenticated
account on the external services; configuration files alone are insufficient.
