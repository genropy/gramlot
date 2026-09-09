# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: the Python inspector observes real Bags and disposes its shortcut."""
from pathlib import Path
import subprocess
from gramlot.inspector import build_inspector
from gramlot.widget_test_builder import WidgetTestBuilder
from genro_tytx import to_tytx


def test_inspector_session():
    folder = Path(__file__).parent
    builder = WidgetTestBuilder("main")
    build_inspector(builder.source)
    result = subprocess.run(
        ['node', '--experimental-loader', str(folder / 'lab_loader.mjs'),
         str(folder / 'inspector.mjs')], capture_output=True, text=True,
        input=to_tytx(builder.source, transport="json"))
    assert result.returncode == 0, result.stderr
