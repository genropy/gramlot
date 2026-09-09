# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python slider/default recipes execute in the shared client runtime."""
import base64
import json
from pathlib import Path
import subprocess

import pytest
from genro_tytx import to_tytx
from gramlot.widget_test_builder import WidgetTestBuilder


class TestSliderDefaults:
    @pytest.mark.parametrize("transport", ["json", "msgpack"])
    def test_python_sliders_seed_numeric_data_and_commit(self, transport):
        builder = WidgetTestBuilder("main")
        for tag in ("horizontalSlider", "verticalSlider"):
            pane = builder.source.div(datapath=tag)
            getattr(pane, tag)(value="^.size", default_value=20, minimum=10, maximum=48,
                              discreteValues=39, intermediateChanges=True, lbl=tag)
        builder.source.div("Color", color="^color", default_color="red")
        payload = to_tytx(builder.source, transport=transport)
        raw = payload if isinstance(payload, bytes) else payload.encode()
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
             str(folder / "slider_defaults.mjs")],
            input=json.dumps({"transport": transport, "payload": base64.b64encode(raw).decode()}),
            text=True, capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr
        assert result.stdout.strip() == "verified"
