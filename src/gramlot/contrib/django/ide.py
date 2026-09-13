"""Django authorization for the host-independent Gramlot IDE page."""
from django.core.exceptions import PermissionDenied
from gramlot.ide import IdePageMixin
from gramlot.page import endpoint
from .page import DjangoPage


class DjangoIdePage(IdePageMixin, DjangoPage):
    login_required = True
    source_inspection = False

    def check_ide_access(self):
        user = getattr(self.request, 'user', None)
        # Editing Python/templates changes application behavior, beyond model editing.
        if not user or not user.is_active or not user.is_staff or not user.is_superuser:
            raise PermissionDenied('IDE access requires an active staff superuser')

    def main(self, root):
        self.check_ide_access()
        return super().main(root)

    def _directory_resolver(self, root):
        self.check_ide_access()
        return super()._directory_resolver(root)

    def filesystem_can_write(self, root):
        self.check_ide_access()
        return super().filesystem_can_write(root)


    def template_preview_context(self, root, path):
        """Override with application sample data; no implicit record access."""
        return {}

    @endpoint
    def document_preview(self, root, path, content):
        from django.template import engines
        from html import escape
        self.check_ide_access()
        file = self._document_path(root, path)
        if file.suffix.lower() != '.html' or not isinstance(content, str):
            raise ValueError('Preview requires an HTML template')
        if len(content.encode('utf-8')) > self.filesystem_max_bytes:
            raise ValueError('Template is too large')
        context = self.template_preview_context(root, path)
        html = engines['django'].from_string(content).render(context, request=self.request)
        base = '<base href="' + escape(self.request.build_absolute_uri('/'), quote=True) + '">'
        if '<head>' in html:
            html = html.replace('<head>', '<head>' + base, 1)
        else:
            html = base + html
        return {'html': html}
