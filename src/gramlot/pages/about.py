# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Second page for exercising navigation."""
from ..page import WebPage


class AboutPage(WebPage):
    """Explain the page/menu experiment."""

    def main(self, root):
        pane = root.div(class_="hello")
        pane.h1("Pages and menu")
        pane.p("Each page is a Python class in the pages folder.")
        pane.p("The menu is a separate Bag defining labels, order and groups.")
