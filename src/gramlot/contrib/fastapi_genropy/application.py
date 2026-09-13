"""Optional FastAPI host adapter for thread-keyed GenroPy database access."""

from __future__ import annotations

import inspect
from decimal import Decimal
from datetime import date, datetime, time
import math
import re
from pathlib import Path

from fastapi import FastAPI
from genro_bag import Bag

from gramlot.contrib.fastapi.application import PageCollection
from gramlot.page import WebPage, endpoint
from gramlot.resolvers import RpcResolver


class GenropyPage(WebPage):
    """A fresh Gramlot page with lazy, invocation-scoped ``self.db`` access."""

    relation_roots = ()

    @endpoint
    def relation_tree(self, table, path=None, omit='_', dosort=True, groupDescending=False):
        """Return one model level; only declared roots and actual relations are valid.

        This exposes model metadata, not records or legacy Page permission rules.
        Applications needing column permissions must override and redecorate it.
        """
        if not isinstance(table, str) or table not in self.relation_roots:
            raise ValueError('Table is not an exposed relation root')
        if not isinstance(omit, str) or not isinstance(dosort, bool):
            raise ValueError('Expected an omit string and a boolean dosort')
        if not isinstance(groupDescending, bool):
            raise ValueError('Expected a boolean groupDescending')
        path = [] if path is None else path
        if (not isinstance(path, list) or len(path) > 32
                or any(not isinstance(label, str) or not label for label in path)):
            raise ValueError('Expected a relation path of at most 32 labels')
        from gnr.sql.gnrsqlmodel.resolvers import RelationTreeResolver

        current_table = table
        relation_captions = []
        branch = self.db.table(table).model.relations
        for label in path:
            node = next((node for node in branch.nodes if node.label == label), None)
            if node is None or not isinstance(node.resolver, RelationTreeResolver):
                raise ValueError('Path must follow model relations')
            relation_captions.append('@' + self._genropy_application.localizer.translate(
                node.attr.get('caption') or node.attr.get('name_long') or node.label).lstrip('@'))
            current_table = f'{node.resolver.pkg_name}.{node.resolver.tbl_name}'
            branch = node.getValue()
            if branch is None:
                return Bag()
        result = Bag()
        for node in branch.nodes:
            attrs = {key: legacy_to_gramlot(value) for key, value in node.attr.items()}
            attrs['caption'] = self._genropy_application.localizer.translate(
                attrs.get('caption') or attrs.get('name_long') or node.label)
            if node.resolver is not None:
                if not isinstance(node.resolver, RelationTreeResolver):
                    raise TypeError('Unsupported model resolver')
                attrs['caption'] = '@' + attrs['caption'].lstrip('@')
                joiner = attrs['joiner']
                attrs['group'] = (joiner.get('one_group') if joiner['mode'] == 'O'
                                  else joiner.get('many_group') or 'zz')
                attrs['dtype'] = self.db.model.column(joiner['many_relation']).attributes.get('dtype', 'A')
                attrs['relation_direction'] = 'ascending' if joiner['mode'] == 'O' else 'descending'
                value = RpcResolver(method='relation_tree',
                                    params={'table': table, 'path': [*path, node.label],
                                            'omit': omit, 'dosort': dosort,
                                            'groupDescending': groupDescending})
            else:
                value = legacy_to_gramlot(node.getValue(mode='static'))
            attrs['fieldpath'] = '.'.join([*path, node.label])
            result.set_item(node.label, value, _attributes=attrs)
        model = self.db.table(current_table).model
        # Legacy subtables generate boolean formulas for record subsets, not fields.
        subtable_columns = {f'subtable_{name}' for name in (model.subtables or {}).keys()}
        for name, column in model.virtual_columns.items():
            if name in subtable_columns:
                continue
            attrs = {key: legacy_to_gramlot(value) for key, value in column.attributes.items()}
            kind = ('composite' if attrs.get('composed_of') else
                    'alias' if attrs.get('relation_path') else
                    'python' if attrs.get('py_method') else
                    'formula' if any(key in attrs for key in ('sql_formula', 'select', 'exists'))
                    else 'virtual')
            attrs['column_kind'] = kind
            reasons = column_subquery_paths(model, name)
            if reasons:
                attrs['subquery_paths'] = reasons
            attrs['dtype'] = attrs.get('dtype') or self.db.table(current_table).column(name).attributes.get('dtype', 'T')
            attrs['caption'] = self._genropy_application.localizer.translate(attrs.get('name_long') or name)
            attrs['fieldpath'] = '.'.join([*path, name])
            result.set_item(name, None, _attributes=attrs)
        table_caption = self._genropy_application.localizer.translate(
            self.db.table(table).attributes.get('name_long') or table)
        for item in result:
            item.attr['fullcaption'] = '.'.join([*relation_captions, item.attr['caption']])
            item.attr['root_table_caption'] = table_caption
        groups = {key[6:]: self._genropy_application.localizer.translate(value)
                  for key, value in self.db.table(current_table).attributes.items()
                  if key.startswith('group_')}
        return group_relation_fields(result, groups, omit=omit, dosort=dosort,
                                     group_descending=groupDescending)

    def selection_result(self, rows, *, identifier, metadata=None):
        """Materialize fetched named rows as a portable TYTX selection result."""
        if not isinstance(identifier, str) or not identifier:
            raise TypeError('Selection identifier must be a nonempty string')
        records = []
        seen = set()
        for row in rows:
            if not hasattr(row, 'keys'):
                raise TypeError('Selection rows must expose named columns')
            record = {key: legacy_to_gramlot(row[key]) for key in row.keys()}
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

    @property
    def db(self):
        if not getattr(self, "_genropy_sync_active", False):
            raise RuntimeError(
                "GenropyPage.db is available only inside a synchronous Gramlot service; "
                "async methods must move GenroPy database work to a synchronous endpoint"
            )
        db = getattr(self, "_genropy_db", None)
        if db is None:
            db = self._genropy_application.db
            db.clearCurrentEnv()
            update_env = getattr(db, "updateEnv", None)
            if update_env is not None:
                update_env(
                    pagename=self._genropy_context.page_name,
                    gramlot_method=self._genropy_context.method_name,
                )
            self._genropy_db = db
        return db


