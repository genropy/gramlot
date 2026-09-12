from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.textBox(value="^name", lbl="Name", live=True)
        root.dataController("this.SET('message', `Hello ${name}`)", name="^name")
        root.p("^message")
