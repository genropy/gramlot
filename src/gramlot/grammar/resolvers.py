# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Browser HTTP resolvers expressed through Source-owned controllers."""
import json


class ResolverAuthoring:
    def _http_resolver(self, kind, destination, url, **options):
        if not isinstance(destination, str) or not destination:
            raise TypeError('Resolver destination must be a nonempty Data path')
        bindings = {}

        def encode(value, bind=True):
            if bind and isinstance(value, str) and value.startswith(('^', '=')) and not value.startswith('=='):
                name = f'resolverArg{len(bindings)}'
                bindings[name] = value
                return name
            if isinstance(value, dict):
                return '{' + ','.join(f'{json.dumps(k)}:{encode(v)}' for k, v in value.items()) + '}'
            if isinstance(value, list):
                return '[' + ','.join(encode(item) for item in value) + ']'
            return json.dumps(value)

        on_start = options.pop('_on_start', True)
        props = dict(destination=destination, url=url, **options)
        encoded = ','.join(f'{json.dumps(key)}:{encode(value, key not in ("destination", "status", "_onResult", "_onError"))}' for key, value in props.items())
        return self.dataController(f'genro.resolvers.load(this, {json.dumps(kind)}, {{{encoded}}});',
                                   _on_start=on_start, **bindings)

    def urlResolver(self, destination, url, **options):
        return self._http_resolver('url', destination, url, **options)

    def openApiResolver(self, destination, url, **options):
        return self._http_resolver('openapi', destination, url, **options)

    def openApiClient(self, schema='^schema', selection='^selection'):
        """Install the browser OpenAPI client in the current Data scope.

        Produces navigation, request/response Bags and response grid structure.
        Pair with openApiForm in the same datapath. No Python HTTP request runs.
        """
        self.dataController('genro.openapi.prepare(this, {schema});', schema=schema)
        self.dataController(
            'genro.openapi.execute(this, {_triggerpars, genro});',
            send='^send', cancel='^cancel', selection=selection)
        self.dataController('genro.openapi.response(this, {response});', response='^response')

    def openApiForm(self, schema='=schema', selection='^selection', **attributes):
        """Generate bound form Source from the selected OpenAPI operation."""
        pane = self.div(**attributes)
        pane.dataController('genro.openapi.select(this, {schema, selection});',
                            schema=schema, selection=selection)
        return pane
