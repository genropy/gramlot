# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for dateTextBox."""
from ...widget_test_page import WidgetTestPage


class DateTextBoxTestPage(WidgetTestPage):
    widget_tag = "dateTextBox"
    collection = "inputs"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        pane.data(".value", "2026-09-06")
        pane.dateTextBox(value="^.value", lbl="Test value")
        pane.p("Value in the Bag:")
        pane.pre("^.value")

    def test_02_isolation(self, pane):
        """Independent instance: changes here must not affect the first example."""
        self.test_01_basic(pane)
