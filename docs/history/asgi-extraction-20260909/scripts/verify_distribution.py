# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Smoke-check an installed Gramlot wheel, including its browser resource manifest."""
import asyncio
from hashlib import sha256
from importlib.metadata import version
from pathlib import Path
import json

import gramlot
from genro_asgi import AsgiServer
from genro_tytx import from_tytx
from gramlot.demo import DemoApplication


class DistributionCheck:
    async def request(self, server, path, query=b''):
        messages = []
        async def receive():
            return {'type': 'http.request', 'body': b'', 'more_body': False}
        async def send(message):
            messages.append(message)
        await server({'type': 'http', 'method': 'GET', 'path': path,
                      'query_string': query, 'headers': []}, receive, send)
        return messages[0]['status'], b''.join(item.get('body', b'') for item in messages[1:])

    async def run(self):
        package = Path(gramlot.__file__).parent
        if package.parent.name != 'site-packages':
            raise RuntimeError('Run this check against an installed wheel, not a source checkout')
        resources = package / 'resources'
        manifest = json.loads((resources / 'manifest.json').read_text())
        for name, expected in manifest['assets'].items():
            assert sha256((resources / name).read_bytes()).hexdigest() == expected, name
        app = DemoApplication()
        assert all(path.is_relative_to(resources) for path in app.client_roots.values())
        server = AsgiServer(applications=[app])
        status, document = await self.request(server, '/')
        assert status == 200 and b'Gramlot' in document
        assert b'gramlot-dom' in document
        for transport in ('json', 'msgpack'):
            status, body = await self.request(server, '/main', f'transport={transport}'.encode())
            assert status == 200
            source = from_tytx(body if transport == 'msgpack' else body.decode(), transport=transport)
            assert source['div_0.h1_0'] == 'Hello World'
        for prefix, directory in app.client_roots.items():
            for path in directory.rglob('*'):
                if path.is_file() and path.suffix in ('.js', '.mjs', '.css'):
                    status, body = await self.request(server, f'/_assets/{prefix}/{path.relative_to(directory)}')
                    assert status == 200 and body == path.read_bytes(), path
        status, _ = await self.request(server, '/_assets/dom/../../LICENSE')
        assert status == 404
        print(f"Gramlot {version('gramlot')}: installed wheel, typed recipes and all browser assets OK")


if __name__ == '__main__':
    asyncio.run(DistributionCheck().run())
