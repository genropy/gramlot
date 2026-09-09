# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Host registered Python page recipes and a static Bag menu.

Each source request instantiates its selected page and a fresh HtmlBuilder.
The browser owns DOM construction and reactivity. Explicit registration keeps
page identity independent of menu captions and future directory discovery.
Subclass main(root) remains supported for the original one-page experiment.
"""
from pathlib import Path

from genro_asgi import HTTPBadRequest, HTTPForbidden, HTTPNotFound, Response, RoutedApplication
from genro_asgi.applications.spa_app import SPA_CONNECTION_ID_COOKIE
from genro_asgi.middleware.base import cookie_value
from genro_toolbox import get_uuid
from genro_builders.contrib.html.html_builder import HtmlBuilder
from genro_bag import Bag
from genro_routes import route
from genro_tytx import to_tytx

from .page import WebPage
from .page_document import PageDocument


class WebpageApplication(RoutedApplication):
    """ASGI host for explicitly registered recipe-authored pages."""

    mount = ""

    def __init__(self, *, client_modules=None, pages=None, menu_class=None, default_page=None, worker=None, rpc_http_method="WSK", **kwargs):
        super().__init__(**kwargs)
        if self.mount != "":
            raise ValueError("This experiment requires root mounting")
        if rpc_http_method not in ("WSK", "POST", "GET"):
            raise ValueError("RPC httpMethod must be WSK, POST or GET")
        self.rpc_http_method = rpc_http_method
        self.worker = worker
        self.pages = dict(pages or {})
        self.menu_class = menu_class
        self.default_page = default_page
        if self.pages and default_page not in self.pages:
            raise ValueError("Default page must be registered")
        bundled = Path(__file__).parent / "resources"
        modules = Path(client_modules).resolve() if client_modules is not None else bundled
        source_assets = Path(__file__).resolve().parents[2] / "js" / "pages" / "src"
        self.resources = source_assets if source_assets.is_dir() else bundled / "pages"
        self.client_roots = {
            "dom": modules / "gramlot-dom" / "src",
            "bag": modules / "genro-bag-js" / "src",
            "tytx": modules / "genro-tytx" / "js" / "src",
            "pages": self.resources,
            "msgpack": modules / "genro-tytx" / "js" / "node_modules" / "@msgpack" / "msgpack" / "dist.esm",
        }
        for directory in self.client_roots.values():
            if not directory.is_dir():
                raise ValueError(f"Missing client source directory: {directory}")

    def main(self, root):
        """Populate the recipe; override in the concrete page."""
        raise NotImplementedError

    @route(name="main")
    def get_main(self, transport="json", page=None, page_id=None, _request=None):
        """Return the typed source recipe, without rendering HTML in Python."""
        if transport not in ("json", "msgpack"):
            raise HTTPBadRequest("Supported transports: json, msgpack")
        if self.worker is not None:
            page = self.get_registered_page(_request, page_id)["page"]
        if self.pages:
            page_class = self.pages.get(page if page is not None else self.default_page)
            if page_class is None:
                raise HTTPNotFound("Unknown page")
            builder = getattr(page_class, "source_builder", HtmlBuilder)("main")
            page_class().main(builder.source)
        else:
            builder = HtmlBuilder("main")
            if page is not None:
                raise HTTPNotFound("Unknown page")
            self.main(builder.source)
        return self.result_wrapper(
            to_tytx(builder.source, transport=transport),
            media_type=f"application/vnd.tytx+{transport}",
        )

    @route(name="menu")
    def get_menu(self, transport="json"):
        """Return the menu as a typed Bag."""
        if transport not in ("json", "msgpack"):
            raise HTTPBadRequest("Supported transports: json, msgpack")
        if self.menu_class is None:
            raise HTTPNotFound("No menu configured")
        menu = self.menu_class()
        menu.create()
        self.validate_menu(menu.source)
        return self.result_wrapper(menu.source.to_tytx(transport=transport),
                                   media_type=f"application/vnd.tytx+{transport}")

    @route(name="inspector")
    def get_inspector(self, page_id=None, _request=None):
        """Serve the development tool through the same typed recipe boundary."""
        if self.worker is not None:
            self.get_registered_page(_request, page_id)
        from .inspector import build_inspector
        from .widget_test_builder import WidgetTestBuilder
        builder = WidgetTestBuilder("inspector")
        build_inspector(builder.source)
        return self.result_wrapper(to_tytx(builder.source, transport="json"),
                                   media_type="application/vnd.tytx+json")

    def get_registered_page(self, request, page_id=None):
        """Resolve a page only under its authenticated connection, for either transport."""
        scope = request.scope if request is not None else {}
        channel_page = scope.get("genro.page_id")
        if channel_page and page_id and channel_page != page_id:
            raise HTTPForbidden("Conflicting page identities")
        page = self.worker.page_register.get(channel_page or page_id) if channel_page or page_id else None
        cid = cookie_value(scope, SPA_CONNECTION_ID_COOKIE)
        connection = self.worker.connection_register.get(cid) if cid else None
        if (page is None or connection is None or page["connection_id"] != cid
                or connection["user"] != scope.get("genro.identity")):
            raise HTTPForbidden("Page does not belong to this request")
        return page

    def validate_menu(self, source):
        """Reject unknown destinations and unsupported vocabulary."""
        for node in source:
            if node.node_tag == "branch":
                self.validate_menu(node.value)
            elif node.node_tag == "webpage":
                if node.attr.get("filepath") not in self.pages:
                    raise ValueError("Menu references an unregistered page")
            else:
                raise ValueError(f"Unsupported menu tag: {node.node_tag}")

    @route(media_type="text/html")
    def index(self, page=None, transport="json", _request=None):
        """Build the document and typed startup configuration on the server."""
        if transport not in ("json", "msgpack"):
            raise HTTPBadRequest("Supported transports: json, msgpack")
        selected = page if page is not None else self.default_page
        page_class = self.pages.get(selected) if self.pages else type(self)
        if page_class is None or (not self.pages and page is not None):
            raise HTTPNotFound("Unknown page")
        startup = Bag(dict(page=selected, transport=transport,
                           rpc=Bag(dict(httpMethod=self.rpc_http_method)),
                           source_inspection=getattr(page_class, "source_inspection", True),
                           endpoints=Bag(dict(main="/main", inspector="/inspector")),
                           hosts=Bag(dict(root="root", tools="developer-tools", error="error",
                                          source="source-xml", inspection="source-inspector"))))
        for name, default in (("client_builder", WebPage.client_builder), ("client_setup", None)):
            descriptor = getattr(page_class, name, default)
            startup.set_item(name, Bag(dict(module=descriptor[0], export=descriptor[1]))
                             if descriptor is not None else None)
        menu = None
        if self.menu_class is not None:
            menu_builder = self.menu_class()
            menu_builder.create()
            menu = menu_builder.source
            self.validate_menu(menu)
        if self.worker is not None:
            cid = cookie_value(_request.scope, SPA_CONNECTION_ID_COOKIE)
            connection = self.worker.connection_register.get(cid) if cid else None
            if connection is not None and connection["user"] != _request.scope.get("genro.identity"):
                raise HTTPForbidden("Connection does not belong to this request")
            if connection is None:
                cid = get_uuid()
                self.worker.new_connection(cid)
            page_id = get_uuid()
            self.worker.add_page(page_id, cid, page=selected)
            startup.set_item("page_id", page_id)
        document = PageDocument(startup, menu)
        document.create()
        return "<!doctype html>\n" + document.render(target=False, xml=False, pretty=True)

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if scope["type"] == "http" and path.startswith("/_assets/"):
            if scope.get("method") not in ("GET", "HEAD"):
                await Response("Method not allowed", status_code=405)(scope, receive, send)
                return
            parts = path.removeprefix("/_assets/").split("/", 1)
            directory = self.client_roots.get(parts[0])
            target = (directory / parts[1]).resolve() if directory and len(parts) == 2 else None
            if (target is None or not target.is_relative_to(directory.resolve())
                    or target.suffix not in (".js", ".mjs", ".css") or not target.is_file()):
                await Response("Not found", status_code=404)(scope, receive, send)
                return
            if scope.get("method") == "HEAD":
                content = b""
            elif self.worker is not None:
                content = await self.worker.run_sync(target.read_bytes)
            else:
                content = target.read_bytes()
            await Response(content, media_type="text/css" if target.suffix == ".css" else "text/javascript")(scope, receive, send)
            return
        await super().__call__(scope, receive, send)
