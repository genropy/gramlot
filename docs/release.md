# Gramlot release status

Candidate: **0.1.0a1**, first alpha. Publication is being configured; do not assume
this candidate is available on PyPI until the upload is verified.

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
