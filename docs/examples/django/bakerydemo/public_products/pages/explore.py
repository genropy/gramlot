"""Public bakery catalogue: linked resident grids and reactive product details."""
from collections import defaultdict
from pathlib import Path
from django.http import Http404
from genro_bag import Bag
from wagtail.models import Site
from bakerydemo.breads.models import BreadPage
from gramlot.contrib.django import DjangoPage


class Page(DjangoPage):
    source_inspection = False

    def main(self, root):
        site = Site.find_for_request(self.request)
        if site is None:
            raise Http404('No bakery site')
        products = (BreadPage.objects.descendant_of(site.root_page).live().public()
                    .select_related('image', 'origin', 'bread_type')
                    .prefetch_related('ingredients').order_by('title'))
        all_rows, groups, details = Bag(), defaultdict(Bag), Bag()
        category_names = {}
        for bread in products:
            key = f'bread_{bread.pk}'
            category = f'type_{bread.bread_type_id or 0}'
            category_names[category] = str(bread.bread_type) if bread.bread_type else 'Other breads'
            row = Bag({'name': bread.title, 'origin': str(bread.origin) if bread.origin else '—'})
            all_rows.set_item(key, row)
            groups[category].set_item(key, row.deepcopy())
            image_url = ''
            if bread.image:
                try:
                    image_url = bread.image.get_rendition('fill-900x650').url
                except FileNotFoundError:
                    pass
            details.set_item(key, Bag({
                'title': bread.title, 'origin': row.get_item('origin'),
                'category': category_names[category], 'description': bread.introduction,
                'image': image_url, 'no_image': not bool(image_url),
                'ingredients': ', '.join(item.name for item in bread.ingredients.all()) or 'Not specified',
                'url': bread.get_url(request=self.request) or '', 'no_link': not bool(bread.get_url(request=self.request)),
            }))
        categories = Bag()
        categories.set_item('all', Bag({'name': 'All breads', 'count': len(all_rows)}))
        catalogue = Bag()
        catalogue.set_item('all', all_rows)
        for key in sorted(groups, key=lambda item: category_names[item]):
            categories.set_item(key, Bag({'name': category_names[key], 'count': len(groups[key])}))
            catalogue.set_item(key, groups[key])
        first_key = next(iter(all_rows)).label if len(all_rows) else None
        empty = Bag({'title': 'No breads available', 'description': 'Please check back soon.',
                     'image': '', 'no_image': True, 'ingredients': '—', 'category': '',
                     'origin': '', 'url': '', 'no_link': True})
        root.data('categories', categories)
        root.data('catalogue', catalogue)
        root.data('details', details)
        root.data('empty', empty)
        root.data('category', 'all')
        root.data('products', all_rows.deepcopy())
        root.data('selected', first_key)
        root.data('detail', details.get_item(first_key).deepcopy() if first_key else empty.deepcopy())
        root.dataController(
            'const rows = catalogue.getItem(category) || this.GET("empty_rows"); '
            'this.SET("products", rows.deepcopy()); '
            'this.SET("selected", rows.getNodes()[0]?.label || null);',
            category='^category', catalogue='=catalogue',
        )
        root.data('empty_rows', Bag())
        root.dataController(
            'this.SET("detail", ((selected && details.getItem(selected)) || this.GET("empty")).deepcopy());',
            selected='^selected', details='=details',
        )
        root.styleSheet(Path(__file__).with_name('explore.css').read_text())
        root.h1('Explore our breads', class_='explorer-title')
        root.p('A world of bread, one selection at a time.', class_='explorer-intro')
        layout = root.div(class_='product-explorer')
        filters = layout.div(role='region', class_='explorer-types', aria_label='Bread types')
        filters.h2('Find your bread')
        filters.p('Choose a style, then explore our breads.', class_='explorer-hint')
        grid = filters.quickGrid(value='^categories', selectedKey='^category', height='270px',
                                 aria_label='Bread types')
        grid.column('name', name='Style', width=155)
        grid.column('count', name='Breads', width=60)
        listing = layout.div(role='region', class_='explorer-list', aria_label='Products')
        listing.h2('Our breads')
        listing.p('Select a row · use ↑ ↓ to browse', class_='explorer-hint')
        grid = listing.quickGrid(value='^products', selectedKey='^selected', height='405px',
                                 aria_label='Products')
        grid.column('name', name='Bread', width=170)
        grid.column('origin', name='Origin', width=135)
        panel = layout.div(role='region', class_='explorer-detail', aria_label='Selected bread')
        panel.img(src='^detail.image', alt='^detail.title', hidden='^detail.no_image',
                  class_='explorer-photo')
        panel.p('^detail.category', class_='explorer-eyebrow')
        panel.h2('^detail.title', id='product-title', aria_live='polite')
        panel.p('^detail.description', class_='explorer-description')
        panel.h3('Ingredients')
        panel.p('^detail.ingredients', id='product-ingredients')
        panel.a('Discover this bread →', href='^detail.url', hidden='^detail.no_link',
                class_='explorer-link')
