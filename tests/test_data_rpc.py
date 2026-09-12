"""Bounded dataRpc authoring and FastAPI TYTX endpoint contracts."""
from decimal import Decimal

import pytest

pytest.importorskip('fastapi')
pytest.importorskip('httpx')
from fastapi.testclient import TestClient
from genro_bag import Bag
from genro_toolbox import metadata
from genro_tytx import from_tytx, to_tytx

from gramlot.builder import GramlotBuilder
from gramlot.contrib.fastapi import GramlotApplication
from gramlot.page import WebPage, endpoint


class AuthoringPage(WebPage):
    @endpoint
    def area(self, base: Decimal, height: Decimal) -> Decimal:
        return base * height / Decimal('2')


def test_python_callable_authoring_and_legacy_shapes():
    page = AuthoringPage()
    builder = GramlotBuilder('main')
    declaration = builder.root.dataRpc(
        '.result', page.area, base='^base', height='=height', _on_start=True,
    )
    assert declaration.node.node_tag == 'dataRpc'
    assert declaration.node.attr['method'] == 'area'
    assert declaration.node.attr['_meta'] == {'data_element': 'rpc'}
    assert builder.root.dataRpc(page.area, base='^base').node.get_attr('destination') is None
    assert builder.root.dataRpc(None, 'area', base='^base').node.get_attr('method') == 'area'

    class NotAPage:
        @endpoint
        def area(self): ...

    with pytest.raises(TypeError, match='bound and marked'):
        builder.root.dataRpc('result', NotAPage().area)
    with pytest.raises(TypeError, match='bound and marked'):
        builder.root.dataRpc('result', lambda: None)


def write_rpc_page(root):
    pages = root / 'pages'
    pages.mkdir()
    (pages / 'triangle.py').write_text('''from decimal import Decimal
from genro_bag import Bag
from gramlot.page import WebPage, endpoint

class Page(WebPage):
    instances = 0
    def __init__(self):
        type(self).instances += 1

    @endpoint
    def area(self, base: Decimal, height: Decimal) -> Decimal:
        return base * height / Decimal("2")

    @endpoint
    def echo_bag(self, value: Bag) -> Bag:
        return value

    @endpoint
    def explode(self, value: str) -> str:
        raise RuntimeError("deliberate failure")

    def hidden(self, value: str) -> str:
        return value

    def main(self, root):
        root.dataRpc("area", self.area, base="^base", height="=height")
''')


def decode(response):
    return from_tytx(response.text, transport='json')


def test_fastapi_rpc_registry_tytx_types_and_fresh_pages(tmp_path):
    write_rpc_page(tmp_path)
    app = GramlotApplication(tmp_path)
    page_class = app.gramlot_pages.page_classes['triangle']
    with TestClient(app) as client:
        document = client.get('/page/triangle/')
        assert '"rpc": "/page/triangle/rpc"' in document.text
        request = {'base': Decimal('3.5'), 'height': Decimal('4')}
        response = client.post(
            '/page/triangle/rpc/area',
            content=to_tytx(request, transport='json'),
            headers={'content-type': 'application/vnd.tytx+json'},
        )
        assert response.status_code == 200
        envelope = decode(response)
        assert envelope == {'ok': True, 'result': Decimal('7.0')}

        bag = Bag()
        bag.set_item('answer', Decimal('4.25'))
        response = client.post(
            '/page/triangle/rpc/echo_bag',
            content=to_tytx({'value': bag}, transport='json'),
            headers={'content-type': 'application/vnd.tytx+json'},
        )
        result = decode(response)['result']
        assert isinstance(result, Bag)
        assert result.get_item('answer') == Decimal('4.25')
        assert page_class.instances == 2


def test_fastapi_rpc_rejects_unregistered_invalid_and_application_failures(tmp_path):
    write_rpc_page(tmp_path)
    with TestClient(GramlotApplication(tmp_path)) as client:
        headers = {'content-type': 'application/vnd.tytx+json'}
        hidden = client.post(
            '/page/triangle/rpc/hidden',
            content=to_tytx({'value': 'x'}, transport='json'), headers=headers,
        )
        assert hidden.status_code == 404
        assert decode(hidden)['error']['kind'] == 'method'

        wrong_type = client.post(
            '/page/triangle/rpc/area',
            content=to_tytx({'base': '3', 'height': Decimal('4')}, transport='json'),
            headers=headers,
        )
        assert wrong_type.status_code == 422
        assert decode(wrong_type)['error']['kind'] == 'parameters'

        failure = client.post(
            '/page/triangle/rpc/explode',
            content=to_tytx({'value': 'x'}, transport='json'), headers=headers,
        )
        assert failure.status_code == 500
        assert decode(failure)['error'] == {
            'kind': 'application', 'message': 'deliberate failure',
        }

        media = client.post('/page/triangle/rpc/area', content='{}')
        assert media.status_code == 415


def test_rpc_annotations_are_bounded_at_registration(tmp_path):
    pages = tmp_path / 'pages'
    pages.mkdir()
    (pages / 'bad.py').write_text('''from gramlot.page import WebPage, endpoint
class Page(WebPage):
    @endpoint
    def unsupported(self, values: tuple) -> tuple:
        return values
    def main(self, root):
        root.p("bad")
''')
    with pytest.raises(ValueError, match='supported TYTX scalar'):
        GramlotApplication(tmp_path)


def test_removed_concurrency_option_is_rejected():
    from gramlot.builder import GramlotBuilder
    with pytest.raises(TypeError, match='_concurrency is not supported'):
        GramlotBuilder('main').root.dataRpc('result', 'method', _concurrency='latest')
