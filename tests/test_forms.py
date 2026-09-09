# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python forms run the common browser lifecycle through both TYTX transports."""
import base64
import json
from pathlib import Path
import subprocess

import pytest
from genro_bag import Bag
from genro_tytx import to_tytx
from gramlot.widget_test_builder import WidgetTestBuilder


class TestForms:
    @pytest.mark.parametrize("transport", ["json", "msgpack"])
    def test_python_recipe_uses_shared_form_runtime(self, transport):
        builder = WidgetTestBuilder("main")
        root = builder.source
        root.data("draft", Bag(dict(name="Alice", age=20, raw=None)))
        form = root.form(formId="contact", datapath="draft", controllerPath="forms.contact", blankIsNull=True)
        fields = form.formlet(columns=2, node_id="fields", gap="8px", item_lbl_color="blue")
        box = fields.labledBox(label="Contact", datapath=".address", box_l_background="silver", box_c_padding="6px")
        box.textBox(value="^.city", lbl="City", node_id="city")
        form.textBox(value="^.name", lbl="Name", node_id="name", validate_notnull=True)
        form.numberTextBox(value="^.age", node_id="age", validate_min=0)
        form.textBox(value="^.raw", node_id="raw", blankIsNull=False)
        form.textBox(value="^.code", node_id="code", validate_case="upper",
                     validate_call='return this.GET(".name") === "Alice" ? true : "owner";',
                     validate_depends=".name")
        form.textBox(value="^.async", node_id="async", validate_call="return Promise.resolve(true);")
        payload = to_tytx(builder.source, transport=transport)
        raw = payload if isinstance(payload, bytes) else payload.encode()
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"), str(folder / "forms.mjs")],
            input=json.dumps({"transport": transport, "payload": base64.b64encode(raw).decode()}),
            text=True, capture_output=True, timeout=30)
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout) == {"scope": "main.draft.address.city", "saved": True}
