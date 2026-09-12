# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Verify an installed wheel without a hosting framework."""
from hashlib import sha256
from importlib.metadata import version
from importlib.util import find_spec
from pathlib import Path
import json

import gramlot
from gramlot.builder import GramlotBuilder
from gramlot.pages.hello_world import HelloWorldPage
from gramlot.transport import to_tytx
from genro_tytx import from_tytx


def main():
    package = Path(gramlot.__file__).parent
    assert package.parent.name == 'site-packages', 'Use an installed wheel'
    assert find_spec('genro_asgi') is None, 'Use a clean environment without ASGI'
    resources = package / 'resources'
    manifest = json.loads((resources / 'manifest.json').read_text())
    for name, expected in manifest['assets'].items():
        assert sha256((resources / name).read_bytes()).hexdigest() == expected, name
    browser = resources / 'browser'
    browser_manifest = json.loads((browser / 'manifest.json').read_text())
    assert browser_manifest['schemaVersion'] == 1
    assert browser_manifest['frameworkVersion'] == version('gramlot')
    for item in browser_manifest['files']:
        path = browser / item['path']
        assert path.stat().st_size == item['size'], item['path']
        assert sha256(path.read_bytes()).hexdigest() == item['sha256'], item['path']
    assert all((browser / path).is_file()
               for path in browser_manifest['entryPoints'].values())
    for forbidden in ('application.py', 'worker.py', 'server_configuration.py', 'page_document.py'):
        assert not (package / forbidden).exists(), forbidden
    for forbidden in ('rpc.js', 'application.js', 'bootstrap.js'):
        assert not (resources / 'pages' / forbidden).exists(), forbidden
    builder = GramlotBuilder()
    HelloWorldPage().main(builder.root)
    for transport in ('json', 'msgpack'):
        source = from_tytx(to_tytx(builder.source, transport), transport)
        assert source['div_0.h1_0'] == 'Hello World'
    print(f'Gramlot {version("gramlot")}: host-independent wheel, typed recipes and browser distribution OK')


if __name__ == '__main__':
    main()
