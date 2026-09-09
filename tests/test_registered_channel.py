"""Registered startup contracts; bind to real integration in phase 2."""
import asyncio
import base64
import json
from pathlib import Path
import subprocess

from genro_tytx import to_tytx, from_tytx
from gramlot.demo import DemoApplication
from tests.test_page_bootstrap import BootstrapChecks
from tests.test_registered_page import registered_pages as registered_pages


class ChannelChecks(BootstrapChecks):
    def check_client(self, registered, scenario):
        _, html = asyncio.run(registered.get_document())
        application = DemoApplication(client_modules=self.modules)
        _, main = self.get_response(application, "/main")
        _, inspector = self.get_response(application, "/inspector")
        if scenario == "mount-error":
            source = from_tytx(main.decode(), "json")
            source.get_node("#0").node_tag = "unimplementedWidget"
            main = to_tytx(source, "json").encode()
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
             str(folder / "registered_channel.mjs")],
            input=json.dumps(dict(html=html, main=main.decode(), inspector=inspector.decode(),
                                  scenario=scenario)), text=True, capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr

    async def check_ownership(self, registered):
        _, html = await registered.get_document()
        worker = registered.worker
        owner = worker.request_slot.connection_id
        page = registered.get_startup(html)["page_id"]
        await registered.get_document()
        foreign = worker.request_slot.connection_id
        user = worker.connection_register.get(owner)["user"]
        for method in ("WSK", "POST", "GET"):
            for cid, expected in ((owner, 200), (foreign, 403)):
                worker.open_request_slot()
                params = {"page_id": page, "page": "playground"}
                request = dict(method=method, path="/main", cid=cid,
                               headers=[["cookie", f"spa_connection_id={cid}"],
                                        ["content-type", "application/vnd.tytx+json"]],
                               query_string=f"page_id={page}&page=playground" if method == "GET" else "",
                               body="" if method == "GET" else base64.b64encode(to_tytx(params, "json").encode()).decode())
                if method == "WSK":
                    request["page_id"] = page
                result = await worker.hosted_app_seam.serve(request, user)
                assert result["status"] == expected, result
                if expected == 200:
                    text = base64.b64decode(result["body"]).decode()
                    assert "Hello" in text
                    assert "JavaScript laboratory" not in text



def test_registered_startup_order(registered_pages):
    # wf:contract: genro exists before source acquisition; the registered page channel opens before the source request and the received source builds the live page.
    ChannelChecks().check_client(registered_pages, "startup")


def test_page_identity_does_not_authorize_another_connection(registered_pages):
    # wf:contract: A different connection cannot acquire the registered page's source using its page_id.
    asyncio.run(ChannelChecks().check_ownership(registered_pages))


def test_disposed_startup_cannot_mount_late_results(registered_pages):
    # wf:contract: Disposing genro during startup releases its channel resources and late source responses cannot mount UI or revive the disposed runtime.
    ChannelChecks().check_client(registered_pages, "dispose")


def test_rpc_default_is_configurable_in_the_python_startup(registered_pages):
    check = BootstrapChecks()
    for transport in ("WSK", "POST", "GET"):
        app = DemoApplication(client_modules=check.modules, rpc_http_method=transport)
        html = check.get_document(app)
        startup = registered_pages.get_startup(html)
        assert startup["rpc.httpMethod"] == transport


def test_rpc_failure_and_concurrency_contracts():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "--experimental-loader", str(root / "tests/lab_loader.mjs"),
         "--test", str(root / "js/pages/tests/rpc.test.mjs")],
        text=True, capture_output=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr


def test_failed_mount_shows_startup_error(registered_pages):
    ChannelChecks().check_client(registered_pages, "mount-error")
