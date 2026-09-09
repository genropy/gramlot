# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Explicit page registration and navigation for the demonstration."""
from .application import WebpageApplication
from .menu import MenuBuilder
from .pages.playground import PlaygroundPage
from .pages.about import AboutPage
from .pages.hello_world import HelloWorldPage
from .pages.widgets import WIDGET_PAGES


class DemoMenu(MenuBuilder):
    """Keep navigation separate from page registration."""

    def main(self, root):
        examples = root.branch(label="Examples")
        examples.webpage(label="Hello World", filepath="hello")
        examples.webpage(label="Pages and menu", filepath="about")
        root.branch(label="Interactive laboratory").webpage(
            label="JavaScript and Bag", filepath="playground")
        gallery = root.branch(label="Web Component laboratory")
        for collection in ("inputs", "layout", "commands", "colorpicker", "storetree", "palette"):
            family = gallery.branch(label=collection)
            for path, page in WIDGET_PAGES.items():
                if page.collection == collection:
                    family.webpage(label=page.widget_tag, filepath=path)


class DemoApplication(WebpageApplication):
    """An application hosting independently authored pages."""

    def __init__(self, **kwargs):
        super().__init__(pages={"hello": HelloWorldPage, "about": AboutPage, "playground": PlaygroundPage, **WIDGET_PAGES},
                         menu_class=DemoMenu, default_page="hello", **kwargs)
