from genro_toolbox import metadata
from gramlot.page import WebPage


@metadata(title="Hello")
class Page(WebPage):
    """Display a greeting to introduce a Python-authored Gramlot page."""

    def main(self, root):
        root.h1("Hello World")
