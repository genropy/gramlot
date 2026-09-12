# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""One Python-authored Gramlot navigation tree for the FastAPI example host."""
import json
import re
from html import escape
from pathlib import Path
from urllib.parse import urlencode

from gramlot.builder import GramlotBuilder

HERE = Path(__file__).resolve().parent


def catalogue(preview, database=False):
    entries = [dict(title='Introduction', url='/', group='Tutorial')]
    manifest = preview / 'navigation.json'
    if manifest.exists():
        entries.extend(json.loads(manifest.read_text()))
    else:
        for item in json.loads((HERE / 'teaching/manifest.json').read_text()):
            entries.append(dict(title=item['title'], url=f"/lessons/{item['slug']}/",
                                group='Tutorial / ' + item['group']))
    entries += [dict(title=title, url=url, group='Applications') for title, url in (
        ('Hello', '/hello/hello/'), ('Alfa', '/hello/alfa/'), ('Beta', '/hello/beta/'),
        ('Triangle RPC', '/page/triangle/'), ('OpenAPI Explorer', '/openapi/'),
    )]
    entries.append(dict(title='States, localities and customers', url='/database/states/',
                        group='Applications', disabled=not database))
    entries.append(dict(title='Customer dbSelect', url='/database/customer-select/',
                        group='Applications', disabled=not database))
    entries.append(dict(title='Visual Source builder', url='/builder/', group='Tools'))
    return entries


def recipe(entries, current):
    builder = GramlotBuilder('navigation')
    root = builder.root
    root.styleSheet(href='/assets/navigation-tree.css')
    root.styleSheet('''
        body { margin:0; background:#f5f7fb; color:#283340; font:15px/1.45 system-ui,sans-serif; }
        nav { padding:12px 10px; } h2 { margin:0 0 12px; font-size:17px; }
        a { display:block; color:inherit; text-decoration:none; padding:2px 6px; border-radius:3px; }
        a:hover { background:#e8edf4; } a[aria-current=page] { background:#dce9f6; color:#234f79; }
        .nav-tree { font:15px/1.45 system-ui,sans-serif; }
        .nav-tree summary,.nav-tree a { min-height:32px; padding:5px 7px; gap:8px; line-height:1.45; border-radius:3px; }
        .nav-tree summary::before,.nav-tree a::before { width:18px; height:18px; opacity:.75; }
        .nav-tree details details { margin-left:10px; }
        .nav-tree summary::marker { content:''; }
        details details { margin-left:10px; } details>div>a { margin-left:12px; }
        .unavailable { margin:3px 6px 3px 14px; color:#8a919b; font-size:12px; }
    ''')
    nav = root.nav(aria_label='Examples', class_='nav-tree')
    nav.h2('Gramlot examples')
    groups = {}
    for entry in entries:
        parent = nav
        parts = entry['group'].split(' / ')
        for index, part in enumerate(parts):
            key = ' / '.join(parts[:index + 1])
            if key not in groups:
                opened = any(e['url'] == current and
                             (e['group'] == key or e['group'].startswith(key + ' / ')) for e in entries)
                group = parent.details(open=opened)
                group.summary(part)
                groups[key] = group.div()
            parent = groups[key]
        if entry.get('disabled'):
            parent.div(entry['title'] + ' · DB not enabled', class_='unavailable')
        else:
            attrs = {'aria-current': 'page'} if current == entry['url'] else {}
            icon = 'book' if entry['group'].startswith('Tutorial') else ('grid' if entry['group'].startswith('Components') or entry['url'].startswith('/database/') else 'file')
            parent.a(entry['title'], href=entry['url'], target='_top',
                     **{'data-nav-icon':icon}, **attrs)
    return builder


SHELL_CSS = '''
body { margin:0!important; }
#example-host-shell { height:100dvh; --splitter-size:3px; --splitter-bg:linear-gradient(to right,transparent 1px,#dce3ee 1px,#dce3ee 2px,transparent 2px); }
#example-host-shell:not(:defined) { display:grid; grid-template-columns:290px minmax(0,1fr); }
#example-navigation-column { width:290px; height:100%; }
#example-navigation { display:block; box-sizing:border-box; height:100%; width:100%; border:0;  background:#f5f7fb; }
#example-surface { min-width:0; height:100%; overflow:auto; }
#example-surface > header { display:none; }
#example-surface .app-shell { display:block; }
#example-surface .app-shell > .sidebar { display:none; }
#example-surface .app-shell > main { padding:14px; }
@media(max-width:760px) { #example-navigation-column { width:180px; } }
'''


class ExampleNavigationShell:
    """Add host chrome to top-level documents, never to recipe frames or RPC.

    Navigation UI is a Gramlot Source recipe in an isolated host frame. Existing
    example runtimes and their inspectors keep their own Data and Source trees.
    """
    def __init__(self, app, imports):
        self.app = app
        self.imports = imports

    async def __call__(self, scope, receive, send):
        path = scope.get('path', '')
        eligible = scope['type'] == 'http' and (path == '/' or (
            path.startswith(('/lessons/', '/gallery/', '/reference/', '/builder/',
                             '/page/', '/hello/', '/openapi/', '/database/'))
            and (path.endswith('/') or path.endswith('/index.html'))))
        if not eligible:
            return await self.app(scope, receive, send)
        start = None
        body = []
        async def intercept(message):
            nonlocal start
            if message['type'] == 'http.response.start':
                headers = dict(message['headers'])
                if message['status'] == 200 and b'text/html' in headers.get(b'content-type', b''):
                    start = message
                    return
            if start is not None and message['type'] == 'http.response.body':
                body.append(message.get('body', b''))
                if message.get('more_body'):
                    return
                html = b''.join(body).decode('utf-8')
                url = '/example-navigation/?' + urlencode({'current':path})
                opening = ('<gnr-bordercontainer id="example-host-shell"><div id="example-navigation-column" slot="left" splitter="true" style="width:290px"><iframe id="example-navigation" '
                           f'title="Examples navigation" src="{escape(url, quote=True)}"></iframe></div>'
                           '<div id="example-surface">')
                existing = re.search(r'<script\b[^>]*type=[\"\']importmap[\"\'][^>]*>(.*?)</script>', html, re.S)
                imports = json.loads(existing[1])['imports'] if existing else self.imports
                dom_base = imports['gramlot-dom'].rsplit('/', 1)[0]
                bootstrap = (f"import '{dom_base}/collections/layout.js';"
                             f"import {{getCollection}} from '{dom_base}/collections.js';"
                             "getCollection('layout').defineComponents();")
                extra = '' if existing else '<script type="importmap">' + json.dumps({'imports':imports}).replace('<', '\\u003c') + '</script>'
                html = html.replace('</head>', extra + '<style>' + SHELL_CSS + '</style>'
                                    + '<script type="module">' + bootstrap + '</script></head>', 1)
                html = re.sub(r'(<body\b[^>]*>)', lambda m:m[1] + opening, html, count=1)
                html = html.replace('</body>', '</div></gnr-bordercontainer></body>', 1)
                payload = html.encode('utf-8')
                start['headers'] = [(k,v) for k,v in start['headers']
                                    if k.lower() not in (b'content-length', b'etag')]
                start['headers'].append((b'content-length', str(len(payload)).encode()))
                await send(start)
                await send({'type':'http.response.body', 'body':payload})
                return
            await send(message)
        await self.app(scope, receive, intercept)
