"""Explicit, permission-checked model table projection for administration PoCs."""
from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.forms import modelform_factory
from genro_bag import Bag
from .page import DjangoPage
from gramlot.page import endpoint, source
from gramlot.grid import GridStruct


class DjangoTablesPage(DjangoPage):
    """Opt in with {model_label: editable_field_names}; no model is implicit."""
    table_fields = {}
    login_required = True
    source_inspection = False

    def model(self, label, action='view'):
        if label not in self.table_fields:
            raise PermissionDenied('Table is not exposed')
        model = apps.get_model(label)
        user = self.request.user
        if not user.is_active or not user.is_staff or not user.has_perm(
                f'{model._meta.app_label}.{action}_{model._meta.model_name}'):
            raise PermissionDenied('Permission denied')
        return model

    def main(self, root):
        root.styleSheet('''
body{margin:0;font:14px system-ui;color:#243746} .table-nav{padding:16px;background:#eef2f6;overflow:auto}
.table-main{padding:18px;box-sizing:border-box;overflow:auto}.tools{display:flex;align-items:end;gap:12px;margin:12px 0}
.record-overlay{position:fixed;inset:0;background:#15253588;z-index:1000;align-items:center;justify-content:center}
.record-card{background:white;border-radius:8px;padding:24px;width:480px;max-height:85vh;overflow:auto;box-shadow:0 12px 50px #0004}
.field-error{color:#b42318;font-size:12px;margin:4px 0 10px}.record-card input{box-sizing:border-box;width:100%}
''')
        nav = Bag()
        for label in self.table_fields:
            try:
                model = self.model(label)
            except PermissionDenied:
                continue
            nav.set_item(label, None, caption=str(model._meta.verbose_name_plural))
        root.data('tableList', nav)
        root.data('table', '')
        layout = root.borderContainer(height='100vh')
        left = layout.contentPane(region='left', width='210px', splitter=True, class_='table-nav')
        left.h3('Tables')
        left.storeTree(store='^tableList', selectedPath='^table', labelAttribute='caption')
        right = layout.contentPane(region='center', class_='table-main')
        right.remote(self.table_view, label='^table')

    @source
    def table_view(self, root, label=''):
        if label not in self.table_fields:
            root.h2('Select a table')
            return
        model = self.model(label)
        fields = self.table_fields[label]
        form_class = modelform_factory(model, fields=fields)
        root.data('query', '')
        root.data('editorDisplay', 'none')
        root.data('record', Bag())
        root.data('errors', Bag())
        root.data('recordKey', None)
        root.h2(str(model._meta.verbose_name_plural).capitalize())
        tools = root.div(class_='tools')
        tools.textBox(value='^query', lbl='Search', live=True)
        tools.button('Search', fire='reloadTable')
        if self.request.user.has_perm(f'{model._meta.app_label}.add_{model._meta.model_name}'):
            tools.button('New', action="this.SET('recordKey', null); this.FIRE('loadRecord');")
        root.p('Double-click a row or press Enter to edit. Search returns at most 100 records.')
        struct = GridStruct()
        columns = struct.view().rows()
        columns.cell(model._meta.pk.name, name='ID', width=80)
        for name in fields:
            field = model._meta.get_field(name)
            columns.cell(name, name=str(field.verbose_name).capitalize(), width=220)
        root.data('tableStruct', struct)
        root.rpcStore(self.table_rows, storeCode='tableRows', storepath='tableRowsData',
                      _identifier=model._meta.pk.name, label=label, query='=query',
                      _onStart=True, _fired='^reloadTable',
                      _onError='this.SET("tableStatus", error.message);')
        root.grid(store='tableRows', structpath='tableStruct', nodeId='recordsGrid', height='420px')
        root.dataController("this.SET('recordKey', key); this.FIRE('loadRecord');",
                            subscribe_recordsGrid_onRowActivated=True)
        root.dataRpc('record', self.load_record, label=label, key='=recordKey', _fired='^loadRecord',
                     _onResult="this.SET('errors', null); this.SET('tableStatus', ''); this.SET('editorDisplay', 'flex');",
                     _onError='this.SET("tableStatus", error.message);')
        root.p('^tableStatus', role='status')
        overlay = root.div(class_='record-overlay', display='^editorDisplay')
        dialog = overlay.div(class_='record-card', role='dialog', aria_modal='true', aria_label='Record editor')
        dialog.h2('Record editor')
        for name, field in form_class().fields.items():
            # This first projection accepts scalar fields only; relations need select providers.
            dialog.textBox(value=f'^record.{name}', lbl=str(field.label), live=True)
            dialog.p(f'^errors.{name}', class_='field-error')
        dialog.p('^errors.__all__', class_='field-error', role='alert')
        actions = dialog.div(class_='tools')
        actions.button('Save', fire='saveRecord')
        actions.button('Cancel', action="this.SET('editorDisplay', 'none');")
        root.dataRpc('saveResult', self.save_record, label=label, key='=recordKey', values='=record',
                     _fired='^saveRecord', _lockScreen=True,
                     _onResult="""if (result.ok) {this.SET('editorDisplay', 'none'); this.SET('tableStatus', 'Saved'); this.FIRE('reloadTable');}
else {this.SET('errors', result.errors);}""",
                     _onError='this.SET("errors.__all__", error.message);')

    @endpoint
    def table_rows(self, label, query=''):
        model = self.model(label)
        fields = self.table_fields[label]
        rows = model.objects.all()
        query = str(query or '').strip()[:200]
        if query:
            condition = Q()
            for name in fields:
                if model._meta.get_field(name).get_internal_type() in ('CharField', 'TextField'):
                    condition |= Q(**{f'{name}__icontains': query})
            if not condition:
                return self.selection_result([], identifier=model._meta.pk.name)
            rows = rows.filter(condition)
        return self.selection_result(rows.order_by(model._meta.pk.name)[:100],
            identifier=model._meta.pk.name, fields=[model._meta.pk.name, *fields])

    @endpoint
    def load_record(self, label, key=None):
        model = self.model(label, 'add' if key is None else 'change')
        instance = model() if key is None else model.objects.get(pk=key)
        result = Bag()
        for name in self.table_fields[label]:
            result.set_item(name, getattr(instance, name))
        return result

    @endpoint
    def save_record(self, label, values, key=None):
        model = self.model(label, 'add' if key is None else 'change')
        fields = self.table_fields[label]
        data = {name: values.get_item(name) if isinstance(values, Bag) else values.get(name)
                for name in fields}
        with transaction.atomic():
            instance = model() if key is None else model.objects.select_for_update().get(pk=key)
            form = modelform_factory(model, fields=fields)(data=data, instance=instance)
            if not form.is_valid():
                errors = Bag()
                for name, messages in form.errors.items():
                    errors.set_item(name, ' '.join(messages))
                return dict(ok=False, errors=errors)
            instance = form.save()
        return dict(ok=True, key=instance.pk)
