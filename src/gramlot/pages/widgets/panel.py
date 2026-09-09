# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for panel."""
from ...widget_test_page import WidgetTestPage


class PanelTestPage(WidgetTestPage):
    widget_tag = "panel"
    collection = "layout"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        box = pane.panel(caption="Test container")
        box.p("Container content")
        box.input(placeholder="Type and check that the content remains usable")

    def test_02_isolation(self, pane):
        """Independent instance: changes here must not affect the first example."""
        self.test_01_basic(pane)
