"""Read-only Django model metadata as lazy Gramlot Bag branches."""
from django.apps import apps
from django.core.exceptions import FieldDoesNotExist, PermissionDenied
from genro_bag import Bag
from gramlot.resolvers import RpcResolver


def model_tree(roots, *, app_label=None, model=None, path=None):
    """Describe one level of explicitly enabled models without querying records.

    ``('*',)`` opts into the complete installed model registry. Relations only
    expand into enabled models. Hidden/auto-created through models, generic
    targets, Python properties and runtime query annotations are not expanded.
    """
    available = {item._meta.label_lower: item for item in apps.get_models()}
    allowed = available if '*' in roots else {
        label: available[label] for label in roots if label in available
    }
    path = [] if path is None else path
    if (not isinstance(path, list) or len(path) > 24
            or any(not isinstance(part, str) or not part for part in path)):
        raise ValueError('Expected a relation path of at most 24 names')
    if app_label is not None and not isinstance(app_label, str):
        raise ValueError('Expected an app label')
    if model is not None and not isinstance(model, str):
        raise ValueError('Expected a model label')
    if model is None:
        if path:
            raise ValueError('A relation path requires a model')
        result = Bag()
        if app_label is None:
            for config in sorted(apps.get_app_configs(), key=lambda item: item.label):
                models = [item for item in allowed.values() if item._meta.app_label == config.label]
                if models:
                    result.set_item(config.label, RpcResolver(method='model_tree',
                                    params={'app_label': config.label}),
                                    _attributes={'caption': f'{config.label} · {len(models)} models',
                                                 'node_kind': 'group'})
        else:
            models = [item for item in allowed.values() if item._meta.app_label == app_label]
            if not models:
                raise PermissionDenied('App is not exposed')
            for item in sorted(models, key=lambda value: value._meta.model_name):
                result.set_item(item._meta.model_name, RpcResolver(method='model_tree',
                                params={'model': item._meta.label_lower}),
                                _attributes={'caption': item.__name__, 'node_kind': 'group',
                                             'model': item._meta.label_lower,
                                             'db_table': item._meta.db_table})
        return result
    if app_label is not None:
        raise ValueError('Choose either an app branch or a model branch')
    if model not in allowed:
        raise PermissionDenied('Model is not exposed')
    current = allowed[model]
    for part in path:
        try:
            field = current._meta.get_field(part)
        except FieldDoesNotExist:
            raise ValueError('Unknown relation path') from None
        target = getattr(field, 'related_model', None)
        if not field.is_relation or target is None or getattr(field, 'hidden', False):
            raise ValueError('Path must follow visible concrete relations')
        if target._meta.label_lower not in allowed:
            raise PermissionDenied('Related model is not exposed')
        current = target
    result = Bag()
    for field in current._meta.get_fields(include_parents=True, include_hidden=False):
        target = getattr(field, 'related_model', None)
        reverse = bool(field.auto_created and not field.concrete)
        cardinality = ('many-to-many' if field.many_to_many else
                       'one-to-many' if field.one_to_many else
                       'one-to-one' if field.one_to_one else
                       'many-to-one' if field.many_to_one else None)
        attrs = {
            'caption': field.name, 'field_name': field.name,
            'fieldpath': '__'.join([*path, field.name]),
            'model': current._meta.label_lower,
            'field_type': type(field).__name__, 'dtype': field_dtype(field),
            'verbose_name': str(getattr(field, 'verbose_name', field.name)),
            'primary_key': bool(getattr(field, 'primary_key', False)),
            'nullable': bool(getattr(field, 'null', False)),
            'editable': bool(getattr(field, 'editable', False)),
        }
        value = None
        if field.is_relation:
            attrs.update(cardinality=cardinality, reverse=reverse)
            if target is not None:
                attrs['related_model'] = target._meta.label_lower
                attrs['caption'] += f' → {target.__name__}'
                attrs['relation_direction'] = 'descending' if reverse or field.many_to_many else 'ascending'
                if target._meta.label_lower in allowed and len(path) < 24:
                    value = RpcResolver(method='model_tree', params={
                        'model': model, 'path': [*path, field.name],
                    })
            else:
                attrs['caption'] += ' · generic target'
        result.set_item(field.name, value, _attributes=attrs)
    return result


def field_dtype(field):
    if field.is_relation:
        return 'O'
    kind = field.get_internal_type()
    if kind in ('BooleanField',):
        return 'B'
    if 'Integer' in kind or kind in ('AutoField', 'BigAutoField', 'SmallAutoField'):
        return 'L'
    return {'CharField': 'A', 'TextField': 'T', 'SlugField': 'A', 'EmailField': 'A',
            'URLField': 'A', 'UUIDField': 'A', 'DecimalField': 'N', 'FloatField': 'R',
            'DateField': 'D', 'DateTimeField': 'DH', 'TimeField': 'H',
            'JSONField': 'JS'}.get(kind, 'O')
