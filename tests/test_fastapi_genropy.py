"""Optional GenroPy adapter lifecycle without opening a live database."""

import asyncio
import sys
import threading

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient
from genro_bag import Bag
from genro_tytx import from_tytx, to_tytx

from gramlot.contrib.fastapi_genropy import (
    create_genropy_application,
    legacy_to_gramlot,
)


class FakeDb:
    def __init__(self):
        self.events = []
        self.envs = {}

    def _record(self, name):
        ident = threading.get_ident()
        self.events.append((name, ident))
        return ident

    def clearCurrentEnv(self):
        self.envs[self._record("clear")] = {}

    def updateEnv(self, **values):
        ident = self._record("env")
        self.envs[ident].update(values)

    def closeConnection(self):
        self._record("close")

    def commit(self):
        self._record("commit")


class FakeApp:
    def __init__(self):
        self.db = FakeDb()


def write_page(root):
    pages = root / "pages"
    pages.mkdir()
    (pages / "db.py").write_text('''from gramlot.contrib.fastapi_genropy import GenropyPage
from gramlot.page import endpoint

class Page(GenropyPage):
    instances = 0
    def __init__(self):
        type(self).instances += 1

    @endpoint
    def untouched(self) -> str:
        return "plain"

    @endpoint
    def identity(self) -> int:
        return __import__("threading").get_ident() if self.db else 0

    @endpoint
    def slow_identity(self) -> int:
        ident = __import__("threading").get_ident() if self.db else 0
        __import__("time").sleep(.05)
        return ident

    @endpoint
    def fail(self) -> str:
        _ = self.db
        raise RuntimeError("failed")

    @endpoint
    def explicit_commit(self) -> str:
        self.db.commit()
        return "done"

    @endpoint
    async def invalid_async(self) -> str:
        _ = self.db
        return "bad"

    def main(self, root):
        root.p("db")
''')


def rpc(client, method):
    return client.post(
        f"/page/db/rpc/{method}", content=to_tytx({}, transport="json"),
        headers={"content-type": "application/vnd.tytx+json"},
    )


def decode(response):
    return from_tytx(response.text, transport="json")


def test_lazy_db_same_worker_cleanup_fresh_pages_and_explicit_commit(tmp_path):
    write_page(tmp_path)
    legacy = FakeApp()
    app = create_genropy_application(tmp_path, genropy_application=legacy)
    page_class = app.gramlot_pages.page_classes["db"]
    with TestClient(app) as client:
        assert decode(rpc(client, "untouched"))["result"] == "plain"
        assert legacy.db.events == []

        worker = decode(rpc(client, "identity"))["result"]
        names = [name for name, _ in legacy.db.events]
        assert names == ["clear", "env", "close", "clear"]
        assert {ident for _, ident in legacy.db.events} == {worker}
        assert legacy.db.envs[worker] == {}
        assert page_class.instances == 2

        legacy.db.events.clear()
        assert rpc(client, "fail").status_code == 500
        assert [name for name, _ in legacy.db.events] == ["clear", "env", "close", "clear"]

        legacy.db.events.clear()
        assert decode(rpc(client, "explicit_commit"))["result"] == "done"
        assert [name for name, _ in legacy.db.events] == [
            "clear", "env", "commit", "close", "clear",
        ]


def test_async_db_use_is_rejected_without_touching_db(tmp_path):
    write_page(tmp_path)
    legacy = FakeApp()
    with TestClient(create_genropy_application(tmp_path, genropy_application=legacy)) as client:
        response = rpc(client, "invalid_async")
    assert response.status_code == 500
    assert "synchronous Gramlot service" in decode(response)["error"]["message"]
    assert legacy.db.events == []


def test_concurrent_invocations_keep_thread_owned_lifecycles(tmp_path):
    write_page(tmp_path)
    legacy = FakeApp()
    pages = create_genropy_application(tmp_path, genropy_application=legacy).gramlot_pages

    async def invoke():
        return await pages._invoke("db", "data", "slow_identity", {}, None)

    first, second = asyncio.run(_pair(invoke))
    assert first != threading.get_ident()
    assert second != threading.get_ident()
    grouped = {}
    for name, ident in legacy.db.events:
        grouped.setdefault(ident, []).append(name)
    assert set(grouped) == {first, second}
    assert all(events == ["clear", "env", "close", "clear"] for events in grouped.values())


def test_cancellation_does_not_cleanup_while_worker_is_active(tmp_path):
    write_page(tmp_path)
    legacy = FakeApp()
    pages = create_genropy_application(tmp_path, genropy_application=legacy).gramlot_pages
    page_class = pages.page_classes["db"]
    entered = threading.Event()
    release = threading.Event()

    def blocked(self) -> str:
        _ = self.db
        entered.set()
        release.wait(2)
        return "finished"

    blocked.__gramlot_page_role__ = "data"
    from gramlot.page import PageMethod
    pages.page_methods["db"]["blocked"] = PageMethod(
        "blocked", "data", blocked, page_class,
    )

    async def scenario():
        task = asyncio.create_task(pages._invoke("db", "data", "blocked", {}, None))
        await asyncio.to_thread(entered.wait, 1)
        task.cancel()
        await asyncio.sleep(.02)
        assert "close" not in [name for name, _ in legacy.db.events]
        release.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        for _ in range(100):
            if "close" in [name for name, _ in legacy.db.events]:
                break
            await asyncio.sleep(.01)

    asyncio.run(scenario())
    assert [name for name, _ in legacy.db.events] == ["clear", "env", "close", "clear"]


