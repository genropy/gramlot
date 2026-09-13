"""Python chartBox composition stays inside Source and independent Data paths."""
from gramlot.builder import GramlotBuilder
from genro_builders.builder import SourceBag


def walk(source):
    for node in source:
        yield node
        if isinstance(node.value, SourceBag):
            yield from walk(node.value)


def test_chartbox_palettes_use_structure_paths_and_independent_open_state():
    builder = GramlotBuilder('main')
    for name in ('first', 'second'):
        pane = builder.root.div(datapath=name)
        pane.chartBox(store='^.rows', structpath='.structure', selectedKey='^.selection')
    nodes = list(walk(builder.source))
    charts = [n for n in nodes if n.node_tag == 'chart']
    palettes = [n for n in nodes if n.node_tag == 'palette']
    assert len(charts) == len(palettes) == 2
    # The browser adds the application root (main) when loading the recipe.
    assert [n.attr['datapath'] for n in palettes] == ['first.structure', 'second.structure']
    assert len({n.attr['value'] for n in palettes}) == 2
    for n in charts:
        assert n.attr['store'] == '^.rows'
        assert n.attr['structpath'] == '.structure'
        assert n.attr['selectedKey'] == '^.selection'
    controls = [n for n in nodes if n.node_tag == 'textBox']
    assert {n.attr['value'] for n in controls} == {'^.title', '^.captionField', '^.valueField', '^.color'}


def test_chart_example_is_python_authored_without_application_dom_or_fetch():
    from pathlib import Path
    text = (Path(__file__).resolve().parents[1] / 'docs/examples/chartbox/pages/chart.py').read_text()
    for bypass in ('document.', 'querySelector', 'addEventListener', 'fetch(', '.innerHTML'):
        assert bypass not in text
    assert 'views.chartBox(' in text
    assert "selectedKey='^selection'" in text
