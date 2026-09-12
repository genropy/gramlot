"""Curated, independent manual checks, grouped by the production catalogue.

Each case is (title, expected behavior, Python body). Cases share no runtime Data.
The build adds only imports and the WebPage wrapper; the displayed code is executed.
"""
import textwrap

CASES = {}


def case(component, title, expected, body, javascript=None):
    CASES.setdefault(component, []).append((
        title,
        expected,
        textwrap.dedent(body).strip(),
        textwrap.dedent(javascript).strip() if javascript else None,
    ))


# Field variants intentionally share a recipe shape; component-specific options
# and initial values remain explicit below.
FIELDS = {
    'textBox': ("'Ada'", ""),
    'textBoxArea': ("'First line\\nSecond line'", ", height='90px'"),
    'passwordbox': ("'demo-secret'", ""),
    'filteringSelect': ("'it'", ", values='it:Italy,en:England,fr:France'"),
    'comboBox': ("'Italy'", ", values='Italy,England,France'"),
    'numberTextBox': ("Decimal('1234.56789')", ", dtype='N', places=2, locale='it-IT'"),
    'dateTextBox': ("date(2026, 9, 11)", ", dtype='D', locale='it-IT', symbolic=True, workdate='2026-09-11'"),
    'timeTextBox': ("time(14, 30)", ", dtype='H'"),
    'horizontalSlider': ("40", ", min=0, max=100, step=5"),
    'verticalSlider': ("40", ", min=0, max=100, step=5, height='120px'"),
    'checkbox': ("True", ""),
    'colorpicker': ("'#336699'", ""),
}
for name, (value, options) in FIELDS.items():
    check = 'Change the control and leave it: Stored follows the committed value.'
    if name == 'numberTextBox':
        check = 'Focus to see full precision. Two display decimals must not round the stored Decimal.'
    elif name == 'dateTextBox':
        check = 'Try oggi+15 and Enter: 26 September 2026. Invalid text must not replace the stored date.'
    elif name == 'passwordbox':
        check = 'The input masks its characters. The plain-text output is deliberately visible for this synthetic test only.'
    elif name == 'filteringSelect':
        check = 'Choose a country. The stored value is its key (it/en/fr), not its caption.'
    case(name, 'Bound value', check, f"""
root.data('value', {value})
root.{name}(value='^value', lbl='Value'{options})
root.div('^value', mask='Stored: %s', margin_top='16px')
""")
    case(name, 'Null and disabled', 'Compare an unset value with a disabled control. Toggle Show null values in the header; the disabled value must remain unchanged.', f"""
root.data('locked', {value})
root.{name}(value='^empty', lbl='Initially null'{options})
root.{name}(value='^locked', lbl='Disabled', disabled=True, margin_top='12px'{options})
root.div('^empty', mask='Edited null value: %s', margin_top='16px')
""")