class GenropyPageCollection(PageCollection):
    """Page registry sharing one host-owned GnrApp across fresh page invocations."""

    def __init__(self, directory, *, genropy_application, **options):
        if genropy_application is None or not hasattr(genropy_application, "db"):
            raise TypeError("genropy_application must be an initialized GnrApp-like object")
        self.genropy_application = genropy_application
        super().__init__(directory, **options)

    def create_page(self, page_class):
        page = page_class()
        if isinstance(page, GenropyPage):
            page._genropy_application = self.genropy_application
        return page

    def prepare_page(self, page, context) -> None:
        if isinstance(page, GenropyPage):
            page._genropy_context = context

    def invoke_sync(self, page, method, args, kwargs):
        if not isinstance(page, GenropyPage):
            return super().invoke_sync(page, method, args, kwargs)
        page._genropy_sync_active = True
        try:
            result = method(*args, **kwargs)
            if inspect.isawaitable(result):
                close = getattr(result, "close", None)
                if close is not None:
                    close()
                raise TypeError("A synchronous GenropyPage service must not return an awaitable")
            return self.materialize_result(page, result)
        finally:
            page._genropy_sync_active = False
            db = getattr(page, "_genropy_db", None)
            if db is not None:
                try:
                    db.closeConnection()
                finally:
                    db.clearCurrentEnv()

    def materialize_result(self, page, result):
        if isinstance(page, GenropyPage):
            return legacy_to_gramlot(result)
        return result


def column_subquery_paths(model, name, trail=()):
    """Conservative static hints, not execution-time estimates or a SQL parser."""
    key = (model.fullname, name)
    if key in trail or len(trail) >= 32:
        return []
    column = model.column(name)
    if column is None:
        return []
    attrs = column.attributes
    sql = attrs.get('sql_formula')
    sql = sql if isinstance(sql, str) else ''
    # Ignore quoted literals and SQL comments when looking for SELECT/references.
    sql = re.sub(r"'([^']|'')*'|--[^\n]*|/\*.*?\*/", ' ', sql, flags=re.S)
    direct = (attrs.get('subquery') or attrs.get('select') or attrs.get('exists')
              or any(k.startswith('select_') and v for k, v in attrs.items())
              or re.search(r'\bSELECT\b', sql, re.I))
    if direct:
        return [name]
    refs = re.findall(r'\$([A-Za-z_][\w]*|@[\w@.]+)', sql)
    if attrs.get('relation_path'):
        refs.append(attrs['relation_path'])
    paths = []
    for ref in dict.fromkeys(refs):
        target = model.column(ref)
        if target is None:
            continue
        for dependency in column_subquery_paths(target.table, target.name, (*trail, key)):
            paths.append(f'{name} → {ref}' + (f' → {dependency}' if dependency != target.name else ''))
    return list(dict.fromkeys(paths))


