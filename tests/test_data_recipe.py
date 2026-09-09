# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: GUI data spelling seeds recipes without changing generic datastore access."""
from genro_bag import Bag
from genro_builders.contrib.html.html_builder import HtmlBuilder
from gramlot.widget_test_builder import WidgetTestBuilder


def test_gui_data_alias():
    builder = WidgetTestBuilder("main")
    builder.source.data("initial", "hello")
    pane = builder.source.div(datapath="demo")
    pane.data(".record", Bag(dict(name="Astra", count=2)))
    nodes = list(builder.source)
    assert nodes[0].node_tag == "dataSetter"
    assert list(nodes[1].value)[0].node_tag == "dataSetter"
    pane.set_relative_data(".direct", "working")
    assert pane.get_relative_data(".direct") == "working"


def test_generic_node_keeps_datastore_property():
    builder = HtmlBuilder("main")
    pane = builder.source.div()
    assert pane.data is builder.data


def test_javascript_gui_alias():
    from pathlib import Path
    import subprocess
    folder = Path(__file__).parent
    result = subprocess.run(['node', '--experimental-loader', str(folder / 'lab_loader.mjs'),
                             str(folder / 'data_recipe.mjs')], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
