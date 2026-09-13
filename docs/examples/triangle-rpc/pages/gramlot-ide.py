"""A disposable editable workspace, never the framework's own source files."""
from pathlib import Path
import tempfile

from gramlot.filesystem import FileSystemPageMixin
from gramlot.page import WebPage


WORKSPACE = Path(tempfile.mkdtemp(prefix='gramlot-ide-example-'))
(WORKSPACE / 'welcome.py').write_text('def hello(name):\n    return f"Hello, {name}!"\n', encoding='utf-8')
(WORKSPACE / 'notes.md').write_text('# Gramlot IDE\n\nOpen documents with a double-click.\n', encoding='utf-8')


class Page(FileSystemPageMixin, WebPage):
    example_view = True
    filesystem_roots = {'demo': WORKSPACE}
    filesystem_writable_roots = ('demo',)

    def main(self, root):
        root.p('This workspace is temporary. Save writes only these demonstration files.')
        root.gramlotIde(root='demo', initialpath='welcome.py', writable=True,
                        datapath='ide', height='520px')
