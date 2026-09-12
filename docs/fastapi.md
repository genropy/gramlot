# FastAPI guide

The maintained English guide is now part of the Sphinx manual:

- [First three pages](source/guide/first-page.rst)
- [Using Gramlot with FastAPI](source/guide/fastapi.rst)
- [Pages, metadata and reserved names](source/reference/pages.rst)
- [FastAPI reference](source/reference/fastapi.rst)
- [Building the manual](development/building-docs.rst)

Build from the repository root:

```sh
python -m pip install -r docs/requirements.txt
python -m sphinx -W --keep-going -b html docs/source docs/_build/html
gramlot manual --directory docs/_build/html --port 8037
```

## Prebuilt browser runtime

When an installed distribution contains `resources/browser/manifest.json`, the
adapter serves that prebuilt runtime automatically. Pages share its versioned
`_runtime/<buildId>/` URLs, with immutable caching and gzip for static resources.
No Node installation or runtime compilation is needed on the application server.
HTML and recipe responses are not given immutable caching by this adapter.

A source checkout without a browser distribution continues to serve the original
ES modules for development. An invalid or incomplete present browser manifest
fails explicitly rather than silently switching runtime versions. The browser
ZIP and the corresponding Python wheel are intended to contain the same payload;
see [browser distribution](development/browser-distribution-proposal.md).


## Common example environment

All repository examples now use one FastAPI host:

```sh
.venv/bin/python docs/examples/serve.py
```

See [example routes and instructions](examples/README.md). The static tutorial
and gallery remain browser recipes, and Python endpoints use the same optional
adapter. No GenroPy or Genro ASGI installation is required.
