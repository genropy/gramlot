# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: the JS laboratory edits its live Bags and resets its preview."""
from pathlib import Path
import subprocess
from gramlot.pages.playground import PlaygroundPage
from gramlot.widget_test_builder import WidgetTestBuilder
from genro_tytx import to_tytx


def test_playground_session():
    folder = Path(__file__).parent
    builder = WidgetTestBuilder("main")
    PlaygroundPage().main(builder.source)
    result = subprocess.run(
        ['node', '--experimental-loader', str(folder / 'lab_loader.mjs'),
         str(folder / 'playground.mjs')], capture_output=True, text=True,
        input=to_tytx(builder.source, transport="json"))
    assert result.returncode == 0, result.stderr
