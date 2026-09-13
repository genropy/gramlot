"""Read-only filesystem browsing through the common FastAPI example host."""
from pathlib import Path

from gramlot.filesystem import FileSystemPageMixin
from gramlot.page import WebPage


class Page(FileSystemPageMixin, WebPage):
    example_view = True
    filesystem_roots = {'examples': Path(__file__).resolve().parents[1]}

    def main(self, root):
        root.p('Expand a directory to load its children from the server.')
        root.fileSystemTree('examples', height='320px')
