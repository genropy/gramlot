# Gramlot

<img src="https://raw.githubusercontent.com/genropy/gramlot/main/assets/gramlot-logo.png" alt="Gramlot logo" width="180">

**GRAMmar for Live Object Trees**

Describe interfaces in Python and render them with the Gramlot JavaScript runtime.
The first alpha includes typed Source transport, widgets and an optional FastAPI
integration with automatic page discovery.

## FastAPI integration

Create `pages/hello.py` in your application directory:

```python
from genro_toolbox import metadata
from gramlot.page import WebPage

@metadata(title="Hello")
class Page(WebPage):
    """Display a greeting."""

    def main(self, root):
        root.h1("Hello World")
```

Install the alpha and start the application:

```sh
python -m pip install 'gramlot[fastapi]==0.1.0a1'
gramlot fastapi serve /path/to/my_app
```

Open `http://127.0.0.1:8000/page/`. No `main.py` or JSON registry is required.
For custom servers, use `GramlotApplication` or `mount_gramlot` from
`gramlot.contrib.fastapi`. More integrations coming soon.

## Documentation

- [Getting started](docs/source/guide/first-page.rst)
- [FastAPI integration](docs/source/guide/fastapi.rst)
- [Pages and reserved metadata](docs/source/reference/pages.rst)
- [Documentation development](docs/development/building-docs.rst)

[Gramlot 0.1.0a1 is available on PyPI](https://pypi.org/project/gramlot/0.1.0a1/). See
[build and release instructions](docs/release.md).

## Development

```sh
npm --prefix js/dom ci --ignore-scripts
python scripts/prepare_assets.py
python scripts/prepare_test_client.py
python -m pip install '.[test,fastapi]' httpx
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" python -m pytest -q
npm --prefix js/dom test
```

Documentation builds independently from runtime packages. See `docs/requirements.txt`.
Gramlot is licensed under Apache 2.0.
