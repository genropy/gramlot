"""Compare remote and browser callback providers over the same model metadata."""
from gramlot.contrib.fastapi_genropy import GenropyPage
from gramlot.page import endpoint


class Page(GenropyPage):
    title = 'Model selects: remote and callback'
    example_view = True

    def main(self, root):
        root.data('catalog', self.catalog())
        root.p('Choose a logical package, a table and a field. Remote queries the server; callback searches the browser catalog.')
        for mode in ('remote', 'callback'):
            pane = root.div(datapath=mode, margin_bottom='20px')
            pane.h2('Remote select' if mode == 'remote' else 'Callback select')
            pane.dataController('this.SET(".table", null); this.SET(".field", null);', package='^.package')
            pane.dataController('this.SET(".field", null);', table='^.table')
            for kind, label in [('package', 'Package'), ('table', 'Table'), ('field', 'Field')]:
                attrs = dict(value=f'^.{kind}', lbl=label, kw_kind=kind,
                             id=f'{mode}-{kind}', searchdelay=80)
                if kind != 'package':
                    attrs['kw_package'] = '=.package'
                if kind == 'field':
                    attrs['kw_table'] = '=.table'
                if mode == 'remote':
                    pane.remoteSelect(rpcmethod=self.model_choices, **attrs)
                else:
                    pane.callbackSelect(kw_rows='=catalog', callback='''
                        return {rows: kw.rows.filter(r => r.kind === kw.kind
                            && (kw.kind === 'package' || r.package === kw.package)
                            && (kw.kind !== 'field' || r.table === kw.table)
                            && (kw._id != null ? r.id === kw._id
                                : r.caption.toLowerCase().includes((kw._querystring || '').toLowerCase()))).slice(0, 40),
                            identifier: 'id', caption: 'caption'};
                    ''', **attrs)
            pane.p('^.field', mask='Selected field: %s')

    def catalog(self):
        rows = []
        for package_name, package in self.db.packages.items():
            rows.append(dict(kind='package', id=package_name, caption=package_name))
            for table_name in package.tables.keys():
                model = self.db.table(f'{package_name}.{table_name}').model
                rows.append(dict(kind='table', package=package_name, id=table_name, caption=table_name))
                for name, column in {**dict(model.columns.items()), **dict(model.virtual_columns.items())}.items():
                    rows.append(dict(kind='field', package=package_name, table=table_name,
                                     id=name, caption=name, dtype=column.attributes.get('dtype', 'T')))
        return rows

    @endpoint
    def model_choices(self, kind: str, package=None, table=None, _querystring='', _id=None):
        rows = [r for r in self.catalog() if r['kind'] == kind
                and (kind == 'package' or r.get('package') == package)
                and (kind != 'field' or r.get('table') == table)
                and (r['id'] == _id if _id is not None else _querystring.lower() in r['caption'].lower())]
        return dict(rows=rows[:40], identifier='id', caption='caption')
