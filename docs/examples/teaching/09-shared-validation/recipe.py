from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        email_validation = {
            "notnull": True,
            "email": True,
            "email_warning": "Check address",
        }
        root.data("contacts.primary", "not-an-address")
        root.data("contacts.backup", "team@example.com")
        root.textBox(value="^contacts.primary", lbl="Primary email").validate(
            **email_validation
        )
        root.textBox(value="^contacts.backup", lbl="Backup email").validate(
            **email_validation
        )
