from decimal import Decimal

from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('amount', Decimal('1234.56789'))
        root.data('places', 2)
        root.data('number_format', 'decimal')
        root.data('number_locale', 'en-US')
        options = root.formlet(cols=1)
        options.comboBox(value='^number_format', lbl='Format',
                         values='decimal\npercent\nscientific\n0.00\n#,##0.00\n#,##0.###')
        options.numberTextBox(value='^places', lbl='Decimal places',
                              dtype='L', min=0, max=20, step=1)
        options.comboBox(value='^number_locale', lbl='Locale',
                         values='en-US,it-IT,de-DE')
        root.numberTextBox(value='^amount', dtype='N', lbl='Amount',
                          format='^number_format', places='^places',
                          locale='^number_locale', margin_top='8px')
        result = root.groupBox(lbl='Result', margin_top='20px')
        result.div('^amount', format='^number_format', places='^places',
                   locale='^number_locale', mask='Displayed: %s')
        result.div('^amount', mask='Stored: %s')