case('textBox', 'Required and length', 'Leave an empty field or enter more than five characters to see validation.', """
root.textBox(value='^name', lbl='Short name', validate_notnull=True, validate_len='0:5')
root.div('^name', mask='Stored: %s', margin_top='16px')
""")
case('numberTextBox', 'Percent and bounds', '0.15 displays as 15.0%. Editing uses the fraction; values must stay between 0 and 1.', """
root.data('ratio', Decimal('0.15'))
root.numberTextBox(value='^ratio', dtype='N', format='percent', places=1, min=0, max=1, lbl='Ratio')
root.div('^ratio', mask='Stored fraction: %s', margin_top='16px')
""")
for locale in ('it-IT', 'en-GB'):
    case('dateCalendar', locale, 'Select another day. The standalone calendar writes an ISO civil date immediately.', f"""
root.data('day', '2026-09-11')
root.dateCalendar(value='^day', locale='{locale}')
root.div('^day', mask='Selected: %s', margin_top='16px')
""")
for cols in (1, 2):
    case('formlet', f'{cols} columns', 'Fields follow the requested column count and retain independent values.', f"""
fields = root.formlet(cols={cols}, gap='12px')
fields.textBox(value='^first', lbl='First name')
fields.textBox(value='^last', lbl='Last name')
fields.numberTextBox(value='^age', lbl='Age')
""")
for position in ('L', 'TC'):
    case('labledBox', f'Label {position}', 'The explicit label decorates the content region at the chosen position.', f"""
box = root.labledBox(label='Customer', label_position='{position}')
box.textBox(value='^name', placeholder='Type a name')
""")
for caption in ('Customer', ''):
    case('panel', 'Caption' if caption else 'No caption', 'The panel hosts ordinary content; the caption is optional.', f"""
panel = root.panel(caption={caption!r})
panel.div('Panel content')
panel.textBox(value='^name', lbl='Name')
""")
case('box', 'Grouped content', 'The box frames its three children in a vertical group.', """
box = root.box()
box.div('One')
box.div('Two')
box.div('Three')
""")
case('box', 'Nested groups', 'The inner box keeps its own border and content inside the outer box.', """
outer = root.box()
outer.div('Outer content')
inner = outer.box()
inner.textBox(value='^name', lbl='Nested name')
outer.div('^name', mask='Stored: %s')
""")
for side in ('left', 'right'):
    case('borderContainer', f'{side.title()} and center', 'The side pane keeps its width while the center occupies the remaining area.', f"""
layout = root.borderContainer(height='180px')
layout.contentPane(region='{side}', width='120px', background='#e9eff8').div('Side')
layout.contentPane(region='center', background='#f4f6f9').div('Center')
layout.contentPane(region='top', height='32px').div('Header')
""")
case('borderContainer', 'Composed workspace',
     'Resize or collapse the navigation pane. Switch tabs from the sidebar or tab strip. The grid scrolls inside the center; notes and selection survive tab changes.', """
from gramlot.grid import GridStruct

root.data('activePage', 'customers')
root.dataFormula('customersActive', "page == 'customers' ? 'true' : 'false'", page='^activePage')
root.dataFormula('notesActive', "page == 'notes' ? 'true' : 'false'", page='^activePage')
root.data('selectedCustomer', 'r003')
root.data('notes', 'Notes remain here when you switch tabs.')
records = Bag()
for index in range(1, 81):
    records.set_item(f'r{index:03d}', None, code=f'C-{index:03d}',
                     name=f'Customer {index:02d}', city=['Roma', 'Milano', 'Torino'][index % 3],
                     amount=Decimal(index * 125).scaleb(-2))
root.data('customers', records)
struct = GridStruct()
r = struct.view().rows()
r.cell('code', name='Code', width=85)
r.cell('name', name='Customer', width=0)
r.cell('city', name='City', width=100)
r.cell('amount', name='Amount', dtype='N', places=2, width=100)
root.data('customerStruct', struct)

layout = root.borderContainer(height='460px', border='1px solid #c9d1d9')
layout.contentPane(region='top', height='38px', padding='9px', box_sizing='border-box',
                   background='#eef1f4').div('Customer workspace', font_weight='600')
nav = layout.contentPane(region='left', width='150px', splitter=True, drawer=True,
                         padding='6px', background='#f5f7f9', box_sizing='border-box', class_='nav-tree')
nav = nav.details(open=True)
nav.summary('Workspace')
nav = nav.div(class_='tree-children')
nav.button('Customers', action="this.SET('activePage', 'customers');",
           class_='tree-item tree-customers', **{'aria-pressed':'^customersActive'})
nav.button('Notes', action="this.SET('activePage', 'notes');",
           class_='tree-item', **{'aria-pressed':'^notesActive'})
center = layout.contentPane(region='center', height='100%', min_height='0', min_width='0')
tabs = center.tabContainer(selectedPage='^activePage', height='100%',
                           style='--tab-pane-padding:0;')
customers = tabs.contentPane(pageName='customers', title='Customers', height='100%')
customers.grid(store='^customers', datamode='attr', structpath='customerStruct',
               selectedKey='^selectedCustomer', frozenColumns=1, height='100%')
notes = tabs.contentPane(pageName='notes', title='Notes', padding='12px')
notes.textBoxArea(value='^notes', lbl='Workspace notes', width='100%', height='160px')
notes.div('^notes', mask='Stored: %s', margin_top='12px')
footer = layout.contentPane(region='bottom', height='30px', padding='6px 10px', box_sizing='border-box',
                            background='#eef1f4')
footer.div('^selectedCustomer', mask='Selected customer: %s')
""")

