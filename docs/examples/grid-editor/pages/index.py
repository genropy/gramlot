"""Resident cell editing experiment, authored entirely through Gramlot."""
from genro_bag import Bag
from datetime import date, time
from gramlot.grid import GridStruct
from gramlot.page import WebPage, endpoint


class Page(WebPage):
    title = 'Editable grid experiment'
    example_view = True

    def main(self, root):
        root.h2('Editable grid — stable editor experiment')
        root.p('Double-click a cell. Enter confirms, Tab moves forward, Shift-Tab moves back, Escape discards. Tab selects the text; Up/Down moves within the column. Scroll away and back to recover an open draft.')
        data = Bag()
        for i in range(80):
            row = Bag()
            row.set_item('description', f'Line {i + 1}')
            row.set_item('quantity', 2)
            row.set_item('price', 12.5)
            row.set_item('product', 'lamp')
            data.set_item(f'r{i}', row)
        root.data('rows', data)
        struct = GridStruct()
        cells = struct.view().rows()
        cells.cell('description', name='Description', width=165, edit=True)
        cells.cell('quantity', name='Quantity', dtype='L', width=80, edit=dict(validate_min=1))
        cells.cell('price', name='Price', dtype='N', width=80, edit=dict(places=2))
        cells.cell('product', name='Product ID', width=130,
                   edit=dict(tag='dbSelect', rpcmethod='products', searchdelay=80))
        cells.cell('total', name='Total', dtype='N', width=90, formula='quantity * price', calculated=True)
        root.data('struct', struct)
        root.grid(store='^rows', structpath='struct', height='340px')
        root.p('^rows.r0.description', mask='First description in Data: %s')
        root.p('^rows.r0.quantity', mask='First quantity in Data: %s')
        root.p('^rows.r0.product', mask='First product ID in Data: %s')
        root.h2('Text and choices')
        root.p('Textarea: Enter inserts a line; Up/Down moves the cursor. Ctrl/Cmd+Enter confirms, Tab moves to the next cell. Expanded editors overlap the following rows.')
        self.widget_grid(root, 'choices', [
            ('notes', 'Multiline notes', 'First line\nSecond line', None, 240,
             dict(tag='textBoxArea', rows=4, height='100px', maxlength=200)),
            ('country', 'Filtering select', 'it', None, 140,
             dict(tag='filteringSelect', values='it:Italy,en:England,fr:France')),
            ('free_choice', 'Combo box', 'Italy', None, 140,
             dict(tag='comboBox', values='Italy,England,France')),
            ('remote', 'Remote select', 'lamp', None, 150,
             dict(tag='remoteSelect', rpcmethod='products', searchdelay=80)),
            ('enabled', 'Checkbox', True, 'B', 100, dict(tag='checkBox')),
        ])
        root.h2('Dates, sliders and other inputs')
        root.p('Sliders and time inputs retain their native arrow keys. Tab confirms and moves forward. Password values here are synthetic demo data.')
        self.widget_grid(root, 'typed', [
            ('day', 'Date', date(2026, 9, 13), 'D', 150,
             dict(tag='dateTextBox', locale='it-IT', symbolic=True)),
            ('hour', 'Time', time(14, 30), 'H', 130, dict(tag='timeTextBox')),
            ('level', 'Horizontal slider', 40, 'L', 160,
             dict(tag='horizontalSlider', min=0, max=100, step=5)),
            ('vertical', 'Vertical slider', 40, 'L', 130,
             dict(tag='verticalSlider', min=0, max=100, step=5, height='110px')),
            ('color', 'Color', '#336699', None, 120, dict(tag='colorpicker')),
            ('password', 'Password (demo)', 'demo-only', None, 160, dict(tag='passwordbox')),
        ])

    def widget_grid(self, root, name, columns):
        data = Bag()
        for i in range(8):
            row = Bag()
            for field, _label, value, _dtype, _width, _editor in columns:
                row.set_item(field, value)
            data.set_item(f'r{i}', row)
        root.data(name, data)
        struct = GridStruct()
        cells = struct.view().rows()
        for field, label, _value, dtype, width, editor in columns:
            cells.cell(field, name=label, dtype=dtype, width=width, edit=editor)
        root.data(f'{name}_struct', struct)
        root.grid(store=f'^{name}', structpath=f'{name}_struct', height='220px')
        for field, label, _value, _dtype, _width, _editor in columns:
            root.div(f'^{name}.r0.{field}', mask=f'{label} in Data: %s')

    @endpoint
    def products(self, _querystring='', _id=None):
        rows = [dict(id='lamp', caption='Desk lamp'), dict(id='book', caption='Notebook'),
                dict(id='desk', caption='Oak desk')]
        rows = [r for r in rows if (r['id'] == _id if _id is not None
                                   else _querystring.lower() in r['caption'].lower())]
        return dict(rows=rows, identifier='id', caption='caption')
