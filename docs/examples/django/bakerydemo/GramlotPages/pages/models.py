"""Staff-only PoC: browse the complete installed Django model registry."""
from django.apps import apps
from gramlot.contrib.django import DjangoPage


class Page(DjangoPage):
    login_required = True
    model_roots = ('*',)
    source_inspection = False

    def main(self, root):
        root.styleSheet('''
            body{margin:0;background:#f5f6f8;color:#23303b;font:15px system-ui,sans-serif}
            .schema-shell{max-width:1200px;margin:0 auto;padding:30px}
            .schema-links{display:flex;gap:24px;margin-bottom:30px}
            .schema-links a{color:#356c85;text-decoration:none}
            h1{font-size:30px;margin:0 0 12px}.schema-hint{color:#617180;line-height:1.6}
            .schema-tree{background:white;border:1px solid #d5dce3;border-radius:8px;
                padding:20px;max-height:68vh;overflow:auto;margin:24px 0}
            .schema-path{font:13px ui-monospace,monospace;overflow-wrap:anywhere}
        ''')
        shell = root.div(class_='schema-shell')
        links = shell.nav(class_='schema-links', aria_label='Administration navigation')
        links.a('← Bakery site', href='/')
        links.a('Django admin', href='/django-admin/')
        links.a('Wagtail admin', href='/admin/')
        shell.h1('Django model explorer')
        models = list(apps.get_models())
        shell.p(f'{len(models)} models · {len({model._meta.app_label for model in models})} apps',
                class_='schema-hint')
        shell.p('Open an app, then a model. Expand a relation to explore the related model. '
                'This tree describes the schema; it does not display or edit database records.',
                class_='schema-hint')
        shell.dataRpc('schema', self.model_tree, _on_start=True,
                      _onError='this.SET("status", error.message);')
        shell.p('^status', role='status')
        tree = shell.div(class_='schema-tree')
        tree.storeTree(store='^schema', selectedPath='^selected', typeAttribute='dtype',
                       relationAttribute='relation_direction')
        shell.p('^selected', mask='Selected path: %s', class_='schema-path')
        shell.p('A / T: text · L: integer · B: boolean · N: decimal · D / DH: date / datetime '
                '· JS: JSON · O: relation or custom field', class_='schema-hint')
