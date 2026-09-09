# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python widget recipes retain decorations across typed transport."""
import base64
import json
from pathlib import Path
import subprocess

import pytest
from gramlot.transport import to_tytx
from gramlot.builder import GramlotBuilder


class TestWidgetLabels:
    @pytest.mark.parametrize("transport", ["json", "msgpack"])
    def test_python_recipe_uses_the_standalone_widget_label_runtime(self, transport):
        builder = GramlotBuilder("main")
        field = builder.root.textBox(value="Hello World", readonly=True, lbl="^caption",
                                       lbl_position="^position", lbl_color="gray",
                                       box_border="1px solid silver", box_padding="8px")
        builder.root.colorpicker(value="#336699", lbl="Color", lbl_position="TC")
        assert field.node_tag == "textBox"
        assert field.get_attr("lbl") == "^caption"
        assert len(builder.source) == 2  # No wrapper nodes inserted by Python.
        payload = to_tytx(builder.source, transport=transport)
        raw = payload if isinstance(payload, bytes) else payload.encode()
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
             str(folder / "widget_labels.mjs")],
            input=json.dumps({"transport": transport, "payload": base64.b64encode(raw).decode()}),
            text=True, capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout) == {"readonly": True, "label": "Changed", "position": "BR"}