def group_relation_fields(fields, groups, *, omit='_', dosort=True, group_descending=False):
    """Legacy presentation rules, preserving lazy nodes and logical field paths.

    This is UI filtering, not column authorization. Group nesting never enters
    a resolver's model path. No resolver is read during sorting or grouping.
    """
    entries = []
    for node in fields:
        attrs = dict(node.attr)
        group = attrs.get('group') or ' '
        if '%' in group:
            group %= {key[9:]: value for key, value in attrs.items() if key.startswith('subgroup_')}
        if group[0] in omit:
            continue
        if group[0] in '*_':
            group = group[1:]
        attrs['group'] = group.strip() if group == ' ' else group
        entries.append((node, attrs))
    if dosort:
        entries.sort(key=lambda entry: entry[1]['group'].split('.'))
    result = Bag()
    for node, attrs in entries:
        target = result
        parts = attrs['group'].split('.')
        if parts[-1].isdigit():
            parts.pop()
        grouped = group_descending or attrs.get('relation_direction') != 'descending'
        if grouped and dosort and parts and parts[0] in groups:
            for index, part in enumerate(parts):
                current = target.get_node(part)
                if current is None:
                    label = groups.get('.'.join(parts[:index + 1]), part)
                    target.set_item(part, Bag(), _attributes={'caption': label, 'node_kind': 'group'})
                    current = target.get_node(part)
                target = current.get_value(static=True)
                if not isinstance(target, Bag):
                    raise ValueError('Field and group names collide')
        value = node.resolver if node.resolver is not None else node.get_value(static=True)
        target.set_item(node.label, value, _attributes=attrs)
    return result


def legacy_to_gramlot(value):
    """Recursively snapshot legacy Bags, preserving node order and attributes."""
    legacy_bag = _legacy_bag_class()
    if legacy_bag is not None and isinstance(value, legacy_bag):
        converted = Bag()
        for node in value.nodes:
            node_value = node.getValue(mode="static")
            if getattr(node, "resolver", None) is not None:
                raise TypeError(f"Legacy Bag node {node.label!r} has an unsupported lazy resolver")
            converted.set_item(
                node.label,
                legacy_to_gramlot(node_value),
                _attributes={key: legacy_to_gramlot(item) for key, item in node.attr.items()},
            )
        return converted
    if isinstance(value, dict):
        return {key: legacy_to_gramlot(item) for key, item in value.items()}
    if isinstance(value, list):
        return [legacy_to_gramlot(item) for item in value]
    if isinstance(value, tuple):
        raise TypeError("Legacy tuple/resultattrs results are not supported")
    if inspect.isgenerator(value) or inspect.isawaitable(value):
        raise TypeError(f"Unsupported lazy GenroPy return value: {type(value).__name__}")
    if hasattr(value, "fetch") or hasattr(value, "selection"):
        raise TypeError(f"Unsupported lazy GenroPy return value: {type(value).__name__}")
    if type(value) in (str, int, float, bool, type(None), Decimal, date, datetime, time) or isinstance(value, Bag):
        return value
    raise TypeError(f"Unsupported GenroPy return value: {type(value).__name__}")


def _legacy_bag_class():
    try:
        from gnr.core.gnrbag import Bag as LegacyBag
    except ImportError:
        return None
    return LegacyBag


def mount_genropy(app: FastAPI, directory: str | Path, *, genropy_application,
                  prefix: str = "/page", title: str = "Gramlot") -> GenropyPageCollection:
    pages = GenropyPageCollection(
        directory, genropy_application=genropy_application, prefix=prefix, title=title,
    )
    pages.mount(app)
    return pages


def create_genropy_application(directory: str | Path, *, genropy_application=None,
                               instance_name: str = "test_invoice_pg", prefix: str = "/page",
                               page_title: str = "Gramlot", **fastapi_options) -> FastAPI:
    """Create a FastAPI host around an existing GnrApp or lazily construct one."""
    if genropy_application is None:
        try:
            from gnr.app.gnrapp import GnrApp
        except ImportError as error:
            raise RuntimeError("GenroPy is optional and must be installed for this adapter") from error
        genropy_application = GnrApp(instance_name)
    app = FastAPI(**fastapi_options)
    app.gramlot_pages = mount_genropy(
        app, directory, genropy_application=genropy_application,
        prefix=prefix, title=page_title,
    )
    app.genropy_application = genropy_application
    return app


__all__ = [
    "GenropyPage", "GenropyPageCollection", "create_genropy_application",
    "legacy_to_gramlot", "mount_genropy",
]
