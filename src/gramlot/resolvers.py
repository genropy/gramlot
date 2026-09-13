"""Portable descriptions of browser-side RPC resolvers."""
from genro_bag.resolver import BagResolver


class RpcResolver(BagResolver):
    """Resolve an explicitly exposed page endpoint when a browser reads the node.

    Parameters are ordinary untrusted endpoint arguments, never Python imports
    or authority to access a database. The endpoint must validate them again.
    """

    class_kwargs = {**BagResolver.class_kwargs, 'method': None, 'params': None,
                    'cache_time': 300, 'as_bag': False}

    def load(self):
        raise RuntimeError('RpcResolver must be resolved by the browser RPC service')
