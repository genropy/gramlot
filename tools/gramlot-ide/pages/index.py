"""Local-only IDE application; editing is opt-in per document."""
from hashlib import sha256
from pathlib import Path

from gramlot.filesystem import DirectoryResolver, FileSystemPageMixin
from gramlot.page import WebPage, source


class Page(FileSystemPageMixin, WebPage):
    def main(self, root):
        root.data('workspacePath', '')
        layout = root.borderContainer(height='calc(100vh - 16px)')
        header = layout.contentPane(region='top', padding='12px 16px',
                                    background='#f7f8fa', border_bottom='1px solid #d9dfe6')
        header.div('Gramlot IDE', font_size='19px', font_weight='600')
        header.p('Browse local files. Unlock a tab to edit; Save writes the file, Revert restores the last saved text.',
                 margin='5px 0 10px', color='#68717e', font_size='13px')
        header.textBox(value='^workspacePath', lbl='Folder path',
                       placeholder='/Users/yourname/Sviluppo/project',
                       width='min(800px, 90vw)')
        center = layout.contentPane(region='center', height='100%', min_height='0')
        center.remote(self.workspace, path='^workspacePath', _delay=1)

    def filesystem_can_write(self, root):
        self._directory_resolver(root)
        return True

    def _directory_resolver(self, root):
        # This autonomous local tool intentionally accepts user-selected folders.
        # Generic FileSystemPageMixin applications still use named allowlists.
        if not isinstance(root, str) or not root.strip():
            raise ValueError('Choose a folder')
        folder = Path(root).expanduser()
        if not folder.is_absolute():
            raise ValueError('Enter an absolute folder path')
        return DirectoryResolver(folder, name=str(folder.resolve()))

    @source
    def workspace(self, root, path=''):
        if not path or not path.strip():
            return
        try:
            resolver = self._directory_resolver(path.strip())
        except (OSError, ValueError) as error:
            root.p(str(error), color='#a04444', padding='12px')
            return
        folder = str(resolver.root)
        key = sha256(folder.encode()).hexdigest()
        root.gramlotIde(root=folder, datapath=f'workspaces.w_{key}', writable=True,
                        height='100%', style='--ide-tree-width:300px')
