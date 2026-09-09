# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for tabContainer."""
from ...widget_test_page import WidgetTestPage


class TabContainerTestPage(WidgetTestPage):
    widget_tag = "tabContainer"
    collection = "layout"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        pane.data(".selected", "first")
        pane.filteringSelect(value="^.selected", values="first:First,second:Second", lbl="Page")
        tabs = pane.tabContainer(selectedPage="^.selected", height="180px")
        tabs.contentPane(pageName="first", title="First").div("First page content")
        tabs.contentPane(pageName="second", title="Second").div("Second page content")
        pane.p("Selected page:")
        pane.pre("^.selected")

    def test_02_isolation(self, pane):
        """Set index 0 or 1 to switch tabs; the fields retain their text."""
        pane.data(".selected", 0)
        pane.numberTextBox(value="^.selected", lbl="Index: 0 / 1")
        pane.data(".hide_second", False)
        pane.data(".disable_second", False)
        pane.checkbox(checked="^.hide_second", label="Hide Second")
        pane.checkbox(checked="^.disable_second", label="Disable Second")
        pane.p("The × removes the page; reload to recreate it.")
        tabs = pane.tabContainer(selected="^.selected", height="200px")
        first = tabs.tab(key="first", label="First", closable=True)
        first.p("Type here, switch to the second tab and back: the text should remain.")
        first.textBox(value="", lbl="Local text without binding")
        second = tabs.tab(key="second", label="Second", closable=True, hidden="^.hide_second", disabled="^.disable_second")
        second.p("This tab has an independent field.")
        second.textBox(value="", lbl="Another local field")
