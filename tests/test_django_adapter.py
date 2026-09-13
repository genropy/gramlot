"""Real Django middleware, ORM and RPC integration; no FastAPI required by the host."""
import json
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

django = pytest.importorskip('django')
from django.conf import settings

EXAMPLE = Path(__file__).resolve().parents[1] / 'docs/examples/django'
sys.path.insert(0, str(EXAMPLE))
if not settings.configured:
    settings.configure(
        SECRET_KEY='test-only', DEBUG=False, ALLOWED_HOSTS=['testserver'],
        ROOT_URLCONF=__name__,
        INSTALLED_APPS=['django.contrib.auth', 'django.contrib.contenttypes',
                        'django.contrib.sessions', 'gramlot_demo'],
        MIDDLEWARE=['django.contrib.sessions.middleware.SessionMiddleware',
                    'django.middleware.csrf.CsrfViewMiddleware',
                    'django.contrib.auth.middleware.AuthenticationMiddleware'],
        DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
        SESSION_ENGINE='django.contrib.sessions.backends.signed_cookies',
        DEFAULT_AUTO_FIELD='django.db.models.AutoField', USE_TZ=True,
    )
django.setup()
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.db import connection
from django.test import Client, AsyncClient, override_settings
from django.urls import clear_url_caches, include, path
from genro_tytx import from_tytx
from gramlot.contrib.django import DjangoPageCollection, selection_result
from gramlot.transport import to_tytx
from gramlot_demo.models import Customer

urlpatterns = []
MEDIA = 'application/vnd.tytx+json'


@pytest.fixture
def host(tmp_path):
    # Use a file DB so the ASGI request thread sees the same database.
    previous = connection.settings_dict['NAME']
    connection.close()
    connection.settings_dict['NAME'] = str(tmp_path / 'test.sqlite3')
    call_command('migrate', verbosity=0)
    Customer.objects.create(name='Ada', city='Rome')
    pages = tmp_path / 'pages'
    pages.mkdir()
    (pages / 'customers.py').write_text((EXAMPLE / 'pages/customers.py').read_text())
    (pages / 'private.py').write_text('''from gramlot.contrib.django import DjangoPage
from gramlot.page import endpoint, source, InvocationContext
from django.core.exceptions import PermissionDenied
from django.db import transaction
from gramlot_demo.models import Customer
class Page(DjangoPage):
    login_required = True
    permission_required = 'gramlot_demo.change_customer'
    def main(self, root):
        root.h1(self.request.user.username)
    @endpoint
    def who(self, context: InvocationContext):
        return {'username': context.request.user.username, 'same': context.request is self.request}
    @endpoint
    async def async_value(self, number: int):
        return number * 2
    @source
    def fragment(self, root, text: str):
        root.p(text)
    @endpoint
    def rollback(self):
        with transaction.atomic():
            Customer.objects.update(city='Should roll back')
            raise PermissionDenied
    @endpoint
    def fail(self):
        raise ValueError('private database detail')
    def hidden(self):
        return 'never exposed'
''')
    registry = DjangoPageCollection(tmp_path, prefix='/nested/ui')
    global urlpatterns
    urlpatterns = [path('nested/ui/', include(registry.urls))]
    clear_url_caches()
    yield registry
    connection.close()
    connection.settings_dict['NAME'] = previous
    clear_url_caches()


def browser(client, page='customers'):
    response = client.get(f'/nested/ui/{page}/')
    assert response.status_code == 200
    startup = json.loads(re.search(r'<script[^>]*id="startup"[^>]*>(.*?)</script>',
                                  response.content.decode(), re.S).group(1))
    return startup['rpc']['headers']


def rpc(client, headers, method, params=None, *, page='customers', role='data'):
    return client.post(f'/nested/ui/{page}/rpc/{role}/{method}',
                       data=to_tytx({} if params is None else params, 'json'),
                       content_type=MEDIA, headers=headers)


def decode(response):
    return from_tytx(response.content.decode(), transport='json')


def authorize(client):
    user = get_user_model().objects.create_user(username='writer', password='test')
    user.user_permissions.add(Permission.objects.get(codename='change_customer'))
    client.force_login(user)
    return user


