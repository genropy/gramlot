"""A prebuilt wheel runtime is shared by pages and served without a JS build."""
import json

import pytest

pytest.importorskip('fastapi')
pytest.importorskip('httpx')
from fastapi import FastAPI
from fastapi.testclient import TestClient

import gramlot
from gramlot.contrib.fastapi.runtime import RuntimeAssets


@pytest.fixture
def bundled_package(tmp_path, monkeypatch):
    package = tmp_path / 'gramlot'
    browser = package / 'resources' / 'browser'
    esm = browser / 'esm'
    esm.mkdir(parents=True)
    entries = {
        'gramlot-dom': 'esm/dom.js',
        'gramlot-builder': 'esm/builder.js',
        'gramlot-page-startup': 'esm/startup.js',
        'gramlot-dom/date-parser': 'esm/date-parser.js',
    }
    for relative in entries.values():
        (browser / relative).write_text('export const value = "' + 'x' * 1500 + '";')
    (esm / 'inspector.css').write_text(':host { display: block; }')
    manifest = {'schemaVersion': 1, 'frameworkVersion': '0.1.0a1',
                'buildId': 'a' * 64, 'entryPoints': entries}
    (browser / 'manifest.json').write_text(json.dumps(manifest))
    monkeypatch.setattr(gramlot, '__file__', str(package / '__init__.py'))
    return browser, manifest


def test_prebuilt_entries_resources_compression_and_cache(bundled_package):
    browser, manifest = bundled_package
    runtime = RuntimeAssets('/app')
    expected_base = '/app/_runtime/' + manifest['buildId'] + '/'
    assert runtime.entry_url == expected_base + 'esm/startup.js'
    assert 'gramlot-page-startup' not in runtime.import_map()
    assert runtime.import_map()['gramlot-dom/date-parser'] == expected_base + 'esm/date-parser.js'
    app = FastAPI()
    runtime.mount(app)
    with TestClient(app) as client:
        response = client.get(runtime.import_map()['gramlot-dom'], headers={'Accept-Encoding': 'gzip'})
        assert response.text == (browser / 'esm/dom.js').read_text()
        assert response.headers['content-encoding'] == 'gzip'
        assert 'Accept-Encoding' in response.headers['vary']
        assert response.headers['cache-control'] == 'public, max-age=31536000, immutable'
        css = client.get(expected_base + 'esm/inspector.css')
        assert css.status_code == 200
        assert 'text/css' in css.headers['content-type']
        unchanged = client.get(expected_base + 'esm/inspector.css', headers={'If-None-Match': css.headers['etag']})
        assert unchanged.status_code == 304
        assert 'immutable' in unchanged.headers['cache-control']
        for path in (expected_base + 'missing.js', '/app/_runtime/' + 'b' * 64 + '/esm/dom.js'):
            missing = client.get(path)
            assert missing.status_code == 404
            assert 'immutable' not in missing.headers.get('cache-control', '')


def test_source_checkout_without_browser_manifest_keeps_source_entries(tmp_path, monkeypatch):
    monkeypatch.setattr(gramlot, '__file__', str(tmp_path / 'gramlot' / '__init__.py'))
    runtime = RuntimeAssets('/app')
    assert runtime.entry_url == '/app/_runtime/common/entry.js'
    assert runtime.import_map()['gramlot-dom'] == '/app/_runtime/dom/index.js'


@pytest.mark.parametrize('change', [
    {'schemaVersion': 2}, {'buildId': '../invalid'},
    {'entryPoints': {}},
    {'entryPoints': {'gramlot-dom': '../outside.js', 'gramlot-builder': 'esm/builder.js',
                     'gramlot-page-startup': 'esm/startup.js'}},
])
def test_invalid_present_manifest_fails_instead_of_silent_source_fallback(bundled_package, change):
    browser, manifest = bundled_package
    manifest.update(change)
    (browser / 'manifest.json').write_text(json.dumps(manifest))
    with pytest.raises(ValueError):
        RuntimeAssets('/app')