for component in ('tabContainer', 'stackContainer', 'stackButtons', 'tab', 'contentPane'):
    for initial in ('details', 'history'):
        host = 'tabContainer' if component in ('tabContainer', 'tab', 'contentPane') else 'stackContainer'
        child = 'tab' if component == 'tab' else 'contentPane'
        buttons = "root.stackButtons(stackNodeId='pages')\n" if host == 'stackContainer' else ''
        case(component, f'Initially {initial}', 'Switch pages using the controls. The selectedPage binding and showing message must agree.', f"""
root.data('selected', '{initial}')
{buttons}pages = root.{host}(nodeId='pages', selectedPage='^selected', height='120px')
pages.{child}(pageName='details', title='Details').div('Customer details')
pages.{child}(pageName='history', title='History').div('Customer history')
root.button('Next', action="genro.publish('pages_switchPage', '*next*');")
root.button('Previous', action="genro.publish('pages_switchPage', '*prev*');")
root.dataController("this.SET('visible', pageName);", subscribe_pages_showing=True)
root.div('^selected', mask='Selected: %s', margin_top='16px')
root.div('^visible', mask='Showing: %s')
""")
for variant in ('bar', 'underline'):
    case('groupBox', variant, 'Edit the nested Data. Copy exports that branch as JSON; drag supplies a payload (no drop target in this case).', f"""
root.data('contact', Bag({{'name': 'Ada', 'city': 'London'}}))
group = root.groupBox(lbl='Contact', lbl_variant='{variant}', datapath='contact', copy=True, draggable=True)
group.textBox(value='^.name', lbl='Name')
group.textBox(value='^.city', lbl='City')
""")
for disabled in (False, True):
    case('copyButton', 'Disabled' if disabled else 'Live value', 'Copy then paste into the verification field. A disabled copy button must do nothing.', f"""
root.data('text', 'A synthetic clipboard example')
root.textBox(value='^text', lbl='Text to copy')
root.copyButton(value='^text', disabled={disabled})
root.textBox(value='^pasted', lbl='Paste here to verify', margin_top='16px')
""")
for collapsible in (False, True):
    case('palette', 'Collapsible' if collapsible else 'Open and close', 'Open, move, resize and close the palette. Reopening must preserve the text you entered.', f"""
root.data('opened', False)
root.button('Open palette', action="this.SET('opened', true);")
palette = root.palette(value='^opened', title='Test palette', collapsible={collapsible}, width='280px', height='180px', left='12px', top='40px')
palette.textBox(value='^note', lbl='Preserved note')
root.div(height='260px')
""")
for custom in (False, True):
    case('storeTree', 'Custom captions' if custom else 'Hierarchy and selection', 'Expand People, select a leaf and check the selected path.', f"""
nodes = Bag()
nodes.set_item('people.ada', 'Ada', _attributes={{'caption': 'Ada Lovelace'}})
nodes.set_item('people.grace', 'Grace', _attributes={{'caption': 'Grace Hopper'}})
root.data('nodes', nodes)
root.storeTree(store='^nodes', selectedPath='^selected', labelAttribute={'"caption"' if custom else '"label"'})
root.div('^selected', mask='Selected path: %s', margin_top='16px')
""")
for required in (False, True):
    case('form', 'Required field' if required else 'Save and restore', 'Edit then save to memory. Further edits can be restored to that saved baseline. The required variant rejects an empty name.', f"""
root.data('contact', Bag({{'name': 'Ada'}}))
form = root.form(formId='contact', datapath='contact', controllerPath='status', store='memory')
form.textBox(value='^.name', lbl='Name', validate_notnull={required})
form.button('Save', action='this.getFormHandler().save();')
form.button('Restore', action='this.getFormHandler().restoreBaseline();')
root.div('^status.dirty', mask='Dirty: %s', margin_top='16px')
root.div('^status.valid', mask='Valid: %s')
""")
for readonly in (False, True):
    case('codeMirror', 'Read-only' if readonly else 'Editable', 'Edit the code and inspect its Data binding. Read-only prevents edits. Syntax highlighting uses the existing optional CDN loader with a textarea fallback.', f"""
root.data('code', 'const answer = 42;')
root.codeMirror(value='^code', language='javascript', readonly={readonly}, lbl='JavaScript')
root.div('^code', margin_top='16px')
""")