def test_source_rpc_orm_csrf_and_fresh_requests(host):
    client = Client(enforce_csrf_checks=True)
    headers = browser(client)
    assert rpc(client, {}, 'customers').status_code == 403
    source = rpc(client, headers, 'main', role='source')
    assert source.status_code == 200
    assert 'Django customers' in source.content.decode()
    assert decode(rpc(client, headers, 'customers'))['result']['rows'] == [
        {'id': 1, 'name': 'Ada', 'city': 'Rome'}]
    assert rpc(client, headers, 'save_city', {'customer_id': 1, 'city': 'Paris'}).status_code == 403
    authorize(client)
    headers = browser(client)
    assert rpc(client, headers, 'save_city', {'customer_id': 1, 'city': 'Paris'}).status_code == 200
    assert Customer.objects.get().city == 'Paris'
    assert 'Paris' in rpc(client, headers, 'customers').content.decode()
    assert client.get('/nested/ui/customers/recipe').status_code == 200
    assert client.get('/nested/ui/missing/').status_code == 404
    assert client.get('/nested/ui/customers/rpc/data/customers').status_code == 405


def test_access_on_all_routes_context_and_rollback(host):
    client = Client(enforce_csrf_checks=True)
    headers = browser(client)
    for suffix in ('', 'recipe'):
        assert client.get('/nested/ui/private/' + suffix).status_code == 401
    assert rpc(client, headers, 'who', page='private').status_code == 401
    assert 'private' not in client.get('/nested/ui/recipe').content.decode()
    user = authorize(client)
    headers = browser(client, 'private')
    assert decode(rpc(client, headers, 'who', page='private'))['result'] == {
        'username': user.username, 'same': True}
    assert rpc(client, headers, 'who', {'context': {}}, page='private').status_code == 422
    assert decode(rpc(client, headers, 'async_value', {'number': 3}, page='private'))['result'] == 6
    assert rpc(client, headers, 'rollback', page='private').status_code == 403
    assert Customer.objects.get().city == 'Rome'
    user.user_permissions.clear()
    assert client.get('/nested/ui/private/').status_code == 403


@pytest.mark.parametrize('method,role,params,status', [
    ('hidden', 'data', {}, 404), ('main', 'data', {}, 409),
    ('who', 'invalid', {}, 404), ('async_value', 'data', {'number': '3'}, 422),
    ('fragment', 'source', {'text': 'remote text'}, 200),
    ('fail', 'data', {}, 500),
])
def test_service_contract(host, method, role, params, status):
    client = Client(enforce_csrf_checks=True)
    authorize(client)
    response = rpc(client, browser(client, 'private'), method, params, page='private', role=role)
    assert response.status_code == status
    assert 'private database detail' not in response.content.decode()


@pytest.mark.parametrize('options', [
    {'CSRF_COOKIE_HTTPONLY': True}, {'CSRF_USE_SESSIONS': True},
    {'CSRF_COOKIE_NAME': 'custom_csrf', 'CSRF_HEADER_NAME': 'HTTP_X_CUSTOM_CSRF'},
])
def test_csrf_settings(host, options):
    with override_settings(**options):
        client = Client(enforce_csrf_checks=True)
        headers = browser(client)
        assert rpc(client, headers, 'customers').status_code == 200
        assert rpc(client, {key: 'bad' for key in headers}, 'customers').status_code == 403


def test_assets_and_request_errors(host):
    client = Client(enforce_csrf_checks=True)
    headers = browser(client)
    asset = client.get(host.runtime.entry_url)
    assert asset.status_code == 200
    assert 'javascript' in asset['Content-Type']
    asset.close()
    assert client.get(host.runtime.base_url + '../application.py').status_code == 404
    assert client.post('/nested/ui/customers/rpc/data/customers', data='broken',
                       content_type=MEDIA, headers=headers).status_code == 400
    assert rpc(client, headers, 'customers', []).status_code == 400
    assert client.post('/nested/ui/customers/rpc/data/customers', data='{}',
                       content_type='application/json', headers=headers).status_code == 415
    assert 'no-store' in client.get('/nested/ui/customers/')['Cache-Control']


