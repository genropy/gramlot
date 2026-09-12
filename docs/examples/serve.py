# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Run all repository examples through the optional FastAPI adapter."""
import argparse
import importlib.util
from urllib.parse import urlencode
import os
from pathlib import Path
import subprocess
import sys

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from gramlot.contrib.fastapi import mount_gramlot

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PRODUCTS = (
    {'id': 1, 'name': 'Desk lamp', 'price': 49, 'available': True},
    {'id': 2, 'name': 'Notebook', 'price': 12, 'available': True},
    {'id': 3, 'name': 'Oak desk', 'price': 320, 'available': False},
)


class Quote(BaseModel):
    model_config = ConfigDict(strict=True)
    productId: int
    quantity: int = Field(ge=1)
    note: str | None = None


def create_app(preview: Path | None = None, *, genropy_application=None) -> FastAPI:
    """Compose static recipes, live Python pages and synthetic API fixtures."""
    preview = (preview or ROOT / 'build/teaching-preview').resolve()
    if not (preview / 'index.html').is_file():
        raise ValueError('Build the example preview first; run serve.py without --no-build.')
    versions = [p for p in (preview / 'runtime').iterdir() if p.is_dir()]
    if len(versions) != 1:
        raise ValueError('Expected one generated runtime version; rebuild the examples.')
    app = FastAPI(title='Gramlot examples')
    mount_gramlot(app, HERE / 'triangle-rpc', prefix='/page', title='Triangle RPC')
    navigation_host = mount_gramlot(app, HERE / 'hello', prefix='/hello', title='Hello pages')
    spec = importlib.util.spec_from_file_location('gramlot_example_navigation', HERE / 'navigation.py')
    navigation = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(navigation)
    entries = navigation.catalogue(preview, database=genropy_application is not None)

    @app.get('/example-navigation/')
    def navigation_document(current: str = '/'):
        return navigation_host.html_document('/example-navigation/recipe?' + urlencode({'current':current}), inspector=False)

    @app.get('/example-navigation/recipe')
    def navigation_recipe(current: str = '/'):
        return navigation_host.recipe_response(navigation.recipe(entries, current))

    app.add_middleware(navigation.ExampleNavigationShell, imports=navigation_host.runtime.import_map())

    if genropy_application is not None:
        from gramlot.contrib.fastapi_genropy import mount_genropy
        mount_genropy(app, HERE / 'states-grid', prefix='/database',
                      genropy_application=genropy_application, title='Database examples')

    @app.get('/api/products')
    def products(q: str = '', available: bool | None = None):
        return [p for p in PRODUCTS if q.lower() in p['name'].lower()
                and (available is None or p['available'] == available)]

    @app.get('/api/products/{product_id}')
    def product(product_id: int):
        row = next((p for p in PRODUCTS if p['id'] == product_id), None)
        if row is None:
            raise HTTPException(404, 'Product not found')
        return row

    @app.post('/api/quote')
    def quote(request: Quote):
        row = next((p for p in PRODUCTS if p['id'] == request.productId), None)
        if row is None:
            raise HTTPException(422, 'Choose a valid product ID')
        return dict(product=row['name'], quantity=request.quantity,
                    total=row['price'] * request.quantity, currency='EUR', note=request.note)

    # The standalone Python host uses unversioned import aliases. Point them to
    # the same prepared runtime used by the versioned tutorial/gallery frames.
    for directory in versions[0].iterdir():
        if directory.is_dir():
            app.mount(f'/runtime/{directory.name}', StaticFiles(directory=directory))
    app.mount('/openapi', StaticFiles(directory=HERE / 'gramlot-api-poc', html=True))
    # Last: the generated tutorial also contains gallery and visual builder.
    app.mount('/', StaticFiles(directory=preview, html=True))
    return app


def build():
    env = dict(os.environ, PYTHONPATH=str(ROOT / 'src'), PYTHONDONTWRITEBYTECODE='1')
    for script in ('scripts/prepare_assets.py', 'docs/examples/teaching/build_preview.py',
                   'docs/examples/gramlot-api-poc/build.py'):
        subprocess.run([sys.executable, str(ROOT / script)], cwd=ROOT, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', default=8051, type=int)
    parser.add_argument('--no-build', action='store_true', help='Use the existing generated examples')
    parser.add_argument('--genropy-instance', help='Enable the optional legacy DB example')
    options = parser.parse_args()
    if not options.no_build:
        build()
    import uvicorn
    genropy_application = None
    if options.genropy_instance:
        from gnr.app.gnrapp import GnrApp
        genropy_application = GnrApp(options.genropy_instance)
    uvicorn.run(create_app(genropy_application=genropy_application), host=options.host, port=options.port)


if __name__ == '__main__':
    main()
