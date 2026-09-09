# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Python-built bootstrap document, independent of the client's source recipe.

The startup Bag selects registered client code and carries HTTP configuration.
JSON is escaped at the raw script embedding boundary, then decoded unchanged
by TYTX in the browser. Menu entries use the same validated Bag as /menu.
"""
import json
from urllib.parse import urlencode

from genro_builders.contrib.html.html_builder import HtmlBuilder
from gramlot.transport import to_tytx


class PageDocument(HtmlBuilder):
    """Compose the initial document through ordinary overridable methods."""

    def __init__(self, startup, menu=None):
        super().__init__()
        self.startup = startup
        self.menu = menu

    def main(self, root):
        """Build the document; the page recipe arrives in a later request."""
        html = root.html(lang="en")
        self.build_head(html.head())
        self.build_body(html.body())

    def get_script_json(self, text):
        """Escape JSON for an HTML raw-text element without changing its values."""
        return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")

    def build_head(self, head):
        """Declare resources in their existing cascade and import order."""
        head.meta(charset="utf-8")
        head.meta(name="viewport", content="width=device-width, initial-scale=1")
        head.title("Gramlot · Laboratory")
        imports = {"gramlot-dom": "/_assets/dom/index.js",
                   "genro-bag-js": "/_assets/bag/index.js",
                   "#uuid": "/_assets/bag/browser-uuid.js",
                   "genro-tytx": "/_assets/tytx/index.js",
                   "@msgpack/msgpack": "/_assets/msgpack/index.mjs",
                   "module": "/_assets/pages/module.js",
                   "@xmldom/xmldom": "/_assets/pages/xmldom.js"}
        head.script(self.get_script_json(json.dumps({"imports": imports}, indent=2)), html_type="importmap")
        head.script(self.get_script_json(to_tytx(self.startup, transport="json")),
                    id="page-startup", html_type="application/vnd.tytx+json")
        for href in ("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css",
                     "/_assets/pages/shell.css", "/_assets/pages/theme.css"):
            head.link(rel="stylesheet", href=href)

    def build_body(self, body):
        """Create stable hosts and controls, leaving the recipe host empty."""
        nav = body.nav(id="page-menu", **{"aria-label": "Pages"})
        if self.menu is not None:
            self.build_menu(nav, self.menu)
        main = body.main()
        transport = main.nav(**{"aria-label": "Transport"})
        transport.button("TYTX JSON", **{"data-transport": "json"})
        transport.span(" · ")
        transport.button("TYTX MessagePack", **{"data-transport": "msgpack"})
        main.div(id="root", **{"aria-live": "polite"})
        main.div(id="developer-tools")
        main.p(id="error", hidden=True)
        inspector = main.details(id="source-inspector", hidden=not self.startup["source_inspection"])
        inspector.summary("JavaScript source · XML")
        inspector.pre(id="source-xml")
        body.script(html_type="module", src="/_assets/pages/bootstrap.js")

    def build_menu(self, parent, source):
        """Preserve branch labels and registered destinations from the menu Bag."""
        listing = parent.ul()
        for node in source:
            item = listing.li()
            if node.node_tag == "branch":
                item.span(node.attr["label"])
                self.build_menu(item, node.value)
            else:
                query = urlencode({"page": node.attr["filepath"], "transport": self.startup["transport"]})
                item.a(node.attr["label"], href=f"/?{query}")
