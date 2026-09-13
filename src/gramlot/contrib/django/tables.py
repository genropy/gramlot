"""Explicit, permission-checked model table projection for administration PoCs."""
from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.forms import ModelForm, modelform_factory
from genro_bag import Bag
from .page import DjangoPage
from gramlot.page import endpoint, source
from gramlot.grid import GridStruct


class DjangoTablesPage(DjangoPage):
    """Opt in with {model_label: editable_field_names}; no model is implicit."""
    table_fields = {}
    table_related_fields = {}
    table_forms = {}
    table_allow_create = {}
    login_required = True
    source_inspection = False

    def form_class(self, label):
        model = apps.get_model(label)
        return modelform_factory(model, form=self.table_forms.get(label, ModelForm),
                                 fields=[name for name in self.table_fields[label]
                                         if not model._meta.get_field(name).many_to_many])

    def model(self, label, action='view'):
        if label not in self.table_fields:
            raise PermissionDenied('Table is not exposed')
        model = apps.get_model(label)
        if action == 'add' and not self.table_allow_create.get(label, True):
            raise PermissionDenied('Creation is not enabled for this table')
        user = self.request.user
        if not user.is_active or not user.is_staff or not user.has_perm(
                f'{model._meta.app_label}.{action}_{model._meta.model_name}'):
            raise PermissionDenied('Permission denied')
        return model

    def main(self, root):
        root.styleSheet('''
body{margin:0;font:14px system-ui;color:#243746} .table-nav{padding:16px;background:#eef2f6;overflow:auto}
.table-main{padding:18px;box-sizing:border-box;overflow:auto}.tools{display:flex;align-items:end;gap:12px;margin:12px 0}
.record-overlay{position:fixed;inset:0;background:#e5ebf24d;z-index:1000;align-items:center;justify-content:center}
.record-card{background:white;border-radius:8px;padding:18px;width:min(840px,92vw);max-height:85vh;overflow:auto;box-shadow:0 12px 50px #0004}
.field-error{color:#b42318;font-size:12px;margin:4px 0 10px}.record-card input{box-sizing:border-box;width:100%}.record-card gnr-form{display:block}.record-card{--group-label-bg:#e8edf3;--group-label-color:#34465b;--group-border:#cbd5e1;--group-padding:18px}
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
        right.p('^viewError', role='alert')
        right.contentPane().remote(self.table_view, label='^table', _onError='this.SET("viewError", error.message);')

    @source
    def table_view(self, root, label=''):
        root = root.div()
        if label not in self.table_fields:
            root.h2('Select a table')
            return
        model = self.model(label)
        fields = [name for name in self.table_fields[label]
                  if not model._meta.get_field(name).many_to_many]
        form_class = self.form_class(label)
        root.data('query', '')
        root.data('editorDisplay', 'none')
        root.data('record', Bag())
        root.data('errors', Bag())
        root.data('recordKey', None)
        root.h2(str(model._meta.verbose_name_plural).capitalize())
        tools = root.div(class_='tools')
        tools.textBox(value='^query', lbl='Search', live=True)
        tools.button('Search', fire='reloadTable')
        if self.table_allow_create.get(label, True) and self.request.user.has_perm(f'{model._meta.app_label}.add_{model._meta.model_name}'):
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
        group = dialog.groupBox(lbl='^record._caption', lbl_position='TC')
        form_ui = group.form(formId='recordEditor', datapath='record', controllerPath='recordFormState', store='memory')
        fields_ui = form_ui.formlet(columns=2, gap='14px', lbl_position='TL', box_padding='4px', box_margin_bottom='8px')
        for name, field in form_class().fields.items():
            from django.forms import Textarea
            model_field = model._meta.get_field(name)
            options = {}
            if model_field.many_to_many:
                continue  # Multiple relations are displayed in the related tabs.
            if model_field.is_relation:
                widget = fields_ui.dbSelect
                options = dict(rpcmethod=self.relation_choices, kw_label=label, kw_field=name)
            else:
                widget = fields_ui.textBoxArea if isinstance(field.widget, Textarea) else fields_ui.textBox
            widget(**options, value=f'^.{name}', lbl=str(field.label), width='100%',
                            validate_remote='validate_record_field', validate_remote_if='=._loaded',
                            validate_remote_label=label, validate_remote_field=name,
                            validate_remote_values='=.', validate_remote_key='=._pkey',
                            validate_depends='.', validate_timeout=10000)
            dialog.p(f'^errors.{name}', class_='field-error')
        dialog.contentPane().remote(self.related_view, label=label, key='^record._pkey')
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
        fields = [name for name in self.table_fields[label]
                  if not model._meta.get_field(name).many_to_many]
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
        result.set_item('_pkey', key)
        result.set_item('_loaded', True)
        caption = str(instance) if key is not None else 'New record'
        result.set_item('_caption', f'{model._meta.verbose_name}: {caption}')
        for name in self.table_fields[label]:
            field = model._meta.get_field(name)
            if not field.many_to_many:
                result.set_item(name, getattr(instance, field.attname))
        return result

    @endpoint
    def save_record(self, label, values, key=None):
        model = self.model(label, 'add' if key is None else 'change')
        fields = [name for name in self.table_fields[label]
                  if not model._meta.get_field(name).many_to_many]
        data = {name: values.get_item(name) if isinstance(values, Bag) else values.get(name)
                for name in fields}
        with transaction.atomic():
            instance = model() if key is None else model.objects.select_for_update().get(pk=key)
            form = self.form_class(label)(data=data, instance=instance)
            if not form.is_valid():
                errors = Bag()
                for name, messages in form.errors.items():
                    errors.set_item(name, ' '.join(messages))
                return dict(ok=False, errors=errors)
            instance = form.save()
        return dict(ok=True, key=instance.pk)


    @endpoint
    def validate_record_field(self, label, field, value, values, key=None):
        model = self.model(label, 'add' if key is None else 'change')
        fields = [name for name in self.table_fields[label]
                  if not model._meta.get_field(name).many_to_many]
        if field not in fields:
            raise PermissionDenied('Field is not exposed')
        data = {name: values.get_item(name) if isinstance(values, Bag) else values.get(name)
                for name in fields}
        data[field] = value
        instance = model() if key is None else model.objects.get(pk=key)
        form = self.form_class(label)(data=data, instance=instance)
        form.is_valid()
        messages = [*form.errors.get(field, []), *form.non_field_errors()]
        if messages:
            return {'errorcode': 'django', 'message': ' '.join(messages)}
        return True


    def _can_view_related(self, model):
        user = self.request.user
        return user.is_active and user.is_staff and user.has_perm(
            f'{model._meta.app_label}.view_{model._meta.model_name}')

    @endpoint
    def relation_choices(self, label, field, _querystring='', _id=None):
        model = self.model(label)
        if field not in self.table_fields[label]:
            raise PermissionDenied('Field is not exposed')
        relation = model._meta.get_field(field)
        if not (relation.many_to_one or relation.one_to_one):
            raise PermissionDenied('Field is not a single relation')
        target = relation.related_model
        if not self._can_view_related(target):
            raise PermissionDenied('Related table permission denied')
        # Reuse ModelForm restrictions, including limit_choices_to/custom querysets.
        rows = self.form_class(label)().fields[field].queryset
        identity = relation.target_field.name
        if _id is not None:
            rows = rows.filter(**{identity: _id})
        else:
            query = str(_querystring or '').strip()[:200]
            # Search caption-like fields only; never scan arbitrary private text.
            names = [name for name in ('title', 'name', 'label', 'username')
                     if any(f.name == name and f.get_internal_type() in ('CharField', 'TextField')
                            for f in target._meta.fields)]
            if query:
                condition = Q()
                for name in names:
                    condition |= Q(**{f'{name}__icontains': query})
                rows = rows.filter(condition) if names else rows.none()
        return dict(rows=[{'id': getattr(row, identity), 'caption': str(row)}
                          for row in rows.order_by(target._meta.pk.name)[:30]],
                    identifier='id', caption='caption')

    def related_relations(self, label):
        model = self.model(label)
        exposed = {**self.table_fields, **self.table_related_fields}
        result = {}
        for relation in model._meta.get_fields():
            if not (relation.one_to_many or relation.many_to_many) or relation.hidden:
                continue
            target = relation.related_model
            names = exposed.get(target._meta.label_lower)
            if names is None or not self._can_view_related(target):
                continue
            # Only explicitly exposed scalar columns enter a related grid.
            fields = [name for name in names if not target._meta.get_field(name).is_relation]
            accessor = relation.get_accessor_name() if relation.auto_created else relation.name
            result[relation.name] = (target, fields, accessor)
        return result

    @source
    def related_view(self, root, label, key=None):
        root = root.div()
        relations = self.related_relations(label)
        if not relations:
            return
        if key is None:
            root.p('Save the record to view related data.')
            return
        # Confirm the parent exists before generating any child requests.
        self.model(label).objects.get(pk=key)
        tabs = root.tabContainer(height='260px')
        for index, (name, (target, fields, accessor)) in enumerate(relations.items()):
            pane = tabs.contentPane(pageName=f'relation{index}',
                                    title=str(target._meta.verbose_name_plural))
            struct = GridStruct()
            columns = struct.view().rows()
            pk = target._meta.pk.name
            for field_name in dict.fromkeys([pk, *fields]):
                field = target._meta.get_field(field_name)
                options = dict(dtype='H', format='HH:mm') if field.get_internal_type() == 'TimeField' else {}
                columns.cell(field_name, name=str(field.verbose_name).capitalize(), width=160, **options)
            store = f'relatedRows{index}'
            pane.data(f'{store}Struct', struct)
            pane.rpcStore(self.related_rows, storeCode=store, storepath=f'{store}Data',
                          _identifier=pk, label=label, relation=name, key=key, _onStart=True)
            pane.grid(store=store, structpath=f'{store}Struct', height='210px')

    @endpoint
    def related_rows(self, label, relation, key=None):
        relations = self.related_relations(label)
        if relation not in relations:
            raise PermissionDenied('Relation is not exposed')
        target, fields, accessor = relations[relation]
        pk = target._meta.pk.name
        if key is None:
            return self.selection_result([], identifier=pk)
        instance = self.model(label).objects.get(pk=key)
        rows = getattr(instance, accessor).all().order_by(pk)[:100]
        return self.selection_result(rows, identifier=pk,
                                     fields=list(dict.fromkeys([pk, *fields])))