async def _pair(factory):
    return await asyncio.gather(factory(), factory())


def test_legacy_bag_conversion_preserves_nested_values_and_attributes(monkeypatch):
    class LegacyNode:
        resolver = None
        def __init__(self, label, value, attr=None):
            self.label, self.value, self.attr = label, value, attr or {}
        def getValue(self, mode=""):
            assert mode == "static"
            return self.value

    class LegacyBag:
        def __init__(self, nodes):
            self.nodes = nodes

    import gramlot.contrib.fastapi_genropy.application as adapter
    monkeypatch.setattr(adapter, "_legacy_bag_class", lambda: LegacyBag)
    source = LegacyBag([LegacyNode("outer", LegacyBag([
        LegacyNode("answer", 42, {"caption": "Answer"}),
    ]), {"kind": "nested"})])
    result = legacy_to_gramlot(source)
    assert isinstance(result, Bag)
    assert result.get_item("outer.answer") == 42
    assert result.get_node("outer").attr == {"kind": "nested"}
    assert result.get_node("outer.answer").attr == {"caption": "Answer"}

    with pytest.raises(TypeError, match="lazy"):
        legacy_to_gramlot((item for item in [1]))
    with pytest.raises(TypeError, match="resultattrs"):
        legacy_to_gramlot((1, {"caption": "one"}))


def test_import_does_not_load_genropy():
    assert "gnr.app.gnrapp" not in sys.modules


def test_selection_rows_preserve_types_order_and_identity():
    from datetime import date
    from decimal import Decimal
    from gramlot.contrib.fastapi_genropy import GenropyPage

    page = GenropyPage()
    rows = [{'code': 0, 'amount': Decimal('2.50'), 'date': date(2026, 9, 12), 'empty': None},
            {'code': 'a.b', 'amount': Decimal('0')}]
    result = page.selection_result(rows, identifier='code')
    assert result['rows'] == rows
    assert result['metadata'] == {'totalrows': 2}
    assert from_tytx(to_tytx(result, 'json'), 'json')['rows'] == rows
    with pytest.raises(ValueError, match='Duplicate'):
        page.selection_result([{'code': 'x'}, {'code': 'x'}], identifier='code')
    with pytest.raises(ValueError, match='invalid'):
        page.selection_result([{'code': None}], identifier='code')


def test_states_recipe_uses_rpc_store_and_real_query_contract():
    import importlib.util
    from pathlib import Path
    from types import SimpleNamespace
    from gramlot.transport import to_tytx as source_tytx

    path = Path(__file__).parents[1] / 'docs/examples/states-grid/pages/states.py'
    spec = importlib.util.spec_from_file_location('states_example_test', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    calls = []

    class Table:
        def query(self, **kwargs):
            calls.append(kwargs)
            return self
        def fetch(self):
            return [{'code': 'NSW', 'name': 'New South Wales', 'region_code': 'AU'}]

    page = module.Page()
    page._genropy_sync_active = True
    page._genropy_db = SimpleNamespace(table=lambda name: Table() if name == 'invc.state' else None)
    assert page.load_states()['rows'][0]['code'] == 'NSW'
    assert calls == [dict(columns='$code,$name,$region_code', order_by='$name')]
    builder = page.source_builder('main')
    page.main(builder.root)
    # Transport must preserve the declaration and bound method's logical name.
    text = source_tytx(builder.source, 'json')
    assert 'rpcStore' in text and 'load_states' in text and 'storeCode' in text


def test_localities_query_is_parameterized_and_empty_selection_skips_db():
    import importlib.util
    from pathlib import Path
    from types import SimpleNamespace

    path = Path(__file__).parents[1] / 'docs/examples/states-grid/pages/states.py'
    spec = importlib.util.spec_from_file_location('localities_example_test', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    from gramlot.contrib.fastapi.application import PageCollection
    PageCollection._registered_methods(module.Page)
    page = module.Page()
    # No active DB context: this must return without touching self.db.
    assert page.load_localities()['rows'] == []
    assert page.load_customers()['rows'] == []
    queries = []
    tables = []
    class Table:
        def query(self, **kwargs):
            queries.append(kwargs)
            return self
        def fetch(self):
            return [{'id': 'a', 'suburb': 'Example', 'postcode': '2000', 'state': 'NSW'}]
    def table(name):
        tables.append(name)
        return Table()
    page._genropy_sync_active = True
    page._genropy_db = SimpleNamespace(table=table)
    result = page.load_localities('NSW')
    assert tables == ['invc.postcode']
    assert queries == [dict(columns='$id,$postcode,$suburb,$state',
                            where='$state=:state', state='NSW',
                            order_by='$suburb,$postcode,$id')]
    assert result['identifier'] == 'id'
    assert result['metadata']['totalrows'] == 1

    queries.clear()
    tables.clear()
    result = page.load_customers('NSW')
    assert tables == ['invc.customer']
    assert queries == [dict(columns='$id,$account_name,$suburb,$postcode,$state',
                            where='$state=:state', state='NSW',
                            order_by='$account_name,$id')]
    assert result['identifier'] == 'id'
