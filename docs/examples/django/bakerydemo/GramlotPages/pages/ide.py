"""Configured source workspaces for the local Bakery administration IDE."""
from pathlib import Path
from gramlot.contrib.django.ide import DjangoIdePage

BASE = Path(__file__).resolve().parents[2]


class Page(DjangoIdePage):
    filesystem_roots = {
        'templates': BASE / 'bakerydemo/templates',
        'gramlot_pages': BASE / 'GramlotPages/pages',
    }
    filesystem_labels = {'templates': 'Django templates', 'gramlot_pages': 'GramlotPages'}
    filesystem_writable_roots = tuple(filesystem_roots)
