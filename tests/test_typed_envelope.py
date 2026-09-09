# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: typed source/data and RAW bytes cross Python/JS in a text envelope.

This runs real codecs and DOM under jsdom, not a WebSocket connection.
"""

from datetime import date
from decimal import Decimal
import json
import os
from pathlib import Path
import subprocess

from genro_bag import Bag
from genro_builders.contrib.html.html_builder import HtmlBuilder
from genro_tytx import from_tytx, to_tytx

from gramlot.pages.hello_world import HelloWorldPage
from genro_builders.builder import SourceBag


class TestTypedEnvelope:
    def test_source_data_and_raw_cross_javascript(self):
        modules = Path(os.environ.get("GRAMLOT_CLIENT_MODULES", Path(__file__).resolve().parents[2]))
        data = Bag()
        data.set_item("record.phone", "0123", _attributes={"_loadedValue": "0123"})
        data.set_item("record.amount", Decimal("1234567890.123456789"),
                      _attributes={"required": True, "precision": 9})
        data.set_item("record.when", date(2026, 9, 6))
        data.set_item("record.empty", None)
        data.set_item("record.branch", Bag())
        data.set_item("record.text", '"quoted"\nbackslash\\ è')
        builder = HtmlBuilder("main")
        HelloWorldPage().main(builder.source)
        builder.source.set_item("seed", Bag({"phone": "0123"}), node_tag="dataSetter",
                                _attributes={"destination": "seed", "value": "ready"})
        payload = {"source": builder.source, "data": data,
                   "binary": bytes(range(256))}
        wire = "WSX://" + json.dumps({"id": "root:1", "method": "WSK",
                                     "path": "/spa/probe/echo", "page_id": "probe-page",
                                     "data": to_tytx(payload, "json")})
        result = subprocess.run(
            ["node", str(Path(__file__).with_name("typed_envelope.mjs")), str(modules)],
            input=wire, text=True, capture_output=True, check=True,
        )
        assert result.stdout.startswith("WSX://")
        envelope = json.loads(result.stdout[6:])
        assert envelope["id"] == "root:1" and envelope["status"] == 200
        reply = from_tytx(envelope["data"], "json")
        returned = reply["data"]
        source = reply["source"]
        assert type(source) is SourceBag
        assert type(source["div_0"]) is SourceBag
        assert type(source["seed"]) is Bag
        assert source["seed.phone"] == "0123"
        assert isinstance(returned, Bag)
        assert returned["record.phone"] == "0456"
        assert returned.get_node("record.phone").attr["_loadedValue"] == "0123"
        assert returned["record.amount"] == Decimal("1234567890.123456789")
        assert returned.get_node("record.amount").attr == {"required": True, "precision": 9}
        assert returned["record.when"] == date(2026, 9, 6)
        assert returned["record.empty"] is None
        assert isinstance(returned["record.branch"], Bag) and not returned["record.branch"].nodes
        assert returned["record.text"] == data["record.text"]
        assert [n.label for n in returned["record"].nodes] == [n.label for n in data["record"].nodes]
        assert reply["binary"] == bytes(range(256))
        assert source.get_node("div_0.h1_0").node_tag == "h1"
        assert source["div_0.h1_0"] == "Hello World"
