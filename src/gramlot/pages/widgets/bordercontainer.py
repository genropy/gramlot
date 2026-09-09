# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for borderContainer."""
from ...widget_test_page import WidgetTestPage


class BorderContainerTestPage(WidgetTestPage):
    widget_tag = "borderContainer"
    collection = "layout"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        border = pane.borderContainer(height="220px", design="headline")
        border.div("Header", slot="top", height="35px", background="#dceafb")
        border.div("Sidebar", slot="left", width="120px", splitter=True,
                   background="#fff0c2", min_height="100%")
        border.div("Center: resize the side region",
                   background="#e0f2df", min_height="100%")

    def test_02_isolation(self, pane):
        """Resize the side, then change design: size and text should be preserved."""
        pane.data(".design", "headline")
        pane.filteringSelect(value="^.design", values="headline,sidebar", lbl="Design")
        border = pane.borderContainer(height="340px", design="^.design")
        border.div("Header", slot="top", height="45px", background="#dceafb", splitter=True)
        border.div("Drag the splitter", slot="left", width="140px", splitter=True,
                   background="#fff0c2", min_height="100%")
        border.div("Right", slot="right", width="90px", splitter=True,
                   background="#f8dedc", min_height="100%")
        center = border.div(background="#e0f2df", min_height="100%")
        center.p("The center scrolls; changing design must not recreate the field.")
        center.textBox(value="", lbl="Local text")
        for index in range(15):
            center.p(f"Row {index + 1}")
        border.div("Footer", slot="bottom", height="40px", background="#eedff5", splitter=True)
