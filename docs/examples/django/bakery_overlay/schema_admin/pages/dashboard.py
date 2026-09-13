"""Python-authored administration workspace with persistent iframe tabs."""
from genro_bag import Bag
from gramlot.contrib.django import DjangoPage


class Page(DjangoPage):
    login_required = True
    source_inspection = False

    def main(self, root):
        root.styleSheet('''
            html,body{margin:0;height:100%;font:14px system-ui;color:#243746;background:#f5f7fa}
            .spa-header{display:flex;align-items:center;gap:24px;padding:0 20px;
                background:#243746;color:white;box-sizing:border-box}
            .spa-header a{color:#dae8ee;text-decoration:none;margin-left:auto}
            .spa-nav{padding:18px 12px;box-sizing:border-box;background:#eef2f6;overflow:auto}
            .spa-nav h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#647687}
            .spa-frame{display:block;width:100%;height:100%;border:0;background:white}
            .spa-welcome{padding:32px;line-height:1.6;max-width:680px}
        ''')
        navigation = Bag()
        navigation.set_item('workspace', Bag(), caption='Workspace')
        destinations = [
            ('workspace.tables', 'tables', 'Tables', '/spa_admin/tables/'),
            ('workspace.models', 'models', 'Model Explorer', '/spa_admin/models/'),
            ('workspace.breads', 'breads', 'Breads grid', '/gramlot/breads/'),
            ('workspace.products', 'products', 'Product explorer', '/products/explore/'),
        ]
        for path, key, title, url in destinations:
            navigation.set_item(path, None, caption=title)
            root.data(f'tabs.{key}.hidden', True)
            root.data(f'tabs.{key}.url', 'about:blank')
            root.dataController('''
if (selection === target) {
    if (this.GET(urlPath) === 'about:blank') this.SET(urlPath, url);
    this.SET(hiddenPath, false);
    this.SET('activePage', page);
}
''', selection='^navigationSelection', target=path, page=key, url=url,
                urlPath=f'tabs.{key}.url', hiddenPath=f'tabs.{key}.hidden')
        root.data('navigation', navigation)
        root.data('activePage', 'welcome')
        layout = root.borderContainer(height='100vh')
        header = layout.contentPane(region='top', height='56px', class_='spa-header')
        header.strong('SPA admin')
        header.span('Gramlot workspace')
        header.a('Bakery site ↗', href='/', target='_blank', rel='noopener')
        nav = layout.contentPane(region='left', width='260px', splitter=True, class_='spa-nav')
        nav.h3('Navigation')
        nav.storeTree(store='^navigation', selectedPath='^navigationSelection', labelAttribute='caption')
        center = layout.contentPane(region='center', height='100%', min_width='0', min_height='0')
        tabs = center.tabContainer(selectedPage='^activePage', height='100%',
                                   style='--tab-pane-padding:0;')
        welcome = tabs.contentPane(pageName='welcome', title='Dashboard', height='100%')
        intro = welcome.div(class_='spa-welcome')
        intro.h1('Administration workspace')
        intro.p('Choose a page from the navigation tree. Each page opens in its own tab.')
        intro.p('Open tabs retain their state when you switch pages. Model Explorer is available under Workspace.')
        for path, key, title, url in destinations:
            pane = tabs.contentPane(pageName=key, title=title, height='100%',
                                    hidden=f'^tabs.{key}.hidden')
            pane.iframe(src=f'^tabs.{key}.url', title=title, class_='spa-frame')
