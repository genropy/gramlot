from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.textBox(value="Write here")
