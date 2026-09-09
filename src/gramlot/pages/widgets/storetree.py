# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Interactive review cases for storeTree."""
from genro_bag import Bag

from ...widget_test_page import WidgetTestPage


class StoreTreeTestPage(WidgetTestPage):
    widget_tag = "storeTree"
    collection = "storetree"

    def test_01_basic(self, pane):
        """Try the component with the mouse and keyboard and observe its behavior."""
        data = Bag()
        data.set_item("folder", Bag(), caption="Folder")
        data.set_item("folder.first", "one", caption="First item")
        data.set_item("folder.second", "two", caption="Second item")
        pane.data(".store", data)
        pane.storeTree(store="^.store", labelAttribute="caption")

    def test_02_isolation(self, pane):
        """Independent instance: changes here must not affect the first example."""
        self.test_01_basic(pane)
