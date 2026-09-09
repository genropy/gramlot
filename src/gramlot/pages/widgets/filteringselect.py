# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Local choices and commit behavior for filteringSelect."""
from ...widget_test_page import WidgetTestPage


class FilteringSelectTestPage(WidgetTestPage):
    widget_tag = "filteringSelect"
    collection = "inputs"

    def test_01_basic(self, pane):
        """Choose an option and check the Bag value after confirming."""
        pane.data(".value", "IT")
        pane.filteringSelect(value="^.value", values="IT:Italy,FR:France,DE:Germany", lbl="Country")
        pane.p("Displays the caption and stores the code. Unlisted text is rejected.")
        pane.pre("^.value")

    def test_02_isolation(self, pane):
        """Independent second field with simple options and an initially empty value."""
        pane.data(".value", "")
        pane.filteringSelect(value="^.value", values="Red,Green,Blue", lbl="Color")
        pane.pre("^.value")
