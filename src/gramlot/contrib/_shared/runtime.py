"""Browser runtime wiring for the installed Gramlot wheel.

These paths describe the current wheel layout. An application author does not
configure them. This optional adapter owns this wheel-specific knowledge.
"""

import json
import re
from uuid import uuid4
from html import escape
from pathlib import Path, PurePosixPath

import gramlot

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
    'gramlot-editors': 'pages/codemirror-component.js',
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
        else:
            # Source modules change without a release/build ID. Give each host
            # instance a fresh namespace, including every transitive import.
            self.base_url += 'dev-' + uuid4().hex + '/'
            self.entry_url = self.base_url + 'common/entry.js'

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

    def import_map(self) -> dict[str, str]:
        if self.browser_manifest is not None:
            return {name: self.base_url + path
                    for name, path in self.browser_manifest['entryPoints'].items()
                    if name != 'gramlot-page-startup'}
        return {name: self.base_url + path for name, path in IMPORT_PATHS.items()}

    def document_template(self) -> str:
        return (self.frontend_directory / 'index.html').read_text()


def script_json(value):
    """Escape JSON embedded in an HTML script element."""
    return json.dumps(value).replace('<', r'\u003c')


def render_document(template, runtime, title, startup):
    """Render identical startup HTML for every host; hosts supply request metadata."""
    replacements = {
        '__TITLE__': escape(title),
        '__IMPORTS__': script_json({'imports': runtime.import_map()}),
        '__STARTUP__': script_json(startup),
        '__ENTRY__': escape(runtime.entry_url, quote=True),
    }
    return re.sub(r'__(?:TITLE|IMPORTS|STARTUP|ENTRY)__',
                  lambda match: replacements[match.group()], template)