case('grid', 'Fifty typed rows',
     'Scroll the resident rows, select one, then use the buttons. Selection is the stable rNNN Bag label; changing an amount updates the visible cell.', """
rows = Bag()
for index in range(1, 51):
    key = f'r{index:03d}'
    rows.set_item(key, Bag({
        'row_number': index,
        'code': f'C-{1000 + index}',
        'name': '' if index % 11 == 0 else f'Customer {index:02d}',
        'joined': None if index % 13 == 0 else date(2024 + index % 3, index % 12 + 1, index % 27 + 1),
        'active': index % 4 != 0,
        'amount': None if index % 17 == 0 else Decimal(index * 125).scaleb(-2),
    }))
root.data('rows', rows)
root.data('selected', 'r007')
actions = root.div(margin_bottom='12px')
actions.button('Select row 37', action="this.SET('selected', 'r037');")
actions.button('Update row 12', action="this.SET('rows.r012.amount', 9999.99);")
struct = Bag()
struct.set_item('view_0.rows_0.cell_row_number', None, field='row_number', name='#', dtype='L', width=42)
struct.set_item('view_0.rows_0.cell_code', None, field='code', name='Code', dtype='T', width=90)
struct.set_item('view_0.rows_0.cell_name', None, field='name', name='Customer', dtype='T', width=160)
struct.set_item('view_0.rows_0.cell_joined', None, field='joined', name='Joined', dtype='D', width=120, format='medium')
struct.set_item('view_0.rows_0.cell_active', None, field='active', name='Active', dtype='B', width=80)
struct.set_item('view_0.rows_0.cell_amount', None, field='amount', name='Amount', dtype='N', width=120, places=2, locale='en-GB')
root.data('struct', struct)
actions.button('Swap Customer / Joined', action="this.GET('struct.view_0.rows_0').move(2, 3);")
grid = root.quickGrid(value='^rows', selectedKey='^selected', height='330px', frozenColumns=2, structpath='struct')
root.div('^selected', mask='Selected Bag key: %s', margin_top='12px')
""", """
import {Bag} from 'genro-bag-js';

export function build(root) {
    for (let index = 1; index <= 50; index += 1) {
        const key = `r${String(index).padStart(3, '0')}`;
        root.data(`rows.${key}.row_number`, index);
        root.data(`rows.${key}.code`, `C-${1000 + index}`);
        root.data(`rows.${key}.name`, index % 11 === 0 ? '' : `Customer ${String(index).padStart(2, '0')}`);
        root.data(`rows.${key}.joined`, index % 13 === 0 ? null
            : new Date(Date.UTC(2024 + index % 3, index % 12, index % 27 + 1)));
        root.data(`rows.${key}.active`, index % 4 !== 0);
        root.data(`rows.${key}.amount`, index % 17 === 0 ? null : index * 1.25);
    }
    root.data('selected', 'r007');
    const actions = root.div({margin_bottom: '12px'});
    actions.button('Select row 37', {action: "this.SET('selected', 'r037');"});
    actions.button('Update row 12', {action: "this.SET('rows.r012.amount', 9999.99);"});
    const struct = new Bag();
    struct.setItem('view_0.rows_0.cell_row_number', null, {field:'row_number', name: '#', dtype: 'L', width: 42});
    struct.setItem('view_0.rows_0.cell_code', null, {field:'code', name: 'Code', dtype: 'T', width: 90});
    struct.setItem('view_0.rows_0.cell_name', null, {field:'name', name: 'Customer', dtype: 'T', width: 160});
    struct.setItem('view_0.rows_0.cell_joined', null, {field:'joined', name: 'Joined', dtype: 'D', width: 120, format: 'medium'});
    struct.setItem('view_0.rows_0.cell_active', null, {field:'active', name: 'Active', dtype: 'B', width: 80});
    struct.setItem('view_0.rows_0.cell_amount', null, {field:'amount', name: 'Amount', dtype: 'N', width: 120, places: 2, locale: 'en-GB'});
    root.data('struct', struct);
    actions.button('Swap Customer / Joined', {action:"this.GET('struct.view_0.rows_0').move(2, 3);"});
    const grid = root.quickGrid({value: '^rows', selectedKey: '^selected', height: '330px', frozenColumns: 2, structpath:'struct'});
    root.div('^selected', {mask: 'Selected Bag key: %s', margin_top: '12px'});
}
""")

