// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Static preview only: no Python process, application endpoints or RPC.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname, sep} from 'node:path';

const root = fileURLToPath(new URL('../../../build/teaching-preview/recipes', import.meta.url));
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.tytx': 'application/json'};
createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const path = resolve(root, '.' + decodeURIComponent(url.pathname)
            + (url.pathname.endsWith('/') ? 'index.html' : ''));
        if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
        const bytes = await readFile(path);
        response.writeHead(200, {'Content-Type': types[extname(path)] || 'application/octet-stream',
            'Cache-Control': 'no-store'}).end(bytes);
    } catch { response.writeHead(404).end(); }
}).listen(8053, '127.0.0.1', () => console.log('Recipe preview: http://127.0.0.1:8053/'));
