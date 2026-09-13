"""Read-only directory providers independent of database and host adapters."""
from pathlib import Path
import hashlib
import os
import tempfile
import threading

from genro_bag import Bag

from .page import endpoint
from .resolvers import RpcResolver

_write_lock = threading.Lock()


class DirectoryResolver:
    """List one level below a server-configured root; never follow symlinks."""

    def __init__(self, root, *, name='files', method='directory_tree'):
        self.root = Path(root).resolve(strict=True)
        if not self.root.is_dir():
            raise ValueError('Directory root must be a directory')
        self.name = name
        self.method = method

    def rows(self, path=''):
        if not isinstance(path, str) or '\\' in path:
            raise ValueError('Expected a relative POSIX directory path')
        relative = Path(path)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Path must remain below the configured directory')
        directory = self.root
        for part in relative.parts:
            directory = directory / part
            if directory.is_symlink():
                raise ValueError('Symbolic links are not exposed')
        resolved = directory.resolve(strict=True)
        if not resolved.is_relative_to(self.root) or not resolved.is_dir():
            raise ValueError('Path is not an exposed directory')
        rows = []
        for item in resolved.iterdir():
            if item.is_symlink():
                continue
            stat = item.stat()
            if not item.is_file() and not item.is_dir():
                continue
            rows.append(dict(path=item.relative_to(self.root).as_posix(),
                             caption=item.name, is_directory=item.is_dir(),
                             size=stat.st_size, modified=stat.st_mtime))
        return sorted(rows, key=lambda row: (not row['is_directory'], row['caption'].casefold(), row['caption']))

    def load(self, path=''):
        result = Bag()
        for row in self.rows(path):
            value = RpcResolver(method=self.method, params=dict(root=self.name, path=row['path'])) if row['is_directory'] else None
            result.set_item('n_' + row['caption'].encode('utf-8').hex(), value, _attributes=row)
        return result


class FileSystemPageMixin:
    """Expose only explicitly configured named directories on a Gramlot WebPage."""

    filesystem_roots = {}
    filesystem_writable_roots = ()
    filesystem_max_bytes = 2 * 1024 * 1024

    def _document_path(self, root, path):
        resolver = self._directory_resolver(root)
        if not isinstance(path, str) or not path or '\\' in path:
            raise ValueError('Expected a relative file path')
        relative = Path(path)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('File must remain below the configured root')
        current = resolver.root
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise ValueError('Symbolic links are not exposed')
        if not current.resolve(strict=True).is_relative_to(resolver.root) or not current.is_file():
            raise ValueError('Not an exposed file')
        return current

    @endpoint
    def document_read(self, root, path):
        file = self._document_path(root, path)
        with file.open('rb') as stream:
            raw = stream.read(self.filesystem_max_bytes + 1)
        if len(raw) > self.filesystem_max_bytes or b'\0' in raw:
            raise ValueError('Only bounded UTF-8 text documents are supported')
        return dict(path=path, content=raw.decode('utf-8'), revision=hashlib.sha256(raw).hexdigest(),
                    writable=self.filesystem_can_write(root),
                    language={'.py':'python', '.js':'javascript', '.css':'css', '.html':'html',
                              '.xml':'xml', '.md':'markdown', '.json':'json'}.get(file.suffix.lower(), 'text'))

    @endpoint
    def document_save(self, root, path, content, revision):
        if not self.filesystem_can_write(root):
            raise PermissionError('Workspace is read-only')
        if not isinstance(content, str) or '\0' in content:
            raise ValueError('Expected text content')
        raw = content.encode('utf-8')
        if len(raw) > self.filesystem_max_bytes:
            raise ValueError('Document is too large')
        with _write_lock:
            file = self._document_path(root, path)
            with file.open('rb') as stream:
                current = stream.read(self.filesystem_max_bytes + 1)
            if hashlib.sha256(current).hexdigest() != revision:
                raise ValueError('File changed on disk; reopen or reconcile before saving')
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(dir=file.parent, delete=False) as stream:
                    temporary = stream.name
                    stream.write(raw)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.chmod(temporary, file.stat().st_mode & 0o777)
                os.replace(temporary, file)
            finally:
                if temporary and os.path.exists(temporary):
                    os.unlink(temporary)
        return dict(revision=hashlib.sha256(raw).hexdigest())

    def filesystem_can_write(self, root):
        return root in self.filesystem_writable_roots

    def _directory_resolver(self, root):
        if not isinstance(root, str) or root not in self.filesystem_roots:
            raise ValueError('Unknown filesystem root')
        return DirectoryResolver(self.filesystem_roots[root], name=root)

    @endpoint
    def directory_tree(self, root, path=''):
        return self._directory_resolver(root).load(path)

    @endpoint
    def directory_selection(self, root, path=''):
        rows = self._directory_resolver(root).rows(path)
        return dict(rows=rows, identifier='path', metadata=dict(totalrows=len(rows)))
