# Show messageright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Native buttons exercising source actions and local topics."""
from ...widget_test_page import WidgetTestPage


class ButtonTestPage(WidgetTestPage):
    widget_tag = "button"
    collection = "commands"

    def test_01_basic(self, pane):
        """The action reads the current parameter; also try hiding and disabling the button."""
        steps = pane.ol()
        steps.li("Enter a new Message, then click Show message. The output below must match your text.")
        steps.li("Check Disable: Show message must stop responding. Uncheck it to enable the button again.")
        steps.li("Check Hide: Show message must disappear. Uncheck it to bring the button back.")
        pane.data(".message", "Hello Genro")
        pane.data(".result", "Click Show message")
        pane.data(".disabled", False)
        pane.data(".hidden", False)
        pane.textBox(value="^.message", lbl="Message")
        pane.checkbox(checked="^.disabled", label="Disable")
        pane.checkbox(checked="^.hidden", label="Hide")
        pane.button("Show message", action="this.SET('.result', message);",
                    message="=.message", disabled="^.disabled", hidden="^.hidden")
        pane.pre("^.result")

    def test_02_topics(self, pane):
        """The button bar switches the stack; the recipe listens for the page being shown."""
        steps = pane.ol()
        steps.li("Click Second: the blue page must appear and the status must read Visible: second.")
        steps.li("Click Publish return: the green page must appear and the status must read Visible: first.")
        steps.li("Publish return sends a local topic; the stack receives it through its recipe subscription.")
        pane.data(".page", "first")
        pane.data(".status", "Waiting")
        bar = pane.div(display="flex", gap="4px", margin_bottom="8px")
        bar.button("First", action="this.SET('.page', destination);", destination="first")
        bar.button("Second", action="this.SET('.page', destination);", destination="second")
        bar.button("Publish return", publish="buttons_return")
        stack = pane.stackContainer(selectedPage="^.page", nodeId="buttons_stack", height="120px",
                                    subscribe_buttons_return="this.SET('.page', 'first');")
        stack.contentPane(pageName="first", title="First", background="#e0f2df").p("First page")
        stack.contentPane(pageName="second", title="Second", background="#dceafb").p("Second page")
        pane.pre("^.status", subscribe_buttons_stack_showing="this.SET('.status', 'Visible: ' + payload.pageName);")
