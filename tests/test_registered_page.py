"""Registered-page behavioral contracts; bind to real integration in phase 1."""
import base64
import os
from pathlib import Path
from unittest.mock import patch

import pytest
from genro_asgi.spa.orchestration.freeze_handler import FreezeHandler
from genro_tytx import from_tytx

from gramlot.worker import PageWorker


class RegisteredPageChecks:
    def __init__(self, worker):
        self.worker = worker

    async def get_document(self, *, cid=None, user=None, query=""):
        self.worker.open_request_slot()
        result = await self.worker.hosted_app_seam.serve({
            "method": "GET", "path": "/", "query_string": query,
            "headers": [["cookie", f"spa_connection_id={cid}"]] if cid else [],
            "body": "", "cid": cid,
        }, user)
        return result, base64.b64decode(result["body"]).decode()

    def get_startup(self, html):
        text = html.split('id="page-startup"', 1)[1].split('>', 1)[1].split('</script>', 1)[0]
        return from_tytx(text, "json")


@pytest.fixture
def registered_pages(tmp_path):
    worker = PageWorker("test_pages", client_modules=Path(os.environ.get("GRAMLOT_CLIENT_MODULES", Path(__file__).resolve().parents[2])),
                        freeze_handler=FreezeHandler(tmp_path / "frozen"))
    yield RegisteredPageChecks(worker)
    worker.traffic_pool.shutdown()
    worker.service_pool.shutdown()


@pytest.mark.asyncio
async def test_html_identity_is_already_registered(registered_pages):
    # wf:contract: HTML contains the page_id generated with toolbox get_uuid and already registered under the request connection before the response is sent.
    with patch("gramlot.application.get_uuid", side_effect=["Z" + "c" * 21, "Z" + "p" * 21]):
        result, html = await registered_pages.get_document()
    assert result["status"] == 200
    page_id = registered_pages.get_startup(html)["page_id"]
    assert page_id == "Z" + "p" * 21
    assert registered_pages.worker.page_register.get(page_id)["connection_id"] == "Z" + "c" * 21
    assert registered_pages.worker.request_slot.connection_id == "Z" + "c" * 21


@pytest.mark.asyncio
async def test_page_loads_have_distinct_identities(registered_pages):
    # wf:contract: Two valid page loads under one connection have distinct registered page IDs and preserve that connection's ownership.
    _, first = await registered_pages.get_document()
    cid = registered_pages.worker.request_slot.connection_id
    user = registered_pages.worker.connection_register.get(cid)["user"]
    _, second = await registered_pages.get_document(cid=cid, user=user)
    ids = [registered_pages.get_startup(html)["page_id"] for html in (first, second)]
    assert ids[0] != ids[1]
    assert all(len(key) == 22 for key in ids)
    assert all(registered_pages.worker.page_register.get(key)["connection_id"] == cid for key in ids)
    assert registered_pages.worker.request_slot.connection_id is None


@pytest.mark.asyncio
async def test_unknown_page_does_not_register(registered_pages):
    # wf:contract: An unknown page returns not found without registering a page.
    result, _ = await registered_pages.get_document(query="page=does-not-exist")
    assert result["status"] == 404
    assert not registered_pages.worker.page_register.keys()
    assert not registered_pages.worker.connection_register.keys()


@pytest.mark.asyncio
async def test_wrong_user_cannot_reuse_connection(registered_pages):
    await registered_pages.get_document()
    cid = registered_pages.worker.request_slot.connection_id
    pages = list(registered_pages.worker.page_register.keys())
    result, _ = await registered_pages.get_document(cid=cid, user="another-user")
    assert result["status"] == 403
    assert list(registered_pages.worker.page_register.keys()) == pages


@pytest.mark.asyncio
async def test_stale_cookie_creates_a_new_connection(registered_pages):
    result, html = await registered_pages.get_document(cid="expired")
    assert result["status"] == 200
    cid = registered_pages.worker.request_slot.connection_id
    assert cid != "expired" and len(cid) == 22
    page = registered_pages.get_startup(html)["page_id"]
    assert registered_pages.worker.page_register.get(page)["connection_id"] == cid
