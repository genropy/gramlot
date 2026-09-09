# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Explicit Source snapshots for the browser wire contract.

Only this owned transport type is registered; generic Builders classes are not
modified. Authoring wrappers never enter the wire payload.
"""
from genro_bag import Bag
from genro_builders.builder import SourceBag
from genro_tytx import register_class, to_tytx as encode


@register_class
class SourceSnapshot(SourceBag):
    __tytx_suffix__ = 'XS'


def snapshot(value):
    if isinstance(value, Bag):
        result = SourceSnapshot() if isinstance(value, SourceBag) else Bag()
        for node in value:
            result.set_item(node.label, snapshot(node.value), node_tag=node.node_tag,
                            _attributes={key: snapshot(item) for key, item in node.attr.items()})
        return result
    if isinstance(value, dict):
        return {key: snapshot(item) for key, item in value.items()}
    if isinstance(value, list):
        return [snapshot(item) for item in value]
    if isinstance(value, tuple):
        return tuple(snapshot(item) for item in value)
    return value


def to_tytx(value, transport='json', **kwargs):
    """Encode a detached typed snapshot, preserving ordinary Data Bags."""
    return encode(snapshot(value), transport=transport, **kwargs)
