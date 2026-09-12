from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        field = root.numberTextBox(value='^quantity', lbl='Quantity')
        field.validate(notnull=True, min=1, max=10)
        root.p('^quantity', mask='Data: %s')
