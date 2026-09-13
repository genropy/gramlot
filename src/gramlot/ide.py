"""Python page composition for the shared IDE and named filesystem workspaces."""
from .filesystem import FileSystemPageMixin
from .page import source


class IdePageMixin(FileSystemPageMixin):
    """Combine with a host page; expose only named, application-configured roots."""
    filesystem_labels = {}

    def main(self, root):
        names = list(self.filesystem_roots)
        root.data('workspace', names[0] if names else '')
        layout = root.borderContainer(height='100vh')
        header = layout.contentPane(region='top', padding='12px 18px', background='#eef2f6')
        header.h2('Gramlot IDE', margin='0 0 8px')
        header.filteringSelect(value='^workspace', lbl='Workspace',
            values=','.join(f'{name}:{self.filesystem_labels.get(name, name)}' for name in names))
        header.p('Open a file from the tree. Unlock it to edit, then Save or Revert.',
                 font_size='13px', margin='8px 0 0')
        center = layout.contentPane(region='center', height='100%', min_height='0')
        center.remote(self.ide_workspace, workspace='^workspace')

    @source
    def ide_workspace(self, root, workspace=''):
        if not workspace:
            root.p('No workspace configured.')
            return
        self._directory_resolver(workspace)
        # Use separate Data scopes so switching roots preserves each document set.
        key = workspace.encode('utf-8').hex()
        root.gramlotIde(root=workspace, writable=self.filesystem_can_write(workspace),
                        datapath=f'ide.w_{key}', height='100%',
                        style='--ide-tree-width:280px')
