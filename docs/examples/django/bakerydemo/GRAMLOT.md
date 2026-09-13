# Adapted Bakerydemo for Gramlot

Complete local Bakerydemo source snapshot, including media and the Gramlot
public explorer, SPA dashboard, schema browser and table editor. Upstream
licensing is retained in LICENSE. This is a Django 6 / Wagtail 8 development PoC.

Install this directory's requirements and a Gramlot build with its Django extra.
Restore the compressed SQLite SQL dump from this directory:

```sh
unzip -p bakerydemo.sql.zip bakerydemo.sql | sqlite3 bakerydemodb
python manage.py runserver 127.0.0.1:8063 --settings=bakerydemo.settings.gramlot
```

Restore into a new, empty database file. Open `/spa_admin/` for the dashboard
and `/products/explore/` for the public product explorer. The supplied upstream
demo account is admin / changeme. This is a local demo, not production settings.

The dump was made from a consistent SQLite backup and restored into a fresh
database to check integrity, foreign keys and all table row counts. Active
Django sessions were cleared in the backup only. Local `.env`,
`settings/local.py`, environment/cache files and the live database are excluded.
The source database was not modified.
