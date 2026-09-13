from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from gramlot.contrib.django import DjangoPageCollection

pages = DjangoPageCollection(settings.BASE_DIR, prefix='/ui', title='Gramlot with Django')
urlpatterns = [path('admin/', admin.site.urls),
               path('ui/', include((pages.urls, 'gramlot'), namespace='gramlot'))]
