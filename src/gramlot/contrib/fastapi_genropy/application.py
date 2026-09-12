"""Optional FastAPI host adapter for thread-keyed GenroPy database access."""

from __future__ import annotations

import inspect
from decimal import Decimal
from datetime import date, datetime, time
import math
from pathlib import Path

from fastapi import FastAPI
from genro_bag import Bag

from gramlot.contrib.fastapi.application import PageCollection
from gramlot.page import WebPage


class GenropyPage(WebPage):
    """A fresh Gramlot page with lazy, invocation-scoped ``self.db`` access."""

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
