# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive component cases following legacy TestHandler's test_* convention.

Each case has its own datapath and live/Python tabs. These are exploratory
pages, not a claim that a component passes the legacy or accessibility audit.
"""
import inspect
import textwrap

from .page import WebPage
from .widget_test_builder import WidgetTestBuilder


class WidgetTestPage(WebPage):
    source_builder = WidgetTestBuilder
    client_builder = ("/_assets/pages/gallery.js", "GalleryBuilder")
    widget_tag = ""
    collection = ""

    def main(self, root):
        root.h1(self.widget_tag)
        root.p("Component laboratory · initial examples, review in progress")
        root.p("To review: legacy compatibility, keyboard and focus, ARIA, themes, "
               "resizing, events and destruction.")
        for name in sorted(n for n in dir(self) if n.startswith("test_") and callable(getattr(self, n))):
            method = getattr(self, name)
            card = root.div(class_="widget-test-card", datapath=f"tests.{self.widget_tag}.{name}")
            card.h2(name)
            card.p(inspect.getdoc(method) or "")
            tabs = card.tabContainer(value="live", class_="widget-example-tabs")
            method(tabs.tab(key="live", label="Live").div(class_="widget-test-body"))
            tabs.tab(key="python", label="Python").div(
                textwrap.dedent(inspect.getsource(method)),
                class_="python-recipe language-python", tabindex=0,
                aria_label="Python recipe")
