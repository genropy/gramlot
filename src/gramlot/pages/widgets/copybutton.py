# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Clipboard button with success and failure feedback."""
from ...widget_test_page import WidgetTestPage


class CopyButtonTestPage(WidgetTestPage):
    widget_tag = "copyButton"
    collection = "commands"

    def test_01_basic(self, pane):
        """Copy the current text and verify it by pasting into the second field."""
        pane.p("Edit Text, then click the copy icon. A checkmark appears only after copying succeeds.")
        pane.p("Paste into Paste here with Ctrl+V or Cmd+V. The pasted text must match Text.")
        pane.data(".text", "Hello clipboard")
        pane.textBox(value="^.text", lbl="Text")
        pane.copyButton(value="^.text")
        pane.textBox(value="", lbl="Paste here")

    def test_02_isolation(self, pane):
        """Disabled buttons must not copy; each button has independent feedback."""
        pane.p("Uncheck Disable, then copy. The checkmark should return to the copy icon after a moment.")
        pane.data(".disabled", True)
        pane.checkbox(checked="^.disabled", label="Disable")
        pane.copyButton(value="Independent clipboard example", disabled="^.disabled")
        pane.textBox(value="", lbl="Paste here")
