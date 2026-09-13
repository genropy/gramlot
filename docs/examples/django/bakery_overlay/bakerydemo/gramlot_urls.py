from pathlib import Path
from django.urls import include, path
from django.contrib import admin
from django.views.decorators.clickjacking import xframe_options_sameorigin
from gramlot.contrib.django import DjangoPageCollection
from .urls import urlpatterns as bakery_urls

pages = DjangoPageCollection(Path(__file__).resolve().parent.parent / 'GramlotPages',
                             prefix='/gramlot', title='Bakerydemo with Gramlot')
products = DjangoPageCollection(Path(__file__).resolve().parent.parent / 'GramlotPages',
                                prefix='/products', title='Explore our breads',
                                template_name='breads/product_explorer.html')
schema = DjangoPageCollection(Path(__file__).resolve().parent.parent / 'GramlotPages',
                              prefix='/spa_admin', title='SPA admin')
# Shared source directory; expose only each collection's intended pages.
pages.page_classes = {name: pages.page_classes[name] for name in ('breads',)}
products.page_classes = {name: products.page_classes[name] for name in ('explore',)}
schema.page_classes = {name: schema.page_classes[name] for name in ('dashboard', 'models', 'tables', 'ide')}
schema_urls = schema.urls
for pattern in schema_urls:
    pattern.callback = admin.site.admin_view(xframe_options_sameorigin(pattern.callback))
product_urls = products.urls
page_urls = pages.urls
for pattern in [*product_urls, *page_urls]:
    pattern.callback = xframe_options_sameorigin(pattern.callback)
urlpatterns = [path('spa_admin/', admin.site.admin_view(
                   lambda request: schema.document(request, 'dashboard'))),
               path('spa_admin/', include(schema_urls)),
               path('products/', include(product_urls)),
               path('gramlot/', include(page_urls)), *bakery_urls]
