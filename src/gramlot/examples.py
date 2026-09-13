# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Uniform Python-authored live/source presentation for example hosts."""


def example_panel(root, source_text: str, title: str):
    """Return a bordered live pane beside its exact read-only Python source."""
    root.styleSheet('''
        .example-shell { padding:16px; box-sizing:border-box; font:13px/1.5 system-ui,sans-serif;
            color:#263445; background:#f5f7fa; --accent-color:#356c97;
            --field-border:#cbd5df; --field-focus-border:#356c97; --form-field-radius:5px;
            --gnrfieldlabel-color:#536477; --form-label-font-size:12px; }
        .example-heading { font:500 12px system-ui,sans-serif; color:#627387; margin:0 0 12px; }
        .example-live-column { padding-right:12px; box-sizing:border-box; }
        .example-live { border:1px solid #dce3ee; border-radius:8px; padding:24px;
            box-sizing:border-box; background:white; overflow:auto; }
        .example-live h2 { font-size:20px; line-height:1.3; font-weight:600; margin:0 0 12px; letter-spacing:-.3px; }
        .example-live h3 { font-size:15px; font-weight:600; margin:0 0 14px; }
        .example-live p { color:#627387; line-height:1.6; margin:0 0 22px; max-width:70ch; }
        .example-live button { font:500 12px/1.4 system-ui,sans-serif; color:#344b62;
            background:#fff; border:1px solid #cbd5df; border-radius:5px; padding:7px 11px;
            min-height:32px; cursor:pointer; }
        .example-live button:hover:not(:disabled) { background:#edf3f8; border-color:#94adc2; }
        .example-live button:active:not(:disabled) { background:#e0eaf3; }
        .example-live button:disabled { opacity:.5; cursor:default; }
        .example-live button:focus-visible { outline:2px solid #356c97; outline-offset:2px; }
        .example-section { margin-top:26px; padding-top:24px; border-top:1px solid #e5eaf0; }
        .example-fields { display:flex; flex-wrap:wrap; gap:20px 28px; align-items:start; margin:20px 0; }
        .example-fields > * { min-width:0; max-width:100%; }
        .example-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:16px 0; }
        .example-state { display:flex; flex-wrap:wrap; gap:16px; margin:14px 0 0; }
        .example-readout { padding:12px 14px; margin:16px 0; border:1px solid #e4eaf0;
            border-radius:6px; background:#f7f9fb; color:#526579; font:12px/1.8 ui-monospace,monospace;
            overflow-wrap:anywhere; }
        .example-live .example-note { margin:22px 0 0; font-size:12px; }
        @media(max-width:700px) { .example-shell{padding:8px} .example-live{padding:16px} }
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