case('grid', 'Keys are independent of fields',
     'Select a row and compare the result: selectedKey contains its stable Bag label, not its displayed code or visible position.', """
rows = Bag()
rows.set_item('north', Bag({'code': 'A-30', 'name': 'North'}))
rows.set_item('central', Bag({'code': 'A-10', 'name': 'Central'}))
rows.set_item('south', Bag({'code': 'A-20', 'name': 'South'}))
root.data('rows', rows)
root.data('selected', 'central')
grid = root.quickGrid(value='^rows', selectedKey='^selected', height='180px')
grid.column('code', name='Code', dtype='T', width=100)
grid.column('name', name='Customer', dtype='T', width=180)
root.div('^selected', mask='Selected Bag key: %s', margin_top='12px')
""", """
export function build(root) {
    root.data('rows.north.code', 'A-30');
    root.data('rows.north.name', 'North');
    root.data('rows.central.code', 'A-10');
    root.data('rows.central.name', 'Central');
    root.data('rows.south.code', 'A-20');
    root.data('rows.south.name', 'South');
    root.data('selected', 'central');
    const grid = root.quickGrid({value: '^rows', selectedKey: '^selected', height: '180px'});
    grid.column('code', {name: 'Code', dtype: 'T', width: 100});
    grid.column('name', {name: 'Customer', dtype: 'T', width: 180});
    root.div('^selected', {mask: 'Selected Bag key: %s', margin_top: '12px'});
}
""")


case('grid', '5,000 attribute-backed rows',
     '5,000 resident rows, with fields and a calculated adjusted amount in row-node attributes. Change the factor or row 12 amount and inspect the stored result in Data.', """
rows = Bag()
for index in range(1, 5001):
    rows.set_item(f'r{index:03d}', None, row_number=index,
                  code=f'C-{1000 + index}', name=f'Customer {index:02d}',
                  joined=date(2024 + index % 3, index % 12 + 1, index % 27 + 1),
                  active=index % 4 != 0, amount=Decimal(index * 125).scaleb(-2))
root.data('rows', rows)
root.data('selected', 'r007')
root.data('factor', Decimal('1.20'))
actions = root.div(margin_bottom='12px')
actions.button('Select row 37', action="this.SET('selected', 'r037');")
actions.button('Update row 12', action="this.GET('rows').getNode('r012').setAttr({amount:9999.99});")
root.numberTextBox(value='^factor', dtype='N', places=2, lbl='Adjustment factor',
                   margin_bottom='12px')
struct = Bag()
struct.set_item('view_0.rows_0.cell_row_number', None, field='row_number', name='#', dtype='L', width=42)
struct.set_item('view_0.rows_0.cell_code', None, field='code', name='Code', width=90)
struct.set_item('view_0.rows_0.cell_name', None, field='name', name='Customer', width=160)
struct.set_item('view_0.rows_0.cell_joined', None, field='joined', name='Joined', dtype='D', width=120, format='medium')
struct.set_item('view_0.rows_0.cell_active', None, field='active', name='Active', dtype='B', width=80)
struct.set_item('view_0.rows_0.cell_amount', None, field='amount', name='Amount', dtype='N', width=120, places=2, locale='en-GB')
struct.set_item('view_0.rows_0.cell_adjusted', None, field='adjusted', name='Adjusted', dtype='N',
                width=120, places=2, locale='en-GB', formula='amount * factor',
                formula_factor='^factor', calculated=True)
root.data('struct', struct)
actions.button('Swap Customer / Joined', action="this.GET('struct.view_0.rows_0').move(2, 3);")
grid = root.quickGrid(value='^rows', datamode='attr', selectedKey='^selected', height='330px', frozenColumns=2, structpath='struct')
root.div('^selected', mask='Selected Bag key: %s', margin_top='12px')
""", """
import {Bag} from 'genro-bag-js';

export function build(root) {
    const rows = new Bag();
    for (let index = 1; index <= 5000; index++) {
        rows.setItem(`r${String(index).padStart(3, '0')}`, null, {
            row_number:index, code:`C-${1000 + index}`, name:`Customer ${String(index).padStart(2, '0')}`,
            joined:new Date(Date.UTC(2024 + index % 3, index % 12, index % 27 + 1)),
            active:index % 4 !== 0, amount:index * 1.25
        });
    }
    root.data('rows', rows);
    root.data('selected', 'r007');
    root.data('factor', 1.20);
    const actions = root.div({margin_bottom:'12px'});
    actions.button('Select row 37', {action:"this.SET('selected', 'r037');"});
    actions.button('Update row 12', {action:"this.GET('rows').getNode('r012').setAttr({amount:9999.99});"});
    root.numberTextBox({value:'^factor', dtype:'N', places:2, lbl:'Adjustment factor', margin_bottom:'12px'});
    const struct = new Bag();
    struct.setItem('view_0.rows_0.cell_row_number', null, {field:'row_number', name:'#', dtype:'L', width:42});
    struct.setItem('view_0.rows_0.cell_code', null, {field:'code', name:'Code', width:90});
    struct.setItem('view_0.rows_0.cell_name', null, {field:'name', name:'Customer', width:160});
    struct.setItem('view_0.rows_0.cell_joined', null, {field:'joined', name:'Joined', dtype:'D', width:120, format:'medium'});
    struct.setItem('view_0.rows_0.cell_active', null, {field:'active', name:'Active', dtype:'B', width:80});
    struct.setItem('view_0.rows_0.cell_amount', null, {field:'amount', name:'Amount', dtype:'N', width:120, places:2, locale:'en-GB'});
    struct.setItem('view_0.rows_0.cell_adjusted', null, {field:'adjusted', name:'Adjusted', dtype:'N', width:120,
        places:2, locale:'en-GB', formula:'amount * factor', formula_factor:'^factor', calculated:true});
    root.data('struct', struct);
    actions.button('Swap Customer / Joined', {action:"this.GET('struct.view_0.rows_0').move(2, 3);"});
    const grid = root.quickGrid({value:'^rows', datamode:'attr', selectedKey:'^selected', height:'330px', frozenColumns:2, structpath:'struct'});
    root.div('^selected', {mask:'Selected Bag key: %s', margin_top:'12px'});
}
""")


