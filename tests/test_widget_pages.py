# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: the widget inventory has independent, server-authored live pages."""
import json
import inspect
from pathlib import Path
import subprocess
import textwrap

import pytest
from genro_asgi import AsgiServer
from gramlot.demo import DemoApplication
from gramlot.pages.widgets import WIDGET_PAGES
from tests.test_hello_world import RequestSupport


class TestWidgetPages(RequestSupport):
    @pytest.mark.parametrize("path,page", WIDGET_PAGES.items())
    @pytest.mark.parametrize("transport", ["json", "msgpack"])
    @pytest.mark.asyncio
    async def test_real_widget_mounts_from_page_recipe(self, path, page, transport):
        server = AsgiServer(applications=[DemoApplication(client_modules=self.modules)])
        response, body = await self.request(server, "/main", query=f"page={path}&transport={transport}".encode())
        assert response["status"] == 200
        result = subprocess.run(
            ["node", str(Path(__file__).with_name("render_widget.mjs")),
             str(self.modules), transport, page.widget_tag,
             json.dumps([textwrap.dedent(inspect.getsource(getattr(page, name)))
                         for name in sorted(dir(page)) if name.startswith("test_")])],
            input=body, capture_output=True)
        assert result.returncode == 0, result.stderr.decode()
        assert json.loads(result.stdout)["tag"] == page.widget_tag
