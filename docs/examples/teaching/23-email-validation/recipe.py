from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        field = root.textBox(value='^email', lbl='Email')
        field.validate(notnull=True, email=True, email_iswarning=False)
        root.p('^email', mask='Data: %s')
