"""Explicit scalar model editing, backed by Django ModelForms."""
from gramlot.contrib.django.tables import DjangoTablesPage


class Page(DjangoTablesPage):
    table_fields = {'breads.country': ['title', 'sort_order'],
                    'breads.breadtype': ['title']}
