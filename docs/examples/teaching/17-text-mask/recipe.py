from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.textBox(value='^name', lbl='Name', live=True)
        root.p('^name', mask='Hello, %s!')
        root.p('^name')
