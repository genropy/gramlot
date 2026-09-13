"""The runnable example exercises the real Source role and typed transport."""
from pathlib import Path

import pytest

pytest.importorskip('fastapi')
pytest.importorskip('httpx')
from fastapi.testclient import TestClient
from genro_tytx import from_tytx, to_tytx
from gramlot.contrib.fastapi import GramlotApplication


def test_remote_example_source_dispatch_and_recovery():
    directory = Path(__file__).resolve().parents[1] / 'docs/examples/triangle-rpc'
    with TestClient(GramlotApplication(directory)) as client:
        def fragment(choice):
            response = client.post('/page/remote-source/rpc/source/fragment',
                                   content=to_tytx({'choice': choice}, transport='json'),
                                   headers={'content-type': 'application/vnd.tytx+json'})
            return response, from_tytx(response.text, transport='json')

        assert client.get('/page/remote-source/').status_code == 200
        first, envelope = fragment('contact')
        assert first.status_code == 200
        card = envelope['result'].get_item('div_0')
        assert card.get_item('h2_0') == 'Contact'
        editor = next(node for node in card.get_nodes()
                      if node.attr.get('id') == 'fragment-input')
        assert editor.attr['value'] == '^.draft'
        failure, envelope = fragment('error')
        assert failure.status_code == 500
        assert envelope['error']['kind'] == 'application'
        retry, envelope = fragment('notes')
        assert retry.status_code == 200
        assert envelope['result'].get_item('div_0.h2_0') == 'Notes'
