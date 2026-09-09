# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: the JS laboratory edits its live Bags and resets its preview."""
from pathlib import Path
import subprocess
from gramlot.pages.playground import PlaygroundPage
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx


def test_playground_session():
    folder = Path(__file__).parent
    builder = GramlotBuilder("main")
    PlaygroundPage().main(builder.root)
    result = subprocess.run(
        ['node', '--experimental-loader', str(folder / 'lab_loader.mjs'),
         str(folder / 'playground.mjs')], capture_output=True, text=True,
        input=to_tytx(builder.source, transport="json"))
    assert result.returncode == 0, result.stderr
