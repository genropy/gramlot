"""Django request access and explicit ORM selection projection for Gramlot pages."""
import math
from collections.abc import Mapping
from django.db.models import QuerySet
from gramlot.page import WebPage, endpoint


def selection_result(rows, *, identifier='id', fields=None, metadata=None):
    """Materialize named rows; model QuerySets require an explicit field allowlist.

    Filtering, authorization, ordering and pagination belong to the caller.
    Decimal/date values stay typed until the ordinary Gramlot TYTX encoding.
    """
    if not isinstance(identifier, str) or not identifier:
        raise TypeError('Selection identifier must be a nonempty string')
    if fields is not None:
        if (not isinstance(fields, (list, tuple)) or not fields
                or any(not isinstance(field, str) or not field for field in fields)):
            raise TypeError('fields must be a nonempty list or tuple of field names')
        if identifier not in fields:
            raise ValueError('fields must include the selection identifier')
    if isinstance(rows, QuerySet) and fields is not None:
        rows = rows.values(*fields)
    records, seen = [], set()
    for row in rows:
        if not isinstance(row, Mapping):
            raise TypeError('Use a QuerySet with fields=... or values(...), or named row mappings')
        record = dict(row) if fields is None else {field: row[field] for field in fields}
        key = record.get(identifier)
        if (type(key) not in (str, int, float) or key == ''
                or isinstance(key, float) and not math.isfinite(key)):
            raise ValueError(f'Missing or invalid selection identifier: {identifier}')
        if key in seen:
            raise ValueError(f'Duplicate selection identifier: {key}')
        seen.add(key)
        records.append(record)
    return dict(rows=records, identifier=identifier,
                metadata={'totalrows': len(records), **(metadata or {})})


class DjangoPage(WebPage):
    """Fresh page with a host-supplied request and optional page access requirements."""
    login_required = False
    permission_required = ()
    model_roots = ()
    selection_result = staticmethod(selection_result)

    @property
    def request(self):
        return self._django_request

    @endpoint
    def model_tree(self, app_label=None, model=None, path=None):
        """Opt-in staff-only schema browsing; no records are read or written."""
        from django.core.exceptions import PermissionDenied
        from .schema import model_tree
        user = getattr(self.request, 'user', None)
        if user is None or not user.is_active or not user.is_staff:
            raise PermissionDenied
        return model_tree(self.model_roots, app_label=app_label, model=model, path=path)
