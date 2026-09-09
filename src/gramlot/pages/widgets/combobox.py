# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Local choices and commit behavior for comboBox."""
from ...widget_test_page import WidgetTestPage


class ComboBoxTestPage(WidgetTestPage):
    widget_tag = "comboBox"
    collection = "inputs"

    def test_01_basic(self, pane):
        """Choose an option and check the Bag value after confirming."""
        pane.data(".value", "Italy")
        pane.comboBox(value="^.value", values="IT:Italy,FR:France,DE:Germany", lbl="Country")
        pane.p("You can also type a country not in the list: the text is stored.")
        pane.pre("^.value")

    def test_02_isolation(self, pane):
        """Independent second field with simple options and an initially empty value."""
        pane.data(".value", "")
        pane.comboBox(value="^.value", values="Red,Green,Blue", lbl="Color")
        pane.pre("^.value")
