# Bakery integration overlay

Source-only snapshot of the owner-requested local Bakery PoC. These files are
an overlay for the supplied Bakerydemo Django 6 / Wagtail 8 checkout, not a
standalone application. Database, media, accounts and the Bakery source tree
are deliberately absent. Apply to a disposable copy of that checkout, install
the Gramlot wheel with its Django extra, and use settings
`bakerydemo.settings.gramlot`. The local dashboard entry is `/spa_admin/`.

The snapshot retains the host menu/template customizations, public explorer,
schema explorer and table editor pages. See the Django adapter checkpoint for
verified behavior and limitations.
