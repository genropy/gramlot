"""The common example host needs FastAPI, not a GenroPy application."""
import importlib.util
from pathlib import Path

import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]


def test_common_host_serves_examples_and_fixture_contract(tmp_path):
    spec = importlib.util.spec_from_file_location('gramlot_example_host', ROOT / 'docs/examples/serve.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    (tmp_path / 'runtime/version/dom').mkdir(parents=True)
    (tmp_path / 'runtime/version/dom/example.js').write_text('export const example = true;')
    (tmp_path / 'index.html').write_text('<html><head></head><body>Tutorial fixture</body></html>')
    with TestClient(module.create_app(tmp_path)) as client:
        assert 'Tutorial fixture' in client.get('/').text
        assert 'example-navigation' in client.get('/').text
        for url in ('/page/triangle/', '/hello/hello/', '/openapi/'):
            assert 'id="example-navigation"' in client.get(url).text
        assert 'id="example-navigation"' not in client.get('/example-navigation/').text
        response = client.get('/example-navigation/recipe', params={'current':'/page/triangle/'})
        assert response.status_code == 200
        assert 'Triangle RPC' in response.text
        assert 'DB not enabled' in response.text
        assert 'aria-current' in response.text
        assert client.get('/runtime/dom/example.js').status_code == 200
        assert client.get('/page/triangle/').status_code == 200
        assert client.get('/hello/hello/').status_code == 200
        assert client.get('/openapi/').status_code == 200
        assert client.get('/api/products', params={'q': 'desk', 'available': True}).json()[0]['id'] == 1
        assert client.get('/api/products/999').status_code == 404
        response = client.post('/api/quote', json={'productId': 1, 'quantity': 4})
        assert response.status_code == 200
        assert response.json()['total'] == 196
        for payload in ({'productId':1,'quantity':0}, {'productId':1,'quantity':True},
                        {'productId':999,'quantity':1}):
            assert client.post('/api/quote', json=payload).status_code == 422
