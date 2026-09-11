"""Python-authored URL resolvers execute in the browser runtime."""
import os
import subprocess
from pathlib import Path
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx


def test_python_openapi_resolver():
    root = Path(__file__).resolve().parents[1]
    builder = GramlotBuilder('example')
    builder.root.data('url', 'https://example.test/openapi.json')
    builder.root.openApiResolver('schema', url='^url', status='state')
    script = '''
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {setupDom} from './js/dom/tests/dom.js';
import {Application, HtmlBuilder} from './js/dom/src/index.js';
import {fromTytx} from 'genro-tytx';
setupDom();
globalThis.fetch=async()=>new Response(JSON.stringify({openapi:'3.0.3',info:{title:'Python',version:'1'},paths:{}}));
const builder=new HtmlBuilder('example');builder.loadSource(fromTytx(readFileSync(0,'utf8'),'json'));
const host=document.body.appendChild(document.createElement('div'));
const app=new Application(host,builder,{inspector:false});
await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(app.data.getItem('example.schema').getNode('info').attr.title,'Python');
assert.equal(app.data.getItem('example.state.state'),'ready');
app.dispose();
'''
    result = subprocess.run(['node','--experimental-loader',str(root/'tests/lab_loader.mjs'),
                             '--input-type=module','-e',script],cwd=root,
                            env={**os.environ,'GRAMLOT_CLIENT_MODULES':str(root/'build/test-client')},
                            input=to_tytx(builder.source),text=True,capture_output=True,timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr
