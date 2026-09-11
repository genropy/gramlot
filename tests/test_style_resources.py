"""Python CSS declarations survive transport and share the browser lifecycle."""
from pathlib import Path
import subprocess

from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx


def test_css_resource_transport():
    class Page(GramlotBuilder):
        def main(self, root):
            root.div(node_id='resources').styleSheet('^sheet', cssTitle='page')
            root.css('.sample', 'color: red')
            root.css('.complete {padding: 2px}')
            root.styleSheet(href='^url')

    builder = Page('main')
    builder.create()
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ['node', '--experimental-loader', str(root / 'tests/lab_loader.mjs'),
         '--input-type=module', '-e', '''
import {readFileSync} from 'node:fs';
import {fromTytx} from 'genro-tytx';
import {verifyResources} from './js/dom/tests/style-resources.test.js';
import {HtmlBuilder} from './js/dom/src/contrib/html/html-builder.js';
const builder = new HtmlBuilder('main');
builder.loadSource(fromTytx(readFileSync(0, 'utf8'), 'json'));
verifyResources(builder);
'''], input=to_tytx(builder.source, 'json'), text=True,
        capture_output=True, cwd=root, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
