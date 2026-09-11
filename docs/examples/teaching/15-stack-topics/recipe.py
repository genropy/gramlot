from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('current', 'details')
        root.data('message', 'Waiting for page visibility')
        root.data('visits', 0)
        root.stackButtons(stackNodeId='pages')
        stack = root.stackContainer(nodeId='pages', selectedPage='^current',
                                    height='110px', margin_top='12px')
        stack.contentPane(pageName='details', title='Details').div('Customer details')
        stack.contentPane(pageName='history', title='History').div('Customer history')
        root.button('Open history via publish',
                    action="genro.publish('pages_switchPage', 'history');")
        root.button('Previous page',
                    action="genro.publish('pages_switchPage', '*prev*');")
        root.dataController("""
            this.SET('message', 'Visible page: ' + pageName);
            if (pageName === 'history') this.SET('visits', visits + 1);
        """, subscribe_pages_showing=True, visits='=visits')
        result = root.groupBox(lbl='Selection and event result', margin_top='20px')
        result.div('^current', mask='Bound selectedPage: %s')
        result.div('^message')
        result.div('^visits', mask='History activations: %s')
