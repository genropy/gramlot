"""Native Django views serving the shared Gramlot Source and Data RPC contract."""
import logging
from functools import wraps

from asgiref.sync import async_to_sync, sync_to_async
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import connections, transaction
from django.http import Http404, HttpResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.urls import path
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods
from genro_tytx import from_tytx

from gramlot.builder import GramlotBuilder
from gramlot.contrib._shared.pages import (
    DEFAULT_PREFIX, TYTX_FORMAT, TYTX_MEDIA_TYPE, PageRegistry, ServiceParameterError,
)
from gramlot.transport import to_tytx
from gramlot.contrib._shared.runtime import render_document, script_json
from .page import DjangoPage
from .runtime import RuntimeAssets

logger = logging.getLogger(__name__)


class AuthenticationRequired(PermissionDenied):
    """An authenticated Django request is required for this page."""


class DjangoPageCollection(PageRegistry):
    """Include ``collection.urls`` at the path matching ``prefix`` in a URLconf.

    Views are synchronous. The async bridge keeps synchronous services, ORM work
    and result materialization on the request thread, including under ASGI.
    """

    def __init__(self, directory=None, *, prefix=DEFAULT_PREFIX, title='Gramlot',
                 login_required=False, permission_required=(), template_name=None):
        super().__init__(directory, prefix=prefix, title=title)
        self.login_required = login_required
        self.permission_required = permission_required
        self.template_name = template_name
        self.runtime = RuntimeAssets(prefix)
        self.template = self.runtime.document_template()

    @property
    def urls(self):
        return [
            path('', self._view(self.index, ['GET', 'HEAD']), name='index'),
            path('recipe', self._view(self.index_recipe, ['GET', 'HEAD']), name='index-recipe'),
            path('<slug:name>/recipe', self._view(self.recipe, ['GET', 'HEAD']), name='recipe'),
            path('<slug:name>/rpc/<str:role>/<str:method>',
                 self._view(self.service, ['POST']), name='service'),
            path('<slug:name>/rpc/<str:method>',
                 self._view(self.rpc, ['POST']), name='rpc'),
            path('<slug:name>/', self._view(self.document, ['GET', 'HEAD']), name='page'),
            *self.runtime.urls,
        ]

    def _view(self, function, methods):
        @wraps(function)
        def view(request, *args, **kwargs):
            try:
                self.check_access(request, kwargs.get('name'))
                return function(request, *args, **kwargs)
            except AuthenticationRequired:
                return self.error('authentication', 'Authentication required', 401)
            except PermissionDenied:
                return self.error('permission', 'Permission denied', 403)
        return never_cache(csrf_protect(require_http_methods(methods)(view)))

    def check_access(self, request, name=None):
        """Apply collection AND page requirements to HTML, recipes and all RPCs."""
        page_class = self.require_page(name) if name is not None else None
        user = getattr(request, 'user', None)
        for owner in (self, page_class):
            if owner is None:
                continue
            permissions = getattr(owner, 'permission_required', ())
            if isinstance(permissions, str):
                permissions = (permissions,)
            if getattr(owner, 'login_required', False) or permissions:
                if user is None or not user.is_authenticated:
                    raise AuthenticationRequired
            if permissions and not user.has_perms(permissions):
                raise PermissionDenied

    def require_page(self, name):
        try:
            return super().require_page(name)
        except KeyError:
            raise Http404('Unknown Gramlot page') from None

    async def run_sync(self, function, *args):
        return await sync_to_async(function, thread_sensitive=True)(*args)

    def prepare_page(self, page, context):
        if isinstance(page, DjangoPage):
            page._django_request = context.request

    def index(self, request):
        return self.html_document(request, recipe_url=f'{self.prefix}/recipe')

    def document(self, request, name):
        page_class = self.require_page(name)
        return self.html_document(
            request, rpc_url=f'{self.prefix}/{name}/rpc', main_method='main',
            inspector={'launcher': False} if page_class.example_view else page_class.source_inspection,
            example_view=page_class.example_view,
        )

    def index_recipe(self, request):
        builder = GramlotBuilder('index')
        links = builder.root.nav(aria_label='Pages').ul()
        for name, page_class in self.page_classes.items():
            try:
                self.check_access(request, name)
            except PermissionDenied:
                continue
            links.li().a(getattr(page_class, 'title', name), href=f'{self.prefix}/{name}/')
        return self.tytx_response(builder.source)

    def recipe(self, request, name):
        result = async_to_sync(self._invoke)(name, 'source', 'main', {}, request)
        return self.tytx_response(result)

    def rpc(self, request, name, method):
        return self.service(request, name, 'data', method)

    def service(self, request, name, role, method):
        if role not in ('data', 'source'):
            return self.error('role', 'Unknown service role', 404)
        registered = self.page_methods[name].get(method)
        if registered is None:
            return self.error('method', 'Service method not found', 404)
        if registered.role != role:
            return self.error('role', 'Service role mismatch', 409)
        if request.content_type != TYTX_MEDIA_TYPE:
            return self.error('request', 'Expected TYTX JSON', 415)
        try:
            params = from_tytx(request.body.decode('utf-8'), transport=TYTX_FORMAT)
        except Exception:
            return self.error('request', 'Invalid TYTX parameters', 400)
        if not isinstance(params, dict):
            return self.error('request', 'RPC parameters must be a mapping', 400)
        try:
            result = async_to_sync(self._invoke)(name, role, method, params, request)
            return self.tytx_response({'ok': True, 'result': result})
        except ServiceParameterError as error:
            return self.error('parameters', str(error), 422)
        except (PermissionDenied, Http404):
            raise
        except Exception as error:
            logger.exception('Gramlot service failed: %s.%s', name, method)
            message = str(error) if settings.DEBUG else 'Service execution failed'
            return self.error('application', message, 500)

    @staticmethod
    def tytx_response(value, status=200):
        return HttpResponse(to_tytx(value, TYTX_FORMAT), status=status, content_type=TYTX_MEDIA_TYPE)

    @classmethod
    def error(cls, kind, message, status):
        # Django's ATOMIC_REQUESTS wrapper sees a returned response, not the
        # exception encoded in it. Preserve its rollback semantics for RPC errors.
        for connection in connections.all():
            if connection.settings_dict.get('ATOMIC_REQUESTS') and connection.in_atomic_block:
                transaction.set_rollback(True, using=connection.alias)
        return cls.tytx_response({'ok': False, 'error': {'kind': kind, 'message': message}}, status)

    def html_document(self, request, *, recipe_url=None, rpc_url=None,
                      main_method=None, inspector=True, example_view=False):
        # A masked token also works with session-backed or HttpOnly CSRF cookies.
        header = settings.CSRF_HEADER_NAME
        if not header.startswith('HTTP_'):
            raise ValueError('CSRF_HEADER_NAME must use the Django HTTP_ header convention')
        rpc = None if rpc_url is None else {
            'url': rpc_url,
            'headers': {header[5:].replace('_', '-'): get_token(request)},
        }
        startup = {
            'recipe': recipe_url, 'inspector': inspector, 'rpc': rpc,
            'main': main_method, 'exampleView': example_view,
        }
        if self.template_name:
            return render(request, self.template_name, {
                'gramlot_title': self.title,
                'gramlot_imports': script_json({'imports': self.runtime.import_map()}),
                'gramlot_startup': script_json(startup),
                'gramlot_entry': self.runtime.entry_url,
            })
        return HttpResponse(render_document(self.template, self.runtime, self.title, startup))
