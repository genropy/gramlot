# Django customer example

A normal Django project hosting a Python Gramlot page with an ORM-backed grid and
a permission-checked, transactional city update. Application UI, state and RPC
use Gramlot declarations; Django's own admin supplies the host login screen.

Install the local Gramlot wheel with the `django` extra (the adapter is not yet
in a published release), then run from this directory:

```sh
python manage.py migrate
python manage.py shell -c "from gramlot_demo.models import Customer; Customer.objects.get_or_create(name='Ada', defaults={'city': 'Rome'})"
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8064
```

Visit `/admin/` and sign in with your local superuser. Then open
`http://127.0.0.1:8064/ui/customers/`, select Ada, enter a new city and click **Save
city**. The grid reloads from the database. Anonymous users can read the grid;
saving requires `gramlot_demo.change_customer`. A superuser has that permission.

The SQLite file stays beside this example and is ignored by Git. To isolate a
run, set `GRAMLOT_DJANGO_DB` to another local SQLite path. The settings are for
local demonstration, not a deployment configuration.

See [the adapter guide](../../django.md) for existing-project integration,
authentication, CSRF, typed selections and lifecycle limits.
