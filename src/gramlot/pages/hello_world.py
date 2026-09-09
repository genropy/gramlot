# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""The first page: its entire visible content is a Python recipe."""
from ..page import WebPage


class HelloWorldPage(WebPage):
    """A nested HTML recipe with text and typed attributes."""

    def main(self, root):
        page = root.div(node_id="hello", class_="hello", hidden=False)
        page.h1("Hello World")
        page.p("This page is built in the browser from a Python recipe.")
        page.p("Python → TYTX → gramlot-dom", class_="path")
        page.input(value="Gramlot", readonly=True, tabindex=2)

        experiment = root.div(class_="hello", margin_top="24px")
        experiment.h2("Try data binding")
        experiment.p("Type a title, then leave the field to update the text below.")
        experiment.input(value="^title", node_id="title_input",
                         placeholder="Type here…", aria_label="Title")
        experiment.div("^title", node_id="title_echo", font_size="28px",
                       min_height="45px", margin_top="16px")
