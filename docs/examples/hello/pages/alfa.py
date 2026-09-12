from genro_toolbox import metadata
from gramlot.page import WebPage


@metadata(title="Alfa")
class Page(WebPage):
    """Display the first additional page in the discovery example."""

    example_view = True

    def main(self, root):
        root.h1("Alfa page")
