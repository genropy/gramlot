from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.p("Enter 3 to 8 characters, then leave the field.")
        root.data("validation.code", "ABC")
        field = root.textBox(value="^validation.code", lbl="Code")
        field.validate(notnull=True, len="3:8")
