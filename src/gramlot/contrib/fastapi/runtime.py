"""Browser runtime wiring for the installed Gramlot wheel.

These paths describe the current wheel layout. An application author does not
configure them. This optional adapter owns this wheel-specific knowledge.
"""

from pathlib import Path

import gramlot
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Public URL segment reserved by this adapter.
RUNTIME_SEGMENT = '_runtime'

# Asset group -> directory relative to Gramlot's packaged resources.
PACKAGE_ASSET_DIRECTORIES = {
    'dom': 'gramlot-dom/src',
    'bag': 'genro-bag-js/src',
    'tytx': 'genro-tytx/js/src',
    'pages': 'pages',
    'msgpack': 'genro-tytx/js/node_modules/@msgpack/msgpack/dist.esm',
}

# JavaScript import specifier -> URL relative to this application's runtime base.
# Prefix entries ending in '/' also resolve imports of individual submodules.
IMPORT_PATHS = {
    'gramlot-dom': 'dom/index.js',
    'gramlot-builder': 'pages/builder.js',
    '/_assets/dom/': 'dom/',
    'genro-bag-js': 'bag/index.js',
    '#uuid': 'bag/browser-uuid.js',
    'genro-tytx': 'tytx/index.js',
    'genro-tytx/': 'tytx/',
    '@msgpack/msgpack': 'msgpack/index.mjs',
    '@xmldom/xmldom': 'pages/xmldom.js',
    'module': 'common/module.js',
}


class RuntimeAssets:
    """Translate shared disk paths into URLs under one application's prefix."""

    def __init__(self, prefix: str):
        self.prefix = prefix
        self.base_url = f'{prefix}/{RUNTIME_SEGMENT}/'
        self.entry_url = self.base_url + 'common/entry.js'
        self.frontend_directory = Path(__file__).parent / 'frontend'
        self.package_directory = Path(gramlot.__file__).resolve().parent / 'resources'

    def mount(self, app: FastAPI) -> None:
        directories = {
            name: self.package_directory / relative_path
            for name, relative_path in PACKAGE_ASSET_DIRECTORIES.items()
        }
        directories['common'] = self.frontend_directory
        for name, directory in directories.items():
            app.mount(
                self.base_url + name,
                StaticFiles(directory=directory),
                name=f'{self.prefix}-{name}',
            )

    def import_map(self) -> dict[str, str]:
        return {name: self.base_url + path for name, path in IMPORT_PATHS.items()}

    def document_template(self) -> str:
        return (self.frontend_directory / 'index.html').read_text()
