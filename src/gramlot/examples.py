# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Uniform Python-authored live/source presentation for example hosts."""


def example_panel(root, source_text: str, title: str):
    """Return a bordered live pane beside its exact read-only Python source."""
    root.styleSheet('''
        .example-shell { padding:10px; box-sizing:border-box; font:13px system-ui,sans-serif; }
        .example-heading { font:500 14px system-ui,sans-serif; margin:0 0 6px; }
        .example-live-column { padding-right:4px; box-sizing:border-box; }
        .example-live { border:1px solid #dce3ee; border-radius:5px; padding:10px;
            box-sizing:border-box; background:white; overflow:auto; }
        .example-code { background:#282c34; color:#abb2bf; border:1px solid #343b48;
            border-radius:5px; box-sizing:border-box; overflow:auto; }
        .example-code-label { padding:4px 10px; font:11px/1.4 system-ui,sans-serif; border-bottom:1px solid #343b48; }
        .example-code gnr-codemirror { --code-editor-height:calc(100vh - 125px); --code-editor-font-size:12px; border:0; }
        .example-inspector-toggle { font:300 11px/1.4 system-ui,sans-serif; color:#9ba3af;
            background:transparent; border:0; padding:3px 0; margin:0; cursor:pointer; }
    ''')
    shell = root.div(class_='example-shell')
    shell.h3(title, class_='example-heading')
    split = shell.borderContainer(height='calc(100vh - 75px)', min_height='400px')
    left = split.contentPane(region='left', width='50%', splitter=True,
                             height='100%', class_='example-live-column')
    live = left.div(class_='example-live', height='calc(100% - 26px)')
    left.button('🔍 Open inspector', class_='example-inspector-toggle',
                action='genro.inspector.toggle();', **{'aria-label':'Open inspector'})
    code = split.contentPane(region='center', height='100%', class_='example-code')
    code.div('Python', class_='example-code-label')
    code.codeMirror(value=source_text, language='python', readonly=True,
                    **{'aria-label':'Executed Python source'})
    return live
