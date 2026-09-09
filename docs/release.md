# Preparing the first Gramlot release

Status: **local alpha candidate `0.1.0a1`; not published**. Updated 2026-09-09.

The Python namespace and console command are `gramlot`. Python sources live in
`src/gramlot`, the DOM runtime in `js/dom`, and page browser modules in `js/pages`.
`gramlot-dom` is a private internal JavaScript package, not an npm publication.
Rosetta remains a separate consumer and is not included in this distribution.

## Verification on 2026-09-09

- Python 3.12.9 / Node 23.11.0: 106 Python/integration tests passed.
- DOM suite: 212 tests passed; the Python suite also invokes the three RPC JS tests.
- Wheel built from the source archive; strict Twine metadata checks passed.
- Clean virtual environment, with explicitly installed local Builders preview:
  installed-wheel resource and typed-recipe checks passed.
- Public-only resolution failed on missing Builders 0.23.2, as described below.
- Candidate files and archives checked for credentials, machine-local paths and
  accidental caches. No matching findings. Browser interaction, mobile testing
  and the separate Rosetta migration have not been completed in this preparation.

## Publication blocker

The inherited prototype requires **genro-builders >= 0.23.2** for the selected
authoring behavior. On 2026-09-09, PyPI has only versions through **0.23.1**.
A clean resolver rejects the Gramlot wheel for this reason. Do not lower the
requirement to make installation appear to work. The tested local preview is
Builders commit `25ae61950717afae10e1d43d8318f272122202ac` (version 0.23.2).
Builders must be released, then the public installation must be checked again.

The initial host integration still depends on Genro ASGI 0.43.x. A host-optional,
FastAPI-friendly installation remains open work, not a property claimed by this
alpha. No new host abstraction or LOT semantics are defined here.

## Reproduce the candidate

Use Python 3.11+ and Node 20.19+. Work from the repository root in a virtual
environment. Build tools are development tools, not runtime dependencies.

```sh
python -m pip install build 'hatchling>=1.26' twine pytest pytest-asyncio
npm --prefix js/dom ci --ignore-scripts
python scripts/prepare_assets.py
python -m build
python -m twine check --strict dist/*
```

The build produces a source archive and a wheel built from that archive. Browser
resources are copied from the pinned npm installation, with package metadata,
license texts and SHA-256 hashes. The archive includes these prepared resources:
building its wheel requires no Node installation or JavaScript download.
The build hook rejects missing, changed or unexpected resource files.
Rerun asset preparation after changing JavaScript sources or its lockfile.

The bundled third-party runtime is Bag JS, TYTX JS and MessagePack JS. Bag/TYTX
retain their external names. MessagePack's ISC license is included separately;
it does not change Gramlot's Apache 2.0 license. TYTX's npm source declares
Apache 2.0 but omits the license text, so that standard text is supplied alongside
its unchanged package metadata and source notices.

## Verify without hiding the preview dependency

Until Builders is released, set `BUILDERS_PREVIEW` to a checkout of the exact
commit above and explicitly install it alongside the wheel in a clean virtual
environment. This verifies the candidate, **not public installability**.

```sh
python -m pip install "$BUILDERS_PREVIEW" dist/gramlot-0.1.0a1-py3-none-any.whl
python -I scripts/verify_distribution.py
python scripts/prepare_test_client.py
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" PYTHONPATH="$PWD/src" python -m pytest -q
npm --prefix js/dom test
```

The isolated distribution check requires an installed package, verifies every
resource hash, serves every JavaScript/CSS asset, and acquires the Hello World
recipe in both JSON and MessagePack. The source tests exercise widgets, forms,
ownership/disposal and registered-page/RPC behavior. They do not certify mobile
devices or a production deployment.

After installation, `gramlot --port 8000` launches the inherited page laboratory
with bundled resources. `--modules PATH` remains available for development.
The `manual --directory PATH` command serves an explicitly built HTML manual;
the historical manual is not silently presented as current Gramlot documentation.

## Before an actual upload

1. Release the required Builders version and repeat installation in a fresh
   environment using only public packages; run the distribution check there.
2. Resolve the final GitHub owner (`genropy` today; a `gramlot` organization is
   still under consideration), then update repository URLs if it changes.
3. Review the final artifacts and source commit. Confirm the chosen version and
   configure PyPI publishing credentials or a Trusted Publisher at that time.
4. Upload only after an explicit publication request. No PyPI/npm upload,
   release tag or publishing workflow has been created by this preparation.

PyPI's Gramlot JSON endpoint returned 404 during preparation; that neither
reserves the name nor guarantees PyPI will accept it. See the official
[packaging guide](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
and [new-project Trusted Publisher documentation](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/).

## Migration provenance

Copied, with originals preserved:

- Pages `0683f5dca8ea04b7047fed56e68317b27b9aa745`: Python source, page JS and tests.
- DOM `d888cefbb4dfb65868148afb2e00cabe84b4de08`: runtime, tests and dependency lock.
- Browser dependency pins remain Bag JS `faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a`
  and TYTX `6b9bf3a486014d92812caa3b06674083e646c5cd`.

Changes adapt module names, asset paths, package metadata, CLI defaults and test
locations. External host keys such as `genro.page_id` and runtime ownership
objects retain their established behavior. Historical documents and conversation
summaries remain under `docs/history` and `docs/context` without rewriting their
dated evidence as current API documentation.
