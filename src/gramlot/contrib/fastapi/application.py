"""FastAPI adapter: read this class from startup to request handling."""

import importlib.util
import sys
import uuid
import json
import re
import inspect
from decimal import Decimal
from html import escape
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import HTMLResponse, Response
from genro_bag import Bag
from genro_tytx import from_tytx
from gramlot.page import InvocationContext, WebPage, page_methods
from gramlot.store import ExclusiveBagStore
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx

from .runtime import RuntimeAssets

# Adapter conventions, shared by every application (not application settings).
PAGES_DIRECTORY = 'pages'
DEFAULT_PREFIX = '/page'
RESERVED_PAGE_NAMES = {'recipe', '_runtime'}
TYTX_FORMAT = 'json'
TYTX_MEDIA_TYPE = 'application/vnd.tytx+json'
RPC_VALUE_TYPES = {str, int, float, bool, Decimal, Bag, dict, list, type(None)}


class ServiceParameterError(ValueError):
    """A request could not be bound to a registered service signature."""


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


class PageCollection:
    """Own a page registry and attach its HTTP endpoints to an existing FastAPI app.

    This object lives for the server's lifetime. Page and builder instances do not:
    each recipe request creates fresh ones, so requests never share mutable Source.
    """

    def __init__(self, directory: str | Path | None = None, *,
                 prefix: str = DEFAULT_PREFIX, title: str = 'Gramlot'):
        self.directory = Path(directory if directory is not None else Path.cwd()).expanduser().resolve()
        self.title = title
        self.prefix = prefix
        if not re.fullmatch(r'/[a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)*', prefix):
            raise ValueError('Use an absolute prefix such as /page, without a trailing slash')
        self.page_sources = {}
        self.page_classes = self.load_pages()
        self.page_methods = {
            name: self._registered_methods(page_class)
            for name, page_class in self.page_classes.items()
        }
        self.store = ExclusiveBagStore()
        self.runtime = RuntimeAssets(self.prefix)
        self.template = self.runtime.document_template()

    def load_pages(self) -> dict:
        """Discover flat pages/ files at startup. Ignore underscore files and folders.

        Each trusted file defines Page(WebPage). Package-relative imports are
        outside this initial contract. Mutable pages are created per request.
        """
        directory = self.directory / PAGES_DIRECTORY
        if not directory.is_dir():
            raise ValueError(f'Pages directory not found: {directory}')
        pages = {}
        for source in sorted(directory.glob('*.py')):
            name = source.stem
            if name.startswith('_') or not source.is_file():
                continue
            if not re.fullmatch(r'[a-z][a-z0-9_-]*', name) or name in RESERVED_PAGE_NAMES:
                raise ValueError(f'Invalid or reserved page filename: {source.name}')
            if not source.resolve().is_relative_to(directory.resolve()):
                raise ValueError(f'Page file must remain inside {directory}: {source.name}')
            module_name = f'_gramlot_page_{uuid.uuid4().hex}'
            spec = importlib.util.spec_from_file_location(module_name, source)
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            try:
                source_text = source.read_text(encoding="utf-8")
                exec(compile(source_text, str(source), "exec"), module.__dict__)
                page_class = getattr(module, 'Page', None)
                if (not isinstance(page_class, type)
                        or not issubclass(page_class, WebPage)
                        or page_class.__module__ != module_name
                        or page_class.main is WebPage.main):
                    raise ValueError('Define a local class Page(WebPage) with main(self, root)')
                if not isinstance(getattr(page_class, 'title', name), str):
                    raise ValueError('Page.title must be a string')
            except Exception as error:
                sys.modules.pop(module_name, None)
                raise ValueError(f'Cannot load page {source}: {error}') from error
            pages[name] = page_class
            self.page_sources[name] = source_text
        return pages

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

    async def _invoke(self, name: str, role: str, method: str,
                      params: dict, request: Request | None):
        page_class = self.require_page(name)
        registered = self.page_methods[name].get(method)
        if registered is None or registered.role != role:
            raise LookupError(f'{role} service {method!r} is not registered')
        page = page_class()
        bound_method = registered.function.__get__(page, page_class)
        signature = self._resolved_signature(bound_method)
        supplied = dict(params)
        context = InvocationContext(
            page_name=name, method_name=method, role=role,
            store=self.store, request=request,
        )
        for parameter in signature.parameters.values():
            if parameter.annotation is InvocationContext:
                if parameter.name in supplied:
                    raise ServiceParameterError(f'{parameter.name} is framework controlled')
                supplied[parameter.name] = context
        builder = None
        positional = []
        if role == 'source':
            builder = page.source_builder('main')
            destination = builder.root
            if method == 'main' and page_class.example_view:
                from .examples import example_panel
                destination = example_panel(builder.root, self.page_sources[name], name.replace('_', ' ').replace('-', ' ').title())
            positional.append(destination)
        try:
            arguments = signature.bind(*positional, **supplied)
            arguments.apply_defaults()
            self._validate_rpc_values(signature, arguments.arguments)
        except (TypeError, ValueError) as error:
            raise ServiceParameterError(str(error)) from error
        if inspect.iscoroutinefunction(bound_method):
            result = await bound_method(*arguments.args, **arguments.kwargs)
        else:
            result = await run_in_threadpool(bound_method, *arguments.args, **arguments.kwargs)
            if inspect.isawaitable(result):
                result = await result
        if role == 'source':
            if result is not None:
                raise TypeError(f'Source method {method} must build into root and return None')
            return builder.source
        self._validate_rpc_value('return', result, signature.return_annotation)
        return result

    def require_page(self, name: str):
        """URL names select registered classes, never arbitrary file paths."""
        if name not in self.page_classes:
            raise HTTPException(status_code=404)
        return self.page_classes[name]

    def html_document(self, recipe_url: str | None, *, inspector: bool = True,
                      rpc_url: str | None = None, main_method: str | None = None,
                      example_view: bool = False) -> HTMLResponse:
        # Escape inserted data before substitution. Values cannot introduce new
        # template substitutions, even when a title contains a placeholder name.
        replacements = {
            '__TITLE__': escape(self.title),
            '__IMPORTS__': self.script_json({'imports': self.runtime.import_map()}),
            '__STARTUP__': self.script_json({
                'recipe': recipe_url, 'inspector': inspector, 'rpc': rpc_url,
                'main': main_method, 'exampleView': example_view,
            }),
            '__ENTRY__': escape(self.runtime.entry_url, quote=True),
        }
        html = re.sub(r'__(?:TITLE|IMPORTS|STARTUP|ENTRY)__',
                      lambda match: replacements[match.group()], self.template)
        return HTMLResponse(html)

    @staticmethod
    def script_json(value) -> str:
        """JSON inside an HTML script element must not contain a closing tag."""
        return json.dumps(value).replace('<', r'\u003c')

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

    @staticmethod
    def _registered_methods(page_class: type[WebPage]):
        methods = page_methods(page_class)
        for name, registered in methods.items():
            function = registered.function
            role = registered.role
            if role == 'source' and name == 'main' and function is WebPage.main:
                continue
            if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', name):
                raise ValueError(f'Invalid service method name: {name}')
            signature = PageCollection._resolved_signature(function)
            parameters = list(signature.parameters.values())
            if not parameters or parameters[0].name != 'self':
                raise ValueError(f'Service method {name} must be an instance method')
            external = parameters[1:]
            if role == 'source':
                if not external or external[0].name != 'root':
                    raise ValueError(f'Source method {name} must begin with root')
                external = external[1:]
                if signature.return_annotation not in (inspect.Signature.empty, None, type(None)):
                    raise ValueError(f'Source method {name} must return None')
            for parameter in external:
                if parameter.kind not in (
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    inspect.Parameter.KEYWORD_ONLY,
                ):
                    raise ValueError(f'Service method {name} requires named parameters')
                if parameter.annotation is InvocationContext:
                    continue
                PageCollection._validate_rpc_annotation(
                    f'{name}.{parameter.name}', parameter.annotation,
                )
            if role == 'data':
                PageCollection._validate_rpc_annotation(
                    f'{name}.return', signature.return_annotation,
                )
        return methods

    @staticmethod
    def _validate_rpc_annotation(name: str, annotation) -> None:
        if annotation is None:
            annotation = type(None)
        if annotation in (inspect.Signature.empty, Any):
            return
        if annotation not in RPC_VALUE_TYPES:
            raise ValueError(
                f'RPC annotation {name} must be a supported TYTX scalar, Bag, dict or list',
            )

    @staticmethod
    def _validate_rpc_value(name: str, value, annotation) -> None:
        if annotation is InvocationContext:
            if not isinstance(value, InvocationContext):
                raise TypeError(f'{name} must be InvocationContext')
            return
        if annotation is None:
            annotation = type(None)
        if annotation in (inspect.Signature.empty, Any):
            return
        if annotation is int:
            valid = type(value) is int
        elif annotation is float:
            valid = type(value) in (int, float)
        else:
            valid = isinstance(value, annotation)
        if not valid:
            raise TypeError(
                f'{name} must be {annotation.__name__}, got {type(value).__name__}',
            )

    @staticmethod
    def _validate_rpc_values(signature, values) -> None:
        for name, value in values.items():
            if name == 'root':
                continue
            PageCollection._validate_rpc_value(name, value, signature.parameters[name].annotation)

    @staticmethod
    def _resolved_signature(function):
        annotations = inspect.get_annotations(function, eval_str=True)
        signature = inspect.signature(function)
        parameters = [
            parameter.replace(annotation=annotations.get(parameter.name, parameter.annotation))
            for parameter in signature.parameters.values()
        ]
        return signature.replace(
            parameters=parameters,
            return_annotation=annotations.get('return', signature.return_annotation),
        )
