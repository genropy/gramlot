# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Bootstrap acceptance contracts; implement bodies against real integrations."""

import asyncio
import base64
from datetime import date
import json
from pathlib import Path
import subprocess
from urllib.parse import parse_qs, urlencode, urlparse
from unittest.mock import patch

from genro_asgi import AsgiServer
from genro_bag import Bag

from gramlot.application import WebpageApplication
from gramlot.demo import DemoApplication
from gramlot.hello_world import HelloWorldPage
from gramlot.menu import MenuBuilder
from gramlot.page_document import PageDocument
from gramlot.pages.playground import PlaygroundPage
from gramlot.pages.widgets import WIDGET_PAGES
from tests.test_hello_world import RequestSupport
from tests.test_runtime_consumers import TestRuntimeOwnership as RuntimeChecks


class BootstrapChecks(RequestSupport):
    def get_response(self, application, path="/", **query):
        return asyncio.run(self.request(application.server or AsgiServer(applications=[application]), path,
                                        query=urlencode(query).encode()))

    def get_document(self, application, **query):
        response, body = self.get_response(application, **query)
        assert response["status"] == 200, body.decode()
        return body.decode()

    def get_client_result(self, html, **payload):
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
             str(folder / "page_bootstrap.mjs")],
            input=json.dumps(dict(html=html, **payload)), text=True,
            capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr
        return json.loads(result.stdout)


class ExtendedDocument(PageDocument):
    def build_head(self, head):
        super().build_head(head)
        head.meta(name="composition-test", content="overridden")


class ProbeDocument(PageDocument):
    def build_head(self, head):
        self.startup.set_item("probe", Bag(dict(
            text='</script><div data-injected="yes">& \" Ω 日本語',
            count=42, enabled=False, empty=None, date=date(2026, 9, 6))))
        super().build_head(head)


class EncodedMenu(MenuBuilder):
    def main(self, root):
        root.branch(label="Examples & checks").webpage(label="A < B", filepath="a b/Ω&x")


class TestPageBootstrap:
    def test_document_is_built_in_python_without_main_recipe(self):
        # wf:contract: The ASGI index response is one valid HTML5 document built by PageDocument, preserving host IDs, resources and viewport, with no main recipe rendered into its body; ordinary method overrides compose the document.
        check = BootstrapChecks()
        with patch("gramlot.application.PageDocument", ExtendedDocument):
            html = check.get_document(HelloWorldPage(client_modules=check.modules))
        check.get_client_result(html)
        assert 'name="composition-test"' in html
        assert 'width=device-width, initial-scale=1' in html
        assert html.index("shell.css") < html.index("theme.css")
        assert '<h1' not in html
        assert 'id="developer-tools"' in html
        assert 'id="source-inspector"' in html

    def test_startup_bag_round_trips_safely_through_html(self):
        # wf:contract: Extracting startup data from real generated HTML and decoding TYTX in JavaScript preserves nested typed values and Unicode; closing script text, quotes and ampersands cannot create extra DOM or executable script.
        check = BootstrapChecks()
        with patch("gramlot.application.PageDocument", ProbeDocument):
            html = check.get_document(HelloWorldPage(client_modules=check.modules))
        check.get_client_result(html, probe='</script><div data-injected="yes">& \" Ω 日本語')

    def test_index_resolves_registered_page_and_transport(self):
        # wf:contract: Default and selected pages resolve on the server; unknown pages and unsupported transports are rejected; query text cannot select arbitrary client modules; the one-page Application.main entry remains usable.
        check = BootstrapChecks()
        app = DemoApplication(client_modules=check.modules)
        for query, expected in (({}, "hello"), ({"page": "about", "transport": "msgpack"}, "about")):
            result = check.get_client_result(check.get_document(app, **query))
            assert result["page"] == expected
            assert result["transport"] == query.get("transport", "json")
        for query, status in (({"page": "missing"}, 404), ({"page": ""}, 404),
                              ({"transport": "invalid"}, 400)):
            assert check.get_response(app, **query)[0]["status"] == status
        response, _ = check.get_response(app, client_builder="https://invalid/module.js")
        assert response["status"] == 400
        single = HelloWorldPage(client_modules=check.modules)
        assert check.get_client_result(check.get_document(single))["page"] is None
        assert check.get_response(single, "/main")[0]["status"] == 200
        assert check.get_response(single, page="hello")[0]["status"] == 404

    def test_declared_client_works_for_arbitrary_routes(self):
        # wf:contract: Real Python-generated startup configuration selects existing builders and setup for arbitrary registered route names without URL special cases, and their recipes render correctly with JSON and MessagePack.
        check = BootstrapChecks()
        for route, page in (("arbitrary-lab", PlaygroundPage),
                            ("input-example", WIDGET_PAGES["widgets/textBox"])):
            for transport in ("json", "msgpack"):
                app = WebpageApplication(client_modules=check.modules, pages={route: page}, default_page=route)
                html = check.get_document(app, transport=transport)
                response, main = check.get_response(app, "/main", transport=transport, page=route)
                assert response["status"] == 200
                response, inspector = check.get_response(app, "/inspector")
                assert response["status"] == 200
                check.get_client_result(html, route=route, transport=transport,
                                        main=base64.b64encode(main).decode() if transport == "msgpack" else main.decode(),
                                        inspector=inspector.decode())

    def test_document_menu_preserves_bag_destinations(self):
        # wf:contract: Builder-generated navigation matches the validated branch/webpage menu Bag and preserves encoded route/transport links; no-menu applications remain usable and the menu endpoint remains compatible.
        check = BootstrapChecks()
        app = WebpageApplication(client_modules=check.modules,
                                 pages={"a b/Ω&x": PlaygroundPage}, default_page="a b/Ω&x",
                                 menu_class=EncodedMenu)
        result = check.get_client_result(check.get_document(app, transport="msgpack"))
        assert len(result["links"]) == 1
        link = result["links"][0]
        assert link["text"] == "A < B"
        assert parse_qs(urlparse(link["href"]).query) == {"page": ["a b/Ω&x"], "transport": ["msgpack"]}
        response, body = check.get_response(app, "/menu")
        assert response["status"] == 200
        menu = Bag.from_tytx(body.decode(), transport="json")
        assert menu.nodes[0].value.nodes[0].attr["filepath"] == "a b/Ω&x"
        assert not check.get_client_result(check.get_document(HelloWorldPage(client_modules=check.modules)))["links"]

    def test_configured_startup_preserves_runtime_ownership(self):
        # wf:contract: Using generated shell and startup Bag, repeated transport changes and delayed page/tool responses preserve independent instances, inspector shortcut and laboratory cleanup; old teardown cannot affect replacement controls.
        check = RuntimeChecks()
        for scenario in ("rebuild", "inspector", "bootstrap"):
            check._check(scenario)
