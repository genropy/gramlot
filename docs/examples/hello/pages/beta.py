from genro_toolbox import metadata
from gramlot.page import WebPage


@metadata(title="Beta")
class Page(WebPage):
    """Display the second additional page in the discovery example."""

    example_view = True

    def main(self, root):
        root.h1("Beta page")
