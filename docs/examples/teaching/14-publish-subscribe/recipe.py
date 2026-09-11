from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('name', 'Ada')
        root.data('message', 'Publish a greeting')
        root.data('count', 0)
        root.data('local_message', 'Publish from the button node')
        root.textBox(value='^name', lbl='Name')
        root.button('Publish greeting', name='=name',
                    action="genro.publish('greeting', {name: name});")
        root.dataController("this.SET('message', 'Hello ' + name);",
                            subscribe_greeting=True)
        root.dataController("this.SET('count', count + 1);",
                            count='=count', subscribe_greeting=True)
        result = root.groupBox(lbl='Two independent subscribers', margin_top='20px')
        result.div('^message')
        result.div('^count', mask='Publications: %s')
        root.button('Publish from this node', nodeId='sender', margin_top='20px',
                    action="this.publish('ready', {text: 'Sent through sender_ready'});")
        root.dataController("this.SET('local_message', text);",
                            subscribe_sender_ready=True)
        local = root.groupBox(lbl='Node topic', margin_top='20px')
        local.div('^local_message')
