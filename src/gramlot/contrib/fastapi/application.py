"""FastAPI adapter: read this class from startup to request handling."""

import importlib.util
import sys
import uuid
import json
import re
from html import escape
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from gramlot.page import WebPage
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx

from .runtime import RuntimeAssets

# Adapter conventions, shared by every application (not application settings).
PAGES_DIRECTORY = 'pages'
DEFAULT_PREFIX = '/page'
RESERVED_PAGE_NAMES = {'recipe', '_runtime'}
TYTX_FORMAT = 'json'
TYTX_MEDIA_TYPE = 'application/vnd.tytx+json'


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
        self.page_classes = self.load_pages()
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
                spec.loader.exec_module(module)
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
        return pages

    def mount(self, app: FastAPI) -> None:
        """Register assets and bound methods; FastAPI calls those methods on requests."""
        self.runtime.mount(app)
        router = APIRouter(prefix=self.prefix)
        router.add_api_route('/', self.index, methods=['GET'])
        router.add_api_route('/recipe', self.index_recipe, methods=['GET'])
        router.add_api_route('/{name}/recipe', self.recipe, methods=['GET'])
        router.add_api_route('/{name}/', self.document, methods=['GET'])
        app.include_router(router)

    def index(self) -> HTMLResponse:
        """GET /page/: the HTML shell points the browser to the index recipe."""
        return self.html_document(f'{self.prefix}/recipe')

    def document(self, name: str) -> HTMLResponse:
        """GET /page/hello/: send startup HTML, not the rendered heading."""
        page_class = self.require_page(name)
        return self.html_document(f'{self.prefix}/{name}/recipe', inspector=page_class.source_inspection)

    def index_recipe(self) -> Response:
        """GET /page/recipe: generate navigation from the same page registry."""
        builder = GramlotBuilder('index')
        links = builder.root.nav(aria_label='Pages').ul()
        for name, page_class in self.page_classes.items():
            links.li().a(getattr(page_class, 'title', name), href=f'{self.prefix}/{name}/')
        return self.recipe_response(builder)

    def recipe(self, name: str) -> Response:
        """GET /page/hello/recipe: run Python and return the resulting Source."""
        page_class = self.require_page(name)
        page = page_class()
        builder = page.source_builder('main')
        page.main(builder.root)
        return self.recipe_response(builder)

    def require_page(self, name: str):
        """URL names select registered classes, never arbitrary file paths."""
        if name not in self.page_classes:
            raise HTTPException(status_code=404)
        return self.page_classes[name]

    def html_document(self, recipe_url: str, *, inspector: bool = True) -> HTMLResponse:
        # Escape inserted data before substitution. Values cannot introduce new
        # template substitutions, even when a title contains a placeholder name.
        replacements = {
            '__TITLE__': escape(self.title),
            '__IMPORTS__': self.script_json({'imports': self.runtime.import_map()}),
            '__STARTUP__': self.script_json({'recipe': recipe_url, 'inspector': inspector}),
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
