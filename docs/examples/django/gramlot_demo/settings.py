"""Local example settings; an existing project keeps its own Django settings."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'gramlot-local-example-only')
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes',
                  'django.contrib.sessions', 'django.contrib.admin',
                  'django.contrib.messages', 'django.contrib.staticfiles', 'gramlot_demo']
MIDDLEWARE = ['django.contrib.sessions.middleware.SessionMiddleware',
              'django.middleware.csrf.CsrfViewMiddleware',
              'django.contrib.auth.middleware.AuthenticationMiddleware',
              'django.contrib.messages.middleware.MessageMiddleware']
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates',
              'APP_DIRS': True, 'OPTIONS': {'context_processors': [
                  'django.template.context_processors.request',
                  'django.contrib.auth.context_processors.auth',
                  'django.contrib.messages.context_processors.messages',
              ]}}]
STATIC_URL = '/static/'
ROOT_URLCONF = 'gramlot_demo.urls'
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3',
                         'NAME': os.environ.get('GRAMLOT_DJANGO_DB', str(BASE_DIR / 'example.sqlite3'))}}
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'
USE_TZ = True
