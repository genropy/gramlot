"""Optional adapter contracts: discovery, isolated requests and FastAPI composition."""
import pytest

pytest.importorskip('fastapi')
pytest.importorskip('httpx')
from fastapi import FastAPI
from fastapi.testclient import TestClient
from gramlot.contrib.fastapi import GramlotApplication, mount_gramlot


def page_file(root, name='hello', body=None):
    directory = root / 'pages'
    directory.mkdir(exist_ok=True)
    (directory / f'{name}.py').write_text(body or '''from gramlot.page import WebPage
class Page(WebPage):
    title = "Hello"
    def main(self, root):
        root.h1("Hello World")
''')


def test_discovery_and_fresh_requests(tmp_path, monkeypatch):
    page_file(tmp_path)
    page_file(tmp_path, '_ignored', 'raise RuntimeError("must not import")')
    (tmp_path / 'pages' / 'nested').mkdir()
    monkeypatch.chdir(tmp_path)
    app = GramlotApplication(title='Custom API')
    assert isinstance(app, FastAPI)
    assert list(app.gramlot_pages.page_classes) == ['hello']
    @app.get('/health')
    def health():
        return {'ok': True}
    with TestClient(app) as client:
        assert client.get('/health').json() == {'ok': True}
        assert client.get('/openapi.json').json()['info']['title'] == 'Custom API'
        assert client.get('/page/hello/').status_code == 200
        first = client.get('/page/hello/recipe')
        assert first.status_code == 200
        assert first.headers['content-type'] == 'application/vnd.tytx+json'
        assert 'Hello World' in first.text
        assert client.get('/page/hello/recipe').text == first.text
        assert client.get('/page/missing/').status_code == 404
        assert client.get('/page/missing/recipe').status_code == 404


def test_two_applications_and_native_mount(tmp_path):
    one = tmp_path / 'one'
    one.mkdir()
    two = tmp_path / 'two'
    two.mkdir()
    page_file(one)
    page_file(two, 'beta')
    app = FastAPI()
    mount_gramlot(app, one, prefix='/one')
    mount_gramlot(app, two, prefix='/two')
    child = GramlotApplication(one)
    app.mount('/child', child)
    with TestClient(app) as client:
        for url in ['/one/hello/recipe', '/two/beta/recipe', '/child/page/hello/recipe']:
            assert client.get(url).status_code == 200
        assert client.get('/one/beta/recipe').status_code == 404


@pytest.mark.parametrize('name,body', [
    ('recipe', 'pass'),
    ('bad', 'class Page: pass'),
    ('bad', 'from gramlot.page import WebPage\nclass Page(WebPage): pass'),
    ('bad', 'syntax error!'),
])
def test_invalid_page_fails_at_startup(tmp_path, name, body):
    page_file(tmp_path, name, body)
    with pytest.raises(ValueError, match=name):
        GramlotApplication(tmp_path)


def test_missing_pages_directory(tmp_path):
    with pytest.raises(ValueError, match='Pages directory not found'):
        GramlotApplication(tmp_path)


@pytest.mark.parametrize('explicit', [False, True])
def test_cli_directory(tmp_path, monkeypatch, explicit):
    import sys
    import uvicorn
    from gramlot.__main__ import Cli
    page_file(tmp_path)
    monkeypatch.chdir(tmp_path)
    argv = ['gramlot', 'fastapi', 'serve']
    if explicit:
        argv.append(str(tmp_path))
    argv.extend(['--port', '8765'])
    monkeypatch.setattr(sys, 'argv', argv)
    calls = []
    monkeypatch.setattr(uvicorn, 'run', lambda app, **options: calls.append((app, options)))
    Cli().run()
    app, options = calls[0]
    assert app.gramlot_pages.directory == tmp_path
    assert options == {'host': '127.0.0.1', 'port': 8765}
