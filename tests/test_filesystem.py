from pathlib import Path

import pytest

from gramlot.filesystem import DirectoryResolver, FileSystemPageMixin
from gramlot.page import WebPage
from gramlot.builder import GramlotBuilder


def test_directory_is_lazy_and_preserves_names(tmp_path):
    (tmp_path / 'nested').mkdir()
    (tmp_path / 'nested' / 'child.txt').write_text('child')
    (tmp_path / 'a.b.txt').write_text('hello')
    resolver = DirectoryResolver(tmp_path, name='demo')
    rows = resolver.rows()
    assert [row['caption'] for row in rows] == ['nested', 'a.b.txt']
    bag = resolver.load()
    directory, file = bag.nodes
    assert directory.resolver is not None
    assert directory.resolver.serialize()['kwargs']['params'] == {'root': 'demo', 'path': 'nested'}
    assert file.attr['path'] == 'a.b.txt'
    assert file.attr['size'] == 5
    assert resolver.rows('nested')[0]['caption'] == 'child.txt'


def test_directory_rejects_escape_and_omits_symlinks(tmp_path):
    root = tmp_path / 'root'
    root.mkdir()
    (root / 'escape').symlink_to(tmp_path, target_is_directory=True)
    resolver = DirectoryResolver(root)
    assert resolver.rows() == []
    for path in ('../', str(tmp_path), 'escape', 'escape/root'):
        with pytest.raises(ValueError):
            resolver.rows(path)
    class Page(FileSystemPageMixin, WebPage):
        filesystem_roots = {'files': root}
    with pytest.raises(ValueError):
        Page().directory_tree('unknown')


def test_store_authoring():
    root = GramlotBuilder().root
    assert root.selectionStore('lookup', storeCode='paged', storepath='rows', _identifier='id', chunkSize=10).node.attr['_chunkSize'] == 10
    assert root.fsStore(root='files', storeCode='files', storepath='files').node.attr['_storeType'] == 'FileSystem'
    form = root.form(formId='test', datapath='record')
    form.formStore('item', storepath='original')
    assert form.node.attr['storeType'] == 'item'
    with pytest.raises(TypeError):
        root.formStore()


def test_document_save_permissions_and_revision(tmp_path):
    file=tmp_path/'test.py'
    file.write_text('before',encoding='utf-8')
    class Page(FileSystemPageMixin, WebPage):
        filesystem_roots={'demo':tmp_path}
    page=Page()
    record=page.document_read('demo','test.py')
    assert record['content']=='before'
    with pytest.raises(PermissionError):
        page.document_save('demo','test.py','after',record['revision'])
    page.filesystem_writable_roots=('demo',)
    saved=page.document_save('demo','test.py','after',record['revision'])
    assert file.read_text()=='after'
    assert saved['revision']!=record['revision']
    with pytest.raises(ValueError,match='changed on disk'):
        page.document_save('demo','test.py','lost update',record['revision'])
    assert file.read_text()=='after'
    with pytest.raises(ValueError):
        page.document_read('demo','../test.py')
