"""Public dependency boundary, parent ownership and typed wire behavior."""
import pytest
from genro_bag import Bag
from genro_builders.contrib.html.html_builder import HtmlBuilder
from genro_tytx import from_tytx

from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx


def test_parent_and_generic_datastore_are_independent():
    builder = GramlotBuilder()
    left = builder.root.div(datapath='left')
    right = builder.root.div(datapath='right')
    for parent, value in [(left, False), (right, 0)]:
        parent.data('.value', value)
        parent.div('^.value')
    assert left.node.data is builder.data
    assert left.store is builder.data
    assert left.node.value.get_nodes()[0].attr['value'] is False
    assert right.node.value.get_nodes()[0].attr['value'] == 0
    assert left.node.abs_datapath('.value') == 'left.value'
    assert right.node.abs_datapath('.value') == 'right.value'
    assert HtmlBuilder().source.div().data.__class__ is Bag


def test_browser_logic_is_only_declared_and_invalid_calls_are_atomic():
    class Recipe(GramlotBuilder):
        def main(self, root):
            root.dataFormula('.total', '({qty}) => qty * 2', qty='^.qty')
            root.dataController('(node) => node.SET("ran", true)', _on_start=True)
    builder = Recipe()
    builder.create()
    assert builder.data.get_item('ran') is None
    assert len(builder.source) == 2
    assert builder.source.get_nodes()[0].attr['formula'].startswith('({qty})')
    with pytest.raises(TypeError):
        builder.root.dataFormula('.x', '() => 1', func='wrong')
    assert len(builder.source) == 2


@pytest.mark.parametrize('transport', ['json', 'msgpack'])
def test_snapshot_preserves_source_and_ordinary_data_types(transport):
    builder = GramlotBuilder()
    builder.root.div().div('child')
    data = Bag({'empty': '', 'null': None, 'zero': 0, 'false': False})
    builder.root.data('payload', data)
    result = from_tytx(to_tytx({'source': builder.source, 'data': data}, transport), transport)
    assert isinstance(result['source'], Bag)
    assert type(result['source']).__name__ == 'SourceSnapshot'
    assert type(result['source'].get_nodes()[0].value).__name__ == 'SourceSnapshot'
    assert type(result['data']) is Bag
    assert result['data'].get_item('empty') == ''
    assert result['data'].get_item('null') is None
    assert result['data'].get_item('false') is False
    assert result['data'].get_item('zero') == 0
    assert type(builder.source).__name__ == 'SourceBag'