def test_selection_projection_and_typed_values(host):
    assert selection_result(Customer.objects.all(), fields=['id', 'city'])['rows'] == [
        {'id': 1, 'city': 'Rome'}]
    assert selection_result(Customer.objects.values('id', 'city'))['identifier'] == 'id'
    with pytest.raises(TypeError, match='fields'):
        selection_result(Customer.objects.all())
    value = Decimal('12.34')
    assert selection_result([{'id': 1, 'price': value}])['rows'][0]['price'] is value
    with pytest.raises(ValueError, match='Duplicate'):
        selection_result([{'id': 1}, {'id': 1}])
    with pytest.raises(ValueError, match='identifier'):
        selection_result([{'name': 'missing'}])


@pytest.mark.asyncio
async def test_asgi_orm_path(host):
    client = AsyncClient(enforce_csrf_checks=True)
    response = await client.get('/nested/ui/customers/')
    startup = json.loads(re.search(r'<script[^>]*id="startup"[^>]*>(.*?)</script>',
                                  response.content.decode(), re.S).group(1))
    response = await client.post('/nested/ui/customers/rpc/data/customers',
                                 data=to_tytx({}, 'json'), content_type=MEDIA,
                                 headers=startup['rpc']['headers'])
    assert response.status_code == 200
    assert decode(response)['result']['rows'][0]['name'] == 'Ada'


def test_django_import_without_fastapi():
    code = '''import importlib.abc, sys
class Block(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, *args):
        if fullname.split('.')[0] in ('fastapi', 'starlette'):
            raise ImportError('server dependency leaked: ' + fullname)
sys.meta_path.insert(0, Block())
from gramlot.contrib.django import DjangoPageCollection, DjangoPage
'''
    subprocess.run([sys.executable, '-c', code], check=True, capture_output=True)


def test_atomic_requests_rolls_back_encoded_rpc_errors(host):
    # ATOMIC_REQUESTS surrounds the view, while the RPC protocol encodes errors.
    page_class = host.page_classes['customers']
    original = page_class.save_city
    def fail_after_write(self, customer_id: int, city: str):
        Customer.objects.filter(pk=customer_id).update(city=city)
        raise ValueError('failure after write')
    from gramlot.page import endpoint
    page_class.save_city = endpoint(fail_after_write)
    host.page_methods['customers'] = host._registered_methods(page_class)
    connection.settings_dict['ATOMIC_REQUESTS'] = True
    try:
        client = Client(enforce_csrf_checks=True)
        response = rpc(client, browser(client), 'save_city', {'customer_id': 1, 'city': 'Wrong'})
        assert response.status_code == 500
        assert Customer.objects.get().city == 'Rome'
    finally:
        connection.settings_dict['ATOMIC_REQUESTS'] = False
        page_class.save_city = original


def test_core_import_without_optional_hosts():
    code = '''import importlib.abc, sys
class Block(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, *args):
        if fullname.split('.')[0] in ('django', 'fastapi', 'starlette', 'gnr'):
            raise ImportError('optional dependency leaked: ' + fullname)
sys.meta_path.insert(0, Block())
from gramlot.page import WebPage
from gramlot.contrib._shared.pages import PageRegistry
from gramlot.contrib._shared.runtime import RuntimeAssets
'''
    subprocess.run([sys.executable, '-c', code], check=True, capture_output=True)


def test_asset_boundary_and_source_cache(tmp_path, monkeypatch):
    import gramlot
    from django.http import Http404
    from django.test import RequestFactory
    from gramlot.contrib.django.runtime import RuntimeAssets
    monkeypatch.setattr(gramlot, '__file__', str(tmp_path / 'package' / '__init__.py'))
    runtime = RuntimeAssets('/ui')
    assets = tmp_path / 'assets'
    assets.mkdir()
    (assets / 'entry.mjs').write_text('export const ready = true;')
    (tmp_path / 'private.txt').write_text('not an asset')
    (assets / 'escape.txt').symlink_to(tmp_path / 'private.txt')
    view = runtime.asset_view(assets)
    request = RequestFactory().get('/ui/_runtime/common/entry.mjs')
    response = view(request, 'entry.mjs')
    assert response['Cache-Control'] == 'no-cache'
    assert response['Content-Type'] == 'text/javascript'
    response.close()
    for name in ('../private.txt', 'escape.txt', '/etc/passwd', 'missing.js'):
        with pytest.raises(Http404):
            view(request, name)


