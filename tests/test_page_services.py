"""Page role discovery, role dispatch and invocation-local Source builders."""

import asyncio
from decimal import Decimal

import pytest

pytest.importorskip('fastapi')
pytest.importorskip('httpx')
from fastapi.testclient import TestClient
from genro_tytx import from_tytx, to_tytx

from gramlot.contrib.fastapi import GramlotApplication
from gramlot.page import InvocationContext, WebPage, endpoint, page_methods, source


class DataMixin:
    @endpoint
    def label(self, value: str) -> str:
        return f'mixin:{value}'


class SourceMixin:
    @source
    def fragment(self, root, value: str) -> None:
        root.p(value)


class MroPage(DataMixin, SourceMixin, WebPage):
    def main(self, root):
        root.h1('main')


def test_roles_follow_effective_python_mro_and_plain_mixins():
    methods = page_methods(MroPage)
    assert {name: method.role for name, method in methods.items()} == {
        'label': 'data', 'fragment': 'source', 'main': 'source',
    }
    assert methods['label'].origin is DataMixin
    assert methods['fragment'].origin is SourceMixin
    assert methods['main'].origin is MroPage

    class Hidden(MroPage):
        def label(self, value: str) -> str:
            return value

    assert 'label' not in page_methods(Hidden)

    class Reexposed(MroPage):
        @endpoint
        def label(self, value: str) -> str:
            return super().label(value).upper()

    assert page_methods(Reexposed)['label'].origin is Reexposed
    assert Reexposed().label('x') == 'MIXIN:X'


def test_diamond_mro_and_double_decoration_are_ordinary_and_explicit():
    class Root:
        @endpoint
        def chain(self, value: str) -> str:
            return value

    class Left(Root):
        @endpoint
        def chain(self, value: str) -> str:
            return f'L{super().chain(value)}'

    class Right(Root):
        @endpoint
        def chain(self, value: str) -> str:
            return f'R{super().chain(value)}'

    class Diamond(Left, Right, WebPage):
        def main(self, root): ...

    assert Diamond().chain('x') == 'LRx'
    assert page_methods(Diamond)['chain'].origin is Left
    with pytest.raises(TypeError, match='already has'):
        source(endpoint(lambda self: None))

    class InvalidMain(WebPage):
        @endpoint
        def main(self, root): ...

    with pytest.raises(TypeError, match='implicit Source role'):
        page_methods(InvalidMain)


def _write_page(root):
    pages = root / 'pages'
    pages.mkdir()
    (pages / 'services.py').write_text('''import asyncio
from decimal import Decimal
from gramlot.page import InvocationContext, WebPage, endpoint, source

class Library:
    @endpoint
    def echo(self, value: str) -> str:
        return value

class Page(Library, WebPage):
    @endpoint
    def decimal(self, value: Decimal) -> Decimal:
        return value

    @endpoint
    def nothing(self) -> None:
        return None

    @endpoint
    def context_name(self, context: InvocationContext) -> str:
        return context.page_name

    @endpoint
    def application_type_error(self) -> str:
        raise TypeError("inside application")

    @source
    async def fragment(self, root, value: str) -> None:
        root.p("before")
        await asyncio.sleep(0.01)
        root.p(value)

    def hidden(self, value: str) -> str:
        return value

    def main(self, root):
        root.h1("ready")
''')


def _decode(response):
    return from_tytx(response.text, transport='json')


def _post(client, path, params):
    return client.post(path, content=to_tytx(params, transport='json'),
                       headers={'content-type': 'application/vnd.tytx+json'})


def test_role_checked_dispatch_typed_values_context_and_implicit_main(tmp_path):
    _write_page(tmp_path)
    with TestClient(GramlotApplication(tmp_path)) as client:
        text = _post(client, '/page/services/rpc/data/echo', {'value': '{"x": 1}'})
        assert _decode(text) == {'ok': True, 'result': '{"x": 1}'}
        decimal = _post(client, '/page/services/rpc/data/decimal', {'value': Decimal('4.20')})
        assert _decode(decimal)['result'] == Decimal('4.20')
        assert _decode(_post(client, '/page/services/rpc/data/nothing', {}))['result'] is None
        assert _decode(_post(client, '/page/services/rpc/data/context_name', {}))['result'] == 'services'

        bad_parameters = _post(client, '/page/services/rpc/data/echo', {})
        assert bad_parameters.status_code == 422
        assert _decode(bad_parameters)['error']['kind'] == 'parameters'
        app_error = _post(client, '/page/services/rpc/data/application_type_error', {})
        assert app_error.status_code == 500
        assert _decode(app_error)['error']['kind'] == 'application'

        wrong_role = _post(client, '/page/services/rpc/source/echo', {'value': 'x'})
        assert wrong_role.status_code == 409
        assert _decode(wrong_role)['error']['kind'] == 'role'
        hidden = _post(client, '/page/services/rpc/data/hidden', {'value': 'x'})
        assert hidden.status_code == 404

        main = _post(client, '/page/services/rpc/source/main', {})
        assert main.status_code == 200
        assert _decode(main)['result'].get_node('h1_0').node_tag == 'h1'


@pytest.mark.asyncio
async def test_concurrent_source_calls_use_isolated_builders(tmp_path):
    _write_page(tmp_path)
    collection = GramlotApplication(tmp_path).gramlot_pages
    first, second = await asyncio.gather(
        collection._invoke('services', 'source', 'fragment', {'value': 'first'}, None),
        collection._invoke('services', 'source', 'fragment', {'value': 'second'}, None),
    )
    assert first is not second
    assert first.get_item('p_1') == 'first'
    assert second.get_item('p_1') == 'second'
