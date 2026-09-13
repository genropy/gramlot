"""Django delivery of packaged runtime files, without FastAPI or static discovery."""
from pathlib import Path
from django.http import FileResponse, Http404
from django.urls import path
from django.views.decorators.http import require_safe
from gramlot.contrib._shared.runtime import (
    PACKAGE_ASSET_DIRECTORIES, RuntimeAssets as SharedRuntimeAssets,
)


class RuntimeAssets(SharedRuntimeAssets):
    @property
    def urls(self):
        if self.browser_manifest is not None:
            roots = {'': self.browser_directory}
        else:
            roots = {name: self.package_directory / relative
                     for name, relative in PACKAGE_ASSET_DIRECTORIES.items()}
            roots['common'] = self.frontend_directory
        # The collection URLconf is already mounted at self.prefix.
        base = self.base_url[len(self.prefix) + 1:]
        return [path(base + (name + '/' if name else '') + '<path:asset>',
                     self.asset_view(directory), name=f'runtime-{name or "browser"}')
                for name, directory in roots.items()]

    def asset_view(self, directory):
        directory = Path(directory).resolve()
        @require_safe
        def serve(request, asset):
            target = (directory / asset).resolve()
            if not target.is_relative_to(directory) or not target.is_file():
                raise Http404
            response = FileResponse(target.open('rb'))
            if target.suffix in ('.js', '.mjs'):
                response['Content-Type'] = 'text/javascript'
            if self.browser_manifest is not None:
                response['Cache-Control'] = 'public, max-age=31536000, immutable'
            else:
                response['Cache-Control'] = 'no-cache'
            return response
        return serve