def test_custom_host_template_preserves_startup_and_csrf(host):
    host.template_name = 'host.html'
    templates = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'OPTIONS': {
        'loaders': [('django.template.loaders.locmem.Loader', {'host.html':
            '<header>Bakery host</header><div id="root"></div><p id="error" hidden></p>'
            '<script type="importmap">{{ gramlot_imports|safe }}</script>'
            '<script id="startup" type="application/json">{{ gramlot_startup|safe }}</script>'
            '<script type="module" src="{{ gramlot_entry }}"></script>'})],
    }}]
    with override_settings(TEMPLATES=templates):
        client = Client(enforce_csrf_checks=True)
        headers = browser(client)
        assert b'Bakery host' in client.get('/nested/ui/customers/').content
        assert rpc(client, headers, 'customers').status_code == 200


def test_schema_tree_is_lazy_and_follows_django_relations_without_queries(host):
    from gramlot.contrib.django.schema import model_tree
    from gramlot.resolvers import RpcResolver
    from django.test.utils import CaptureQueriesContext
    with CaptureQueriesContext(connection) as queries:
        root = model_tree(('*',))
        assert isinstance(root.get_node('auth').resolver, RpcResolver)
        models = model_tree(('*',), app_label='auth')
        assert isinstance(models.get_node('user').resolver, RpcResolver)
        fields = model_tree(('*',), model='auth.user')
        assert fields.get_node('username').attr['dtype'] == 'A'
        assert fields.get_node('is_active').attr['dtype'] == 'B'
        groups = fields.get_node('groups')
        assert groups.attr['cardinality'] == 'many-to-many'
        assert isinstance(groups.resolver, RpcResolver)
        target = model_tree(('*',), model='auth.user', path=['groups'])
        assert target.get_node('name').attr['fieldpath'] == 'groups__name'
        assert target.get_node('user').attr['reverse'] is True
    assert len(queries) == 0


def test_schema_tree_enforces_roots_paths_and_staff(host):
    from django.core.exceptions import PermissionDenied
    from gramlot.contrib.django.schema import model_tree
    assert len(model_tree(())) == 0
    with pytest.raises(PermissionDenied):
        model_tree(('gramlot_demo.customer',), model='auth.user')
    fields = model_tree(('auth.user',), model='auth.user')
    assert fields.get_node('groups').resolver is None
    with pytest.raises(PermissionDenied):
        model_tree(('auth.user',), model='auth.user', path=['groups'])
    for path_value in (['username'], ['missing'], 'groups', ['groups'] * 25):
        with pytest.raises(ValueError):
            model_tree(('*',), model='auth.user', path=path_value)
    client = Client(enforce_csrf_checks=True)
    headers = browser(client)
    assert rpc(client, headers, 'model_tree').status_code == 403
    user = authorize(client)
    assert rpc(client, browser(client), 'model_tree').status_code == 403
    user.is_staff = True
    user.save(update_fields=['is_staff'])
    host.page_classes['customers'].model_roots = ('*',)
    response = rpc(client, browser(client), 'model_tree')
    assert response.status_code == 200
    result = decode(response)['result']
    assert result.get_node('auth').resolver is not None


def test_generated_tables_validate_and_enforce_permissions(host):
    from types import SimpleNamespace
    from django.core.exceptions import PermissionDenied
    from gramlot.contrib.django.tables import DjangoTablesPage
    page = DjangoTablesPage()
    page.table_fields = {'gramlot_demo.customer': ['name', 'city']}
    user = get_user_model().objects.create_superuser('table-admin', password='test')
    page._django_request = SimpleNamespace(user=user)
    invalid = page.save_record('gramlot_demo.customer', {'name': '', 'city': 'Rome'})
    assert invalid['ok'] is False
    assert invalid['errors'].get_item('name')
    assert Customer.objects.count() == 1
    created = page.save_record('gramlot_demo.customer', {'name': 'New', 'city': 'Milan'})
    assert created['ok']
    page.save_record('gramlot_demo.customer', {'name': 'Changed', 'city': 'Turin'}, key=created['key'])
    assert Customer.objects.get(pk=created['key']).name == 'Changed'
    assert len(page.table_rows('gramlot_demo.customer', 'Changed')['rows']) == 1
    with pytest.raises(PermissionDenied):
        page.table_rows('auth.user')
    user.is_superuser = False
    user.save()
    page._django_request.user = get_user_model().objects.get(pk=user.pk)
    with pytest.raises(PermissionDenied):
        page.save_record('gramlot_demo.customer', {'name': 'Denied', 'city': 'Rome'})
