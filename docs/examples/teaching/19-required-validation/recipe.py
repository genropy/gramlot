from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        field = root.textBox(value='^code', lbl='Code')
        field.validate(notnull=True, len='3:8')
        root.p('^code', mask='Data: %s')
