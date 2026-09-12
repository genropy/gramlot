# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Authoring declarations for browser-owned local data logic."""
from genro_builders.builder import element


class LogicElementDeclarations:
    """Gramlot-owned server provider tags added to the generic HTML grammar."""

    @element(sub_tags='', _meta={'data_element': 'rpc'})
    def dataRpc(self, **kwargs): ...

    @element(sub_tags='', _meta={'data_element': 'rpc'})
    def rpcStore(self, **kwargs): ...

    @element(sub_tags='', _meta={'data_element': 'store'})
    def bagStore(self, **kwargs): ...

    @element(sub_tags='', _meta={'data_element': 'source'})
    def remoteSource(self, **kwargs): ...


class LogicDeclarations:
    """Mixin for the :class:`gramlot.builder.AuthoringNode` facade."""

    def dataSetter(self, destination, value, **attrs):
        """Assign ``value`` to a Data destination when this branch is installed."""
        if not isinstance(destination, str) or not destination:
            raise TypeError('dataSetter destination must be a nonempty string')
        declaration = self._declaration('dataSetter', destination=destination, **attrs)
        # Generic Bag authoring removes null attributes by default. A setter's
        # explicit None is data, so retain it deliberately on the Source node.
        declaration.node.set_attr({'value': value}, _remove_null_attributes=False)
        return declaration

    def data(self, destination, value, **attrs):
        """Compatibility spelling for :meth:`dataSetter`."""
        return self.dataSetter(destination, value, **attrs)

    def dataFormula(self, destination, formula, **attrs):
        """Declare a JavaScript expression which writes ``destination``."""
        if 'func' in attrs:
            raise TypeError('dataFormula uses formula; func is not supported')
        if not isinstance(destination, str) or not destination:
            raise TypeError('dataFormula destination must be a nonempty string')
        if not isinstance(formula, str) or not formula:
            raise TypeError('dataFormula requires a nonempty JavaScript expression')
        return self._declaration('dataFormula', destination=destination, formula=formula, **attrs)

    def dataController(self, func, **attrs):
        """Declare a JavaScript side-effect script (stored as ``func`` on Source)."""
        if not isinstance(func, str) or not func:
            raise TypeError('dataController requires a nonempty JavaScript script')
        return self._declaration('dataController', func=func, **attrs)

    @staticmethod
    def _page_method_reference(method, expected_role):
        if callable(method):
            from gramlot.page import WebPage

            owner = getattr(method, '__self__', None)
            function = getattr(method, '__func__', method)
            if (not isinstance(owner, WebPage)
                    or getattr(function, '__gramlot_page_role__', None) != expected_role):
                decorator = '@endpoint' if expected_role == 'data' else '@source'
                raise TypeError(
                    f'Callable page methods must be bound and marked {decorator}'
                )
            return function.__name__
        if not isinstance(method, str) or not method:
            raise TypeError('Service method must be a nonempty logical name')
        return method

    def dataRpc(self, destination, method=None, **params):
        """Call an explicitly exposed server method through the shared RPC service.

        ``destination`` may be omitted when the first argument is a marked bound
        page method.  A callable is serialized as its logical method name; Python
        code is never sent to the browser.
        """
        if callable(destination) and method is None:
            destination, method = None, destination
        if '_concurrency' in params:
            raise TypeError('_concurrency is not supported; dataRpc owns one pending call')
        method = self._page_method_reference(method, 'data')
        if destination is not None and (not isinstance(destination, str) or not destination):
            raise TypeError('dataRpc destination must be a nonempty string or None')
        attrs = dict(method=method, **params)
        if destination is not None:
            attrs['destination'] = destination
        return self._declaration('dataRpc', **attrs)

    def rpcStore(self, rpcmethod, *, storeCode, storepath, _identifier, **params):
        """Declare a named RPC collection; typed rows become a browser Bag."""
        if '_concurrency' in params:
            raise TypeError('_concurrency is not supported')
        if '_onStart' in params:
            params['_on_start'] = params.pop('_onStart')
        for name, value in dict(storeCode=storeCode, storepath=storepath,
                                _identifier=_identifier).items():
            if not isinstance(value, str) or not value:
                raise TypeError(f'{name} must be a nonempty string')
        return self._declaration('rpcStore', method=self._page_method_reference(rpcmethod, 'data'),
                                 storeCode=storeCode, storepath=storepath,
                                 _identifier=_identifier, **params)

    def bagStore(self, *, storeCode, storepath, _identifier=None, datamode='bag'):
        """Declare a shared collection over an existing Data Bag."""
        if not storeCode or not storepath:
            raise TypeError('bagStore requires storeCode and storepath')
        return self._declaration('bagStore', storeCode=storeCode, storepath=storepath,
                                 _identifier=_identifier, datamode=datamode)

    def remote(self, method, **params):
        """Configure this existing contentPane with server-built Source.

        The provider is a transparent child owned by the container. This initial
        experiment deliberately supports only contentPane destinations.
        """
        from genro_builders.builder import SourceBagNode

        if not isinstance(self.node, SourceBagNode) or self.node.node_tag != 'contentPane':
            raise TypeError('remote is currently supported only on an existing contentPane')
        method = self._page_method_reference(method, 'source')
        params.setdefault('_on_start', True)
        return self._declaration('remoteSource', method=method, **params)
