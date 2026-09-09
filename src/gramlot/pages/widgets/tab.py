# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for tab."""
from ...widget_test_page import WidgetTestPage


class TabTestPage(WidgetTestPage):
    widget_tag = "tab"
    collection = "layout"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        pane.data(".selected", "first")
        tabs = pane.tabContainer(value="^.selected", height="180px")
        tabs.tab(key="first", label="First").div("First page content")
        tabs.tab(key="second", label="Second").div("Second page content")
        pane.p("Selected page:")
        pane.pre("^.selected")

    def test_02_isolation(self, pane):
        """Independent instance: changes here must not affect the first example."""
        self.test_01_basic(pane)
