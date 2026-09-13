"""FastAPI adapter: read this class from startup to request handling."""

from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import HTMLResponse, Response
from genro_tytx import from_tytx
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx
from gramlot.contrib._shared.pages import (
    PageRegistry, ServiceParameterError, DEFAULT_PREFIX, TYTX_FORMAT, TYTX_MEDIA_TYPE,
)
from gramlot.contrib._shared.runtime import render_document, script_json
from .runtime import RuntimeAssets


class GramlotApplication(FastAPI):
    """A normal FastAPI application with its Gramlot pages already registered.

    Extra keyword arguments go to FastAPI, for example title or lifespan.
    FastAPI's own mount(), route decorators and middleware API remain unchanged.
    """

    def __init__(self, directory: str | Path | None = None, *, prefix: str = DEFAULT_PREFIX,
                 page_title: str = "Gramlot", **fastapi_options):
        super().__init__(**fastapi_options)
        self.gramlot_pages = mount_gramlot(self, directory=directory, prefix=prefix, title=page_title)


def mount_gramlot(app: FastAPI, directory: str | Path | None = None, *,
                  prefix: str = DEFAULT_PREFIX, title: str = 'Gramlot') -> 'PageCollection':
    """Add Gramlot pages to an existing FastAPI app, using the same registration."""
    pages = PageCollection(directory, prefix=prefix, title=title)
    pages.mount(app)
    return pages


class PageCollection(PageRegistry):
    """Own a page registry and attach its HTTP endpoints to an existing FastAPI app.

    This object lives for the server's lifetime. Page and builder instances do not:
    each recipe request creates fresh ones, so requests never share mutable Source.
    """

    def __init__(self, directory=None, *, prefix=DEFAULT_PREFIX, title='Gramlot'):
        super().__init__(directory, prefix=prefix, title=title)
        self.runtime = RuntimeAssets(self.prefix)
        self.template = self.runtime.document_template()

    async def run_sync(self, function, *args):
        return await run_in_threadpool(function, *args)

    def mount(self, app: FastAPI) -> None:
        """Register assets and bound methods; FastAPI calls those methods on requests."""
        self.runtime.mount(app)
        router = APIRouter(prefix=self.prefix)
        router.add_api_route('/', self.index, methods=['GET'])
        router.add_api_route('/recipe', self.index_recipe, methods=['GET'])
        router.add_api_route('/{name}/recipe', self.recipe, methods=['GET'])
        router.add_api_route('/{name}/rpc/{method}', self.rpc, methods=['POST'])
        router.add_api_route('/{name}/rpc/{role}/{method}', self.service, methods=['POST'])
        router.add_api_route('/{name}/', self.document, methods=['GET'])
        app.include_router(router)

    def index(self) -> HTMLResponse:
        """GET /page/: the HTML shell points the browser to the index recipe."""
        return self.html_document(f'{self.prefix}/recipe')

    def document(self, name: str) -> HTMLResponse:
        """GET /page/hello/: send startup HTML, not the rendered heading."""
        page_class = self.require_page(name)
        return self.html_document(
            None,
            inspector=({"launcher": False}
                       if page_class.example_view else page_class.source_inspection),
            example_view=page_class.example_view,
            rpc_url=f'{self.prefix}/{name}/rpc',
            main_method='main',
        )

    def index_recipe(self) -> Response:
        """GET /page/recipe: generate navigation from the same page registry."""
        builder = GramlotBuilder('index')
        links = builder.root.nav(aria_label='Pages').ul()
        for name, page_class in self.page_classes.items():
            links.li().a(getattr(page_class, 'title', name), href=f'{self.prefix}/{name}/')
        return self.recipe_response(builder)

    async def recipe(self, name: str) -> Response:
        """GET /page/hello/recipe: run Python and return the resulting Source."""
        result = await self._invoke(name, 'source', 'main', {}, None)
        return Response(to_tytx(result, TYTX_FORMAT), media_type=TYTX_MEDIA_TYPE)

    async def rpc(self, name: str, method: str, request: Request) -> Response:
        """Compatibility Data route; dispatch remains role checked."""
        return await self.service(name, 'data', method, request)

    async def service(self, name: str, role: str, method: str, request: Request) -> Response:
        """Dispatch one allowlisted Data or Source method through TYTX."""
        self.require_page(name)
        if role not in ('data', 'source'):
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'role', 'message': 'Unknown service role'}},
                status_code=404,
            )
        registered = self.page_methods[name].get(method)
        if registered is None:
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'method', 'message': 'Service method not found'}},
                status_code=404,
            )
        if registered.role != role:
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'role', 'message': 'Service role mismatch'}},
                status_code=409,
            )
        if not request.headers.get('content-type', '').startswith(TYTX_MEDIA_TYPE):
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'request', 'message': 'Expected TYTX JSON'}},
                status_code=415,
            )
        try:
            raw = (await request.body()).decode('utf-8')
            params = from_tytx(raw, transport=TYTX_FORMAT)
        except Exception:
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'request', 'message': 'Invalid TYTX parameters'}},
                status_code=400,
            )
        if not isinstance(params, dict):
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'request', 'message': 'RPC parameters must be a mapping'}},
                status_code=400,
            )
        try:
            result = await self._invoke(name, role, method, params, request)
        except ServiceParameterError as error:
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'parameters', 'message': str(error)}},
                status_code=422,
            )
        except Exception as error:
            return self.rpc_response(
                {'ok': False, 'error': {'kind': 'application', 'message': str(error)}},
                status_code=500,
            )
        return self.rpc_response({'ok': True, 'result': result})


    def require_page(self, name: str):
        """URL names select registered classes, never arbitrary file paths."""
        if name not in self.page_classes:
            raise HTTPException(status_code=404)
        return self.page_classes[name]

    def html_document(self, recipe_url: str | None, *, inspector: bool = True,
                      rpc_url: str | None = None, main_method: str | None = None,
                      example_view: bool = False) -> HTMLResponse:
        return HTMLResponse(render_document(self.template, self.runtime, self.title, {
            'recipe': recipe_url, 'inspector': inspector, 'rpc': rpc_url,
            'main': main_method, 'exampleView': example_view,
        }))

    script_json = staticmethod(script_json)

    @staticmethod
    def recipe_response(builder: GramlotBuilder) -> Response:
        return Response(
            to_tytx(builder.source, TYTX_FORMAT),
            media_type=TYTX_MEDIA_TYPE,
        )

    @staticmethod
    def rpc_response(value, *, status_code: int = 200) -> Response:
        return Response(
            to_tytx(value, TYTX_FORMAT),
            status_code=status_code,
            media_type=TYTX_MEDIA_TYPE,
        )
