# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Legacy named and positional stack selection with independent examples."""
from ...widget_test_page import WidgetTestPage


class StackContainerTestPage(WidgetTestPage):
    widget_tag = "stackContainer"
    collection = "layout"

    def test_01_basic(self, pane):
        """Select by name; the buttons follow the visible page."""
        pane.data(".page", "first")
        pane.filteringSelect(value="^.page", values="first:First,second:Second", lbl="Page")
        pane.stackButtons(stackNodeId="stackContainer_named")
        stack = pane.stackContainer(selectedPage="^.page", nodeId="stackContainer_named", height="150px")
        stack.contentPane(pageName="first", title="First", background="#e0f2df").textBox(value="", lbl="Text to preserve")
        stack.contentPane(pageName="second", title="Second", background="#dceafb").p("Second page")
        pane.pre("^.page")

    def test_02_isolation(self, pane):
        """Select index 0 or 1; this instance is independent."""
        pane.data(".index", 0)
        pane.numberTextBox(value="^.index", lbl="Index (0 / 1)")
        pane.data(".hide_second", False)
        pane.data(".disable_second", False)
        pane.checkbox(checked="^.hide_second", label="Hide Second")
        pane.checkbox(checked="^.disable_second", label="Disable Second")
        pane.p("The × removes the page; reload to recreate it.")
        pane.stackButtons(stackNodeId="stackContainer_indexed")
        stack = pane.stackContainer(selected="^.index", nodeId="stackContainer_indexed", height="150px")
        stack.contentPane(pageName="first", title="First", closable=True, background="#fff0c2").textBox(value="", lbl="Another local field")
        stack.contentPane(pageName="second", title="Second", closable=True, hidden="^.hide_second", disabled="^.disable_second", background="#eedff5").p("Index 1")
        pane.pre("^.index")
