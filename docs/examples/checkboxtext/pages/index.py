"""General multi-choice control; all interactions use Gramlot Source and Data."""
from genro_bag import Bag
from gramlot.page import WebPage


class Page(WebPage):
    title = 'checkBoxText'
    example_view = True

    def main(self, root):
        root.h2('checkBoxText — multiple selection')
        root.p('Choose several values without closing the popup. Escape closes it; Tab moves between choices. Arrow keys move focus.')
        root.data('selection', None)
        root.data('locked', False)
        root.data('disabled', False)
        root.data('string_options', 'cost:Cost,revenue:Revenue,profit:Profit,margin:Margin,orders:Orders,units:Units,customers:Customers,returns:Returns,tax:Tax,shipping:Shipping')
        fields = root.div(class_='example-fields')
        fields.checkBoxText(value='^selection', values='^string_options', popup=True,
                          cols=1, lbl='Datasets', width='300px',
                          disabled='^disabled', readonly='^locked')
        fields.checkBoxText(value='^selection', values='^string_options',
                          cols=2, lbl='Inline datasets',
                          disabled='^disabled', readonly='^locked')
        editor = root.div(class_='example-fields')
        editor.textBox(value='^selection', lbl='Edit selected codes',
                       placeholder='cost,revenue,shipping', live=True, width='100%')
        readout = root.div(class_='example-readout')
        readout.div('^selection', mask='Codes: %s')
        readout.div('^selection?_displayedValue', mask='Labels: %s')
        actions = root.div(class_='example-actions')
        actions.button('Select Revenue externally', action="this.SET('selection', 'revenue');")
        actions.button('Clear externally', action="this.SET('selection', null);")
        actions.button('Rename Cost', action="this.SET('string_options', this.GET('string_options').replace('cost:Cost', 'cost:Operating cost'));")
        state = root.div(class_='example-state')
        state.checkBox(checked='^locked', label='Readonly')
        state.checkBox(checked='^disabled', label='Disabled')

        options = Bag()
        options.set_item('first', None, code='cost', caption='Cost')
        options.set_item('second', None, code='revenue', caption='Revenue')
        replacement = Bag()
        replacement.set_item('second', None, code='revenue', caption='Sales revenue')
        replacement.set_item('third', None, code='profit', caption='Profit')
        root.data('options', options)
        root.data('replacement', replacement)
        root.data('bag_selection', 'cost')
        section = root.div(class_='example-section')
        section.h3('Options from a Bag')
        section.checkBoxText(value='^bag_selection', values='^options', identifier='code',
                          labelAttribute='caption', popup=True, cols=1, lbl='Bag datasets', width='300px')
        readout = section.div(class_='example-readout')
        readout.div('^bag_selection', mask='Bag codes: %s')
        readout.div('^bag_selection?_displayedValue', mask='Bag labels: %s')
        actions = section.div(class_='example-actions')
        actions.button('Rename Bag option', action="this.GET('options').getNode('first').setAttr({caption:'Costs renamed'});")
        actions.button('Replace options Bag', action="this.SET('options', this.GET('replacement').deepcopy());")
        actions.button('Select both externally', action="this.SET('bag_selection', 'revenue,profit');")
        root.p('When an option disappears, its selected code is retained and displayed literally until explicitly cleared. No text filtering in this version.', class_='example-note')
