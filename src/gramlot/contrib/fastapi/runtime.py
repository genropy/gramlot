"""FastAPI delivery of the shared packaged browser runtime."""
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from gramlot.contrib._shared.runtime import RuntimeAssets as SharedRuntimeAssets
from gramlot.contrib._shared.runtime import PACKAGE_ASSET_DIRECTORIES

class BrowserStaticFiles(StaticFiles):
    """Only successful responses from an immutable build receive long caching."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        if response.status_code in (200, 206, 304):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response


class SourceStaticFiles(StaticFiles):
    """Development assets must be revalidated even within one host session."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers['Cache-Control'] = 'no-cache'
        return response


class RuntimeAssets(SharedRuntimeAssets):
    def mount(self, app: FastAPI) -> None:
        if self.browser_manifest is not None:
            app.mount(
                self.base_url.rstrip('/'),
                GZipMiddleware(BrowserStaticFiles(directory=self.browser_directory), minimum_size=500),
                name=f'{self.prefix}-browser',
            )
            return
        directories = {
            name: self.package_directory / relative_path
            for name, relative_path in PACKAGE_ASSET_DIRECTORIES.items()
        }
        directories['common'] = self.frontend_directory
        for name, directory in directories.items():
            app.mount(
                self.base_url + name,
                SourceStaticFiles(directory=directory),
                name=f'{self.prefix}-{name}',
            )
