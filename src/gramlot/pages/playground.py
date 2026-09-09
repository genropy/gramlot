# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Python-authored JavaScript laboratory; client code only implements behavior."""
from ..page import WebPage
from ..builder import GramlotBuilder


class PlaygroundPage(WebPage):
    source_builder = GramlotBuilder
    client_builder = ("/_assets/pages/playground-page.js", "PlaygroundBuilder")
    client_setup = ("/_assets/pages/playground.js", "mountPlayground")
    source_inspection = False

    def main(self, root):
        root.h1("JavaScript laboratory")
        root.p("Rebuild recreates the example from code; Apply modifies the current Bags.")
        root.data("code", "")
        root.data("auto", False)
        root.data("status", "Ready. The initial example is already visible.")
        root.data("dataXml", "")
        root.data("sourceXml", "")
        toolbar = root.div(class_="lab-toolbar", **{"data-lab": "lab-toolbar"})
        toolbar.button("Rebuild from code", **{"data-lab": "lab-rebuild"})
        toolbar.button("Apply to current example", **{"data-lab": "lab-apply"})
        toolbar.button("Example: modify Bag", **{"data-lab": "lab-example"})
        toolbar.button("Reset", **{"data-lab": "lab-reset"})
        toolbar.checkbox(checked="^auto", label="Auto · rebuild when leaving the editor",
                         **{"data-lab": "lab-auto"})
        root.p("^status", role="status")
        columns = root.div(class_="lab-columns")
        editor = columns.div()
        editor.h2("JavaScript")
        editor.codeMirror(value="^code", language="javascript",
                          **{"data-lab": "lab-code", "aria-label": "JavaScript code"})
        live = columns.div()
        live.h2("Live")
        live.div(class_="lab-preview", **{"data-lab": "lab-preview"})
        views = root.div(class_="lab-columns")
        data = views.div()
        data.h2("Data · XML")
        data.codeMirror(value="^dataXml", language="xml", readonly=True,
                        **{"aria-label": "Bag Data XML"})
        source = views.div()
        source.h2("Source · XML")
        source.codeMirror(value="^sourceXml", language="xml", readonly=True,
                          **{"aria-label": "Bag Source XML"})
        root.p("Available: root, data, source, builder, app and Bag. "
               "Rebuild replaces the example; Apply works on the existing Bags.")