case('grid', 'Calculated structure fields',
     'Change VAT or row 2 quantity. The ordinary grid stores chained Decimal results, row indexes, running totals and shares back into each Bag record.', """
from gramlot.grid import GridStruct

root.data('rows', Bag({
    'r001': Bag(dict(code='A01', quantity=2, unit_price=Decimal('1250.75'))),
    'r002': Bag(dict(code='B02', quantity=3, unit_price=Decimal('420.50'))),
    'r003': Bag(dict(code='C03', quantity=1, unit_price=Decimal('89.90'))),
}))
root.data('vat_rate', Decimal('22'))
root.numberTextBox(value='^vat_rate', dtype='N', places=2, lbl='VAT %')
root.button('Increase row 2 quantity', action="this.SET('rows.r002.quantity', 4);")
struct = GridStruct()
r = struct.view().rows()
r.cell('position', name='#', dtype='L', width=42, formula='#', calculated=True)
r.cell('code', name='Code', dtype='T', width='72px')
r.cell('quantity', name='Qty', dtype='L', width=56)
r.cell('unit_price', name='Unit price', dtype='N', width=100, places=2)
r.cell('net', name='Net', dtype='N', width=110, places=2,
       formula='quantity * unit_price', calculated=True)
r.cell('vat', name='VAT', dtype='N', width=100, places=2,
       formula='net * vat_rate / 100', formula_vat_rate='^vat_rate', calculated=True)
r.cell('total', name='Total', dtype='N', width=110, places=2,
       formula='net + vat', calculated=True)
r.cell('running', name='Running', dtype='N', width=120, places=2,
       formula='+=total', calculated=True)
r.cell('share', name='Share %', dtype='N', width=90, places=2,
       formula='%=total', calculated=True)
root.data('struct', struct)
root.grid(store='^rows', structpath='struct', height='180px', frozenColumns=2,
          margin_top='12px')
""", """
import {Bag} from 'genro-bag-js';
import {GridStruct} from 'gramlot-dom';

export function build(root) {
    const rows = new Bag();
    for (const [key, code, quantity, unitPrice] of [
        ['r001', 'A01', 2, 1250.75], ['r002', 'B02', 3, 420.50], ['r003', 'C03', 1, 89.90],
    ]) {
        const record = new Bag();
        record.setItem('code', code); record.setItem('quantity', quantity); record.setItem('unit_price', unitPrice);
        rows.setItem(key, record);
    }
    root.data('rows', rows);
    root.data('vat_rate', 22);
    root.numberTextBox({value:'^vat_rate', dtype:'N', places:2, lbl:'VAT %'});
    root.button('Increase row 2 quantity', {action:"this.SET('rows.r002.quantity', 4);"});
    const struct = new GridStruct();
    const r = struct.view().rows();
    r.cell('position', {name:'#', dtype:'L', width:42, formula:'#', calculated:true});
    r.cell('code', {name:'Code', dtype:'T', width:'72px'});
    r.cell('quantity', {name:'Qty', dtype:'L', width:56});
    r.cell('unit_price', {name:'Unit price', dtype:'N', width:100, places:2});
    r.cell('net', {name:'Net', dtype:'N', width:110, places:2, formula:'quantity * unit_price', calculated:true});
    r.cell('vat', {name:'VAT', dtype:'N', width:100, places:2, formula:'net * vat_rate / 100', formula_vat_rate:'^vat_rate', calculated:true});
    r.cell('total', {name:'Total', dtype:'N', width:110, places:2, formula:'net + vat', calculated:true});
    r.cell('running', {name:'Running', dtype:'N', width:120, places:2, formula:'+=total', calculated:true});
    r.cell('share', {name:'Share %', dtype:'N', width:90, places:2, formula:'%=total', calculated:true});
    root.data('struct', struct);
    root.grid({store:'^rows', structpath:'struct', height:'180px', frozenColumns:2, margin_top:'12px'});
}
""")


