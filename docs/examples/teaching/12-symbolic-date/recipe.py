from datetime import date

from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('selection.day', date(2026, 9, 1))
        root.dateTextBox(value='^selection.day', symbolic=True, locale='it-IT',
                         workdate='2026-09-11', lbl='Date', dtype='D',
                         placeholder='es. oggi+15')
        root.data('date_format', 'long')
        root.data('display_locale', 'it-IT')
        root.data('date_mask', 'Selected: %s')
        root.comboBox(value='^date_format', lbl='Format',
                             values='short,medium,long,full,dd/MM/yyyy')
        root.filteringSelect(value='^display_locale', lbl='Locale',
                             values='it-IT:Italiano,en-GB:English')
        root.textBox(value='^date_mask', lbl='Mask')
        result = root.groupBox(lbl='Result', datapath='selection',
                               copy=True, draggable=True, margin_top='20px')
        result.div('^.day', format='^date_format', locale='^display_locale',
                 mask='^date_mask', dtype='D')
