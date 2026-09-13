"""Read published Bakerydemo content through Django ORM and Gramlot."""
from bakerydemo.breads.models import BreadPage
from gramlot.contrib.django import DjangoPage
from gramlot.grid import GridStruct
from gramlot.page import endpoint


class Page(DjangoPage):
    title = 'Bakery breads'
    example_view = True

    def main(self, root):
        root.h1('Bakerydemo · Gramlot')
        root.p('Published breads from the existing Wagtail application, through Django ORM.')
        root.data('status', 'Loading breads…')
        root.button('Reload', fire='reload')
        root.p('^status', id='bread-status')
        root.rpcStore(self.breads, storeCode='breads', storepath='rows',
                      _identifier='id', _onStart=True, _fired='^reload',
                      _onResult='this.SET("status", result.rows.length + " breads loaded");',
                      _onError='this.SET("status", error.message);')
        struct = GridStruct()
        cells = struct.view().rows()
        cells.cell('id', name='ID', width=80)
        cells.cell('title', name='Bread', width=300)
        cells.cell('slug', name='Slug', width=300)
        root.data('struct', struct)
        root.grid(store='breads', structpath='struct', height='340px')

    @endpoint
    def breads(self):
        return self.selection_result(BreadPage.objects.live().public().order_by('title'),
                                     fields=['id', 'title', 'slug'])
