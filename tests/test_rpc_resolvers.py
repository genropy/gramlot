"""Lazy descriptors must survive RPC serialization without executing Python."""
import pytest
from genro_bag import Bag
from genro_bag.resolver import BagResolver
from genro_tytx import from_tytx
from gramlot.resolvers import RpcResolver
from gramlot.transport import to_tytx


def test_rpc_resolver_survives_nested_transport_without_loading():
    bag = Bag()
    resolver = RpcResolver(method='relation_tree', params={'table': 'invc.customer', 'path': ['@invoices']})
    bag.set_item('invoices', resolver, _attributes={'caption': 'Invoices'})
    wire = to_tytx({'ok': True, 'result': bag})
    result = from_tytx(wire, transport='json')['result']
    node = next(iter(result))
    assert isinstance(node.resolver, RpcResolver)
    assert node.resolver.serialize()['kwargs']['params']['path'] == ['@invoices']
    assert node.attr['caption'] == 'Invoices'
    assert node.get_value(static=True) is None
    assert next(iter(bag)).resolver is resolver


def test_unadapted_resolver_fails_without_running():
    class Unexpected(BagResolver):
        def load(self):
            pytest.fail('Transport must not execute a resolver')
    bag = Bag()
    bag.set_item('branch', Unexpected())
    with pytest.raises(TypeError, match='Only RpcResolver'):
        to_tytx(bag)


def test_relation_tree_rejects_unexposed_roots_before_database_access():
    from gramlot.contrib.fastapi_genropy import GenropyPage
    page = GenropyPage()
    with pytest.raises(ValueError, match='exposed relation root'):
        page.relation_tree('invc.customer')
    page.relation_roots = ('invc.customer',)
    with pytest.raises(ValueError, match='relation path'):
        page.relation_tree('invc.customer', 'arbitrary.path')
    with pytest.raises(ValueError, match='relation path'):
        page.relation_tree('invc.customer', ['@invoices'] * 33)


def test_real_genropy_relation_rpc():
    """Opt in with GRAMLOT_TEST_GENROPY_INSTANCE=test_invoice_pg; metadata only."""
    import os
    from pathlib import Path
    instance = os.environ.get('GRAMLOT_TEST_GENROPY_INSTANCE')
    if not instance:
        pytest.skip('Set GRAMLOT_TEST_GENROPY_INSTANCE for the real model integration')
    from gnr.app.gnrapp import GnrApp
    from fastapi.testclient import TestClient
    from genro_tytx import to_tytx as encode
    from gramlot.contrib.fastapi_genropy import create_genropy_application
    directory = Path(__file__).resolve().parents[1] / 'docs/examples/states-grid'
    app = create_genropy_application(directory, genropy_application=GnrApp(instance))
    with TestClient(app) as client:
        for path, count in [([], 6), (['@invoices'], 6), (['@invoices', '@rows'], 3)]:
            response = client.post('/page/relation-tree/rpc/data/relation_tree',
                content=encode({'table': 'invc.customer', 'path': path}, transport='json'),
                headers={'content-type': 'application/vnd.tytx+json'})
            assert response.status_code == 200, response.text
            branch = from_tytx(response.text, transport='json')['result']
            def fields(bag):
                for item in bag:
                    if item.attr.get('node_kind') == 'group':
                        yield from fields(item.get_value(static=True))
                    else:
                        yield item
            assert sum(node.resolver is not None for node in fields(branch)) == count
            if not path:
                hints = {n.label: n.attr.get('subquery_paths') for n in fields(branch)}
                assert hints['n_invoices'] == ['n_invoices']
                assert hints['customer_rank'] == ['customer_rank → n_invoices']
                assert hints['avg_invoice_value']
                assert hints['has_activity']
                assert hints['invoice_numbers']
                assert not hints['display_name']
                assert not hints['state_name']
            assert not any(node.label.startswith('subtable_') for node in fields(branch))
            assert not any(node.label == 'subtables' for node in branch)
            for node in fields(branch):
                if node.resolver:
                    assert node.attr['caption'].startswith('@')
                    assert not node.attr['caption'].startswith('@@')
                    assert node.resolver.serialize()['kwargs']['params']['path'] == [*path, node.label]
                    assert node.get_value(static=True) is None
        for params in [{'table': 'adm.user'}, {'table': 'invc.customer', 'path': ['account_name']}]:
            response = client.post('/page/relation-tree/rpc/data/relation_tree',
                content=encode(params, transport='json'),
                headers={'content-type': 'application/vnd.tytx+json'})
            assert response.status_code == 500
            assert from_tytx(response.text, transport='json')['ok'] is False


def test_relation_tree_authoring_declares_component_with_isolated_rpc_stores():
    from gramlot.builder import GramlotBuilder
    builder = GramlotBuilder()
    first = builder.root.relationTree('invc.customer', selectedPath='^selected')
    second = builder.root.relationTree('invc.invoice')
    assert first.node.node_tag == 'relationTree'
    assert first.node.attr['table'] == 'invc.customer'
    assert first.node.attr['store'] != second.node.attr['store']
    assert first.node.attr['selectedPath'] == '^selected'
    declarations = list(builder.source)
    assert [node.node_tag for node in declarations] == ['dataRpc', 'relationTree', 'dataRpc', 'relationTree']
    assert declarations[0].attr['table'] == 'invc.customer'
    assert declarations[0].attr['destination'] == first.node.attr['store'][1:]


def test_legacy_group_presentation_keeps_rpc_model_paths():
    from gramlot.contrib.fastapi_genropy.application import group_relation_fields
    bag = Bag()
    bag.set_item('hidden', None, _attributes={'group': '_'})
    bag.set_item('ordered', None, _attributes={'group': '001'})
    bag.set_item('phone', None, _attributes={'group': 'contacts.phone.02'})
    bag.set_item('relation', RpcResolver(method='relation_tree', params={'path': ['@state']}),
                 _attributes={'group': 'contacts.phone.01', 'fieldpath': '@state'})
    bag.set_item('advanced', None, _attributes={'group': '*contacts.03'})
    grouped = group_relation_fields(bag, {'contacts': 'Contacts', 'contacts.phone': 'Phone'}, omit='_*')
    assert [n.label for n in grouped] == ['ordered', 'contacts']
    phone = grouped.get_item('contacts.phone')
    assert [n.label for n in phone] == ['relation', 'phone']
    node = phone.get_node('relation')
    assert node.resolver.serialize()['kwargs']['params']['path'] == ['@state']
    assert node.attr['fieldpath'] == '@state'
    flat = group_relation_fields(bag, {}, omit='', dosort=False)
    assert flat.get_node('hidden') is not None
    assert flat.get_node('advanced').attr['group'] == 'contacts.03'


def test_descending_relation_group_is_opt_in():
    from gramlot.contrib.fastapi_genropy.application import group_relation_fields
    bag = Bag()
    bag.set_item('@invoices', RpcResolver(method='relation_tree'),
                 _attributes={'group': 'relations.01', 'relation_direction': 'descending'})
    groups = {'relations': 'Relations'}
    assert group_relation_fields(bag, groups).get_node('@invoices') is not None
    assert group_relation_fields(bag, groups, group_descending=True).get_node('relations.@invoices') is not None
