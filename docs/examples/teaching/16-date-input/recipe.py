from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.dateTextBox(value='^day', lbl='Date')
        root.p('^day', dtype='D', format='dd/MM/yyyy')
