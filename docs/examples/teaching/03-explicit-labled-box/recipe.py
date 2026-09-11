from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        box = root.labledBox(label="Name")
        box.textBox(value="Ada")
