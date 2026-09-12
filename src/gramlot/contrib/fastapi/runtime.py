"""Browser runtime wiring for the installed Gramlot wheel.

These paths describe the current wheel layout. An application author does not
configure them. This optional adapter owns this wheel-specific knowledge.
"""

import json
import re
from pathlib import Path, PurePosixPath

import gramlot
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

# Public URL segment reserved by this adapter.
RUNTIME_SEGMENT = '_runtime'

# Asset group -> directory relative to Gramlot's packaged resources.
PACKAGE_ASSET_DIRECTORIES = {
    'dom': 'gramlot-dom/src',
    'bag': 'genro-bag-js/src',
    'tytx': 'genro-tytx/js/src',
    'pages': 'pages',
    'decimal': 'decimal.js',
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
    'decimal.js': 'decimal/decimal.mjs',
    '@msgpack/msgpack': 'msgpack/index.mjs',
    '@xmldom/xmldom': 'pages/xmldom.js',
    'module': 'common/module.js',
}


class BrowserStaticFiles(StaticFiles):
    """Only successful responses from an immutable build receive long caching."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code in (200, 206, 304):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response


class RuntimeAssets:
    """Translate shared disk paths into URLs under one application's prefix."""

    def __init__(self, prefix: str):
        self.prefix = prefix
        self.base_url = f'{prefix}/{RUNTIME_SEGMENT}/'
        self.entry_url = self.base_url + 'common/entry.js'
        self.frontend_directory = Path(__file__).parent / 'frontend'
        self.package_directory = Path(gramlot.__file__).resolve().parent / 'resources'
        self.browser_directory = self.package_directory / 'browser'
        self.browser_manifest = self._load_browser_manifest()
        if self.browser_manifest is not None:
            self.base_url += self.browser_manifest['buildId'] + '/'
            self.entry_url = self.base_url + self.browser_manifest['entryPoints']['gramlot-page-startup']

    def _load_browser_manifest(self):
        manifest_path = self.browser_directory / 'manifest.json'
        if not manifest_path.exists():
            return None
        manifest = json.loads(manifest_path.read_text())
        if manifest.get('schemaVersion') != 1:
            raise ValueError('Unsupported Gramlot browser manifest schema')
        if not re.fullmatch(r'[0-9a-f]{16,64}', manifest.get('buildId', '')):
            raise ValueError('Invalid Gramlot browser buildId')
        entries = manifest.get('entryPoints', {})
        for required in ('gramlot-dom', 'gramlot-builder', 'gramlot-page-startup'):
            if required not in entries:
                raise ValueError(f'Missing Gramlot browser entry point: {required}')
        for name, relative in entries.items():
            if (not isinstance(relative, str) or '\\' in relative
                    or PurePosixPath(relative).is_absolute()
                    or '..' in PurePosixPath(relative).parts
                    or not (self.browser_directory / relative).is_file()):
                raise ValueError(f'Invalid or missing Gramlot browser entry point: {name}')
        return manifest

    def mount(self, app: FastAPI) -> None:
        if self.browser_manifest is not None:
            app.mount(
                self.base_url.rstrip('/'),
                GZipMiddleware(BrowserStaticFiles(directory=self.browser_directory), minimum_size=500),
                name=f'{self.prefix}-browser',
            )
            return
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
        if self.browser_manifest is not None:
            return {name: self.base_url + path
                    for name, path in self.browser_manifest['entryPoints'].items()
                    if name != 'gramlot-page-startup'}
        return {name: self.base_url + path for name, path in IMPORT_PATHS.items()}

    def document_template(self) -> str:
        return (self.frontend_directory / 'index.html').read_text()
