# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Floating palette examples authored entirely as Python recipes."""
from ...widget_test_page import WidgetTestPage


class PaletteTestPage(WidgetTestPage):
    widget_tag = "palette"
    collection = "palette"

    def test_01_basic(self, pane):
        """Open, drag and resize the palette. Closing it preserves the text."""
        self.build_palette(pane, "First palette", "80px", opened=True)

    def test_02_isolation(self, pane):
        """Independent second palette: open both and bring either one to the front."""
        self.build_palette(pane, "Second palette", "300px", keyboard=True)

    def build_palette(self, pane, title, left, opened=False, keyboard=False):
        """Create a toggle and a floating container with persistent local data."""
        pane.data(".open", opened)
        pane.data(".text", "This text survives closing and reopening")
        pane.checkbox(checked="^.open", label="Open palette")
        palette = pane.palette(title=title, value="^.open", left=left, keyboard=keyboard,
                               top="150px", width="460px", height="300px")
        palette.p("Drag the title; resize from the bottom right corner.")
        palette.textBox(value="^.text", lbl="Text")
        if keyboard:
            palette.p("Keyboard enabled: arrow keys on the title or corner; Shift for small steps. Esc closes.")
        else:
            palette.p("Advanced keyboard controls disabled (keyboard=False).")