for resolver, title, fixture in (
    ('openApiResolver', 'OpenAPI URL resolver', 'openapi-example.json'),
    ('urlResolver', 'JSON URL resolver', 'contacts-example.json'),
):
    case('storeTree', title,
         'Change the URL and leave the field, or reload. The loaded result is a Data Bag. OpenAPI operations are descriptions; browsing never invokes endpoints.', f"""
root.data('sourceUrl', '/assets/{fixture}')
root.data('reload', 0)
root.textBox(value='^sourceUrl', lbl='JSON URL', width='100%')
root.button('Reload', action="this.SET('reload', this.GET('reload') + 1);", margin_top='8px')
root.{resolver}('result', url='^sourceUrl', reload='^reload', status='requestState', timeout=30)
root.div('^requestState.state', mask='Request: %s', margin_top='8px')
root.div('^requestState.error', color='#9b2929')
root.storeTree(store='^result', labelAttribute='caption', height='320px')
""")


def prepare(output, catalogue):
    """Generate executable recipe files and navigation from the actual catalogue."""
    lessons = []
    for collection in catalogue['collections']:
        for component in collection['components']:
            name = component['name']
            if name == 'dbSelect':
                # Server-only example is hosted at /database/states/, not in a standalone frame.
                continue
            if name not in CASES:
                raise ValueError(f'Missing gallery cases for {name}')
            base = f"gallery/{collection['name']}/{name}"
            examples = []
            has_javascript = any(item[3] for item in CASES[name])
            for index, (title, expected, body, javascript) in enumerate(CASES[name], 1):
                case_base = base + '/attributes' if name == 'grid' and index == 3 else base
                folder = output / case_base / str(index)
                folder.mkdir(parents=True, exist_ok=True)
                source = ('from datetime import date, time\nfrom decimal import Decimal\n'
                          'from genro_bag import Bag\nfrom gramlot.page import WebPage\n\n\n'
                          'class Page(WebPage):\n    def main(self, root):\n' + textwrap.indent(body, '        ') + '\n')
                (folder / 'recipe.py').write_text(source)
                if has_javascript:
                    if javascript is None:
                        raise ValueError(f'Missing JavaScript parity case for {name}/{index}')
                    (folder / 'recipe.js').write_text(javascript + '\n')
                examples.append(dict(path=str(index), title=title, description='Check: ' + expected))
            lessons.append(dict(slug=name, title=name, group=collection['name'], kind='gallery',
                description=f"{len(examples)} independent manual checks for {name}. Each case has its own Data and Source.",
                languages=['python', 'javascript'] if has_javascript else ['python'],
                inspector=True, examples=examples,
                _base=base, _folder=str(output/base), _gallery=True,
                editor_collection=name == 'codeMirror'))
            if name == 'grid':
                small = lessons[-1]
                large = dict(small, slug='grid-attributes', title='Grid — 5,000 rows · attributes',
                             examples=examples[2:3], _base=base+'/attributes',
                             _folder=str(output / (base+'/attributes')),
                             description='Large resident dataset: 5,000 rows stored in node attributes, without nested record Bags.')
                small.update(title='Grid — 50 rows · Bag', examples=examples[:2] + examples[3:],
                             description='Small datasets: 50 Bag-valued rows, stable identity and calculated legacy structures.')
                lessons.append(large)
    return lessons
