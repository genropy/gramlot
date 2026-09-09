# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Host the page application once per worker, using its traffic thread pool."""
from functools import partial

from genro_asgi import AsgiServer
from genro_asgi.spa.orchestration.spa_worker import SpaWorker

from .demo import DemoApplication


class PageServer(AsgiServer):
    """Dispatch synchronous routes through the worker's request context."""

    def __init__(self, worker, **kwargs):
        self.worker = worker
        super().__init__(**kwargs)

    async def run_sync(self, fn, *args):
        return await self.worker.run_sync(partial(fn, *args))


class PageWorker(SpaWorker):
    """A native ASGI worker for the registered page demonstration."""

    def __init__(self, name, *, client_modules, rpc_http_method="WSK", **kwargs):
        super().__init__(name, **kwargs)
        application = DemoApplication(client_modules=client_modules, worker=self, rpc_http_method=rpc_http_method)
        self.asgi_app = PageServer(self, applications=[application])
