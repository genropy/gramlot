"""Curated, independent manual checks, grouped by the production catalogue.

Each case is (title, expected behavior, Python body). Cases share no runtime Data.
The build adds only imports and the WebPage wrapper; the displayed code is executed.
"""
import textwrap

CASES = {}


def case(component, title, expected, body):
    CASES.setdefault(component, []).append((title, expected, textwrap.dedent(body).strip()))


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


def prepare(output, catalogue):
    """Generate executable recipe files and navigation from the actual catalogue."""
    lessons = []
    for collection in catalogue['collections']:
        for component in collection['components']:
            name = component['name']
            if name not in CASES:
                raise ValueError(f'Missing gallery cases for {name}')
            base = f"gallery/{collection['name']}/{name}"
            examples = []
            for index, (title, expected, body) in enumerate(CASES[name], 1):
                folder = output / base / str(index)
                folder.mkdir(parents=True, exist_ok=True)
                source = ('from datetime import date, time\nfrom decimal import Decimal\n'
                          'from genro_bag import Bag\nfrom gramlot.page import WebPage\n\n\n'
                          'class Page(WebPage):\n    def main(self, root):\n' + textwrap.indent(body, '        ') + '\n')
                (folder / 'recipe.py').write_text(source)
                examples.append(dict(path=str(index), title=title, description='Check: ' + expected))
            lessons.append(dict(slug=name, title=name, group=collection['name'], kind='gallery',
                description=f"{len(examples)} independent manual checks for {name}. Each case has its own Data and Source.",
                languages=['python'], inspector=True, examples=examples,
                _base=base, _folder=str(output/base), _gallery=True,
                editor_collection=name == 'codeMirror'))
    return lessons
