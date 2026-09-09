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
