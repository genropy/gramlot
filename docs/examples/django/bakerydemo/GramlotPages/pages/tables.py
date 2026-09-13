"""Explicit scalar model editing, backed by Django ModelForms."""
from gramlot.contrib.django.tables import DjangoTablesPage


class Page(DjangoTablesPage):
    table_fields = {'breads.country': ['title', 'sort_order'],
                    'breads.breadtype': ['title'],
                    'locations.locationpage': ['title', 'slug', 'introduction', 'address',
                                               'lat_long', 'seo_title', 'search_description', 'image']}
    table_related_fields = {
        'locations.locationoperatinghours': ['day', 'opening_time', 'closing_time', 'closed'],
        'breads.breadpage': ['title', 'slug', 'introduction'],
    }
    # Wagtail tree insertion remains the responsibility of its native admin.
    table_allow_create = {'locations.locationpage': False}
