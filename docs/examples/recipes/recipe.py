# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""An ordinary importable Python composition; no recipe base class."""


def message_box(parent, *, datapath, title="Message", show_detail=False):
    box = parent.div(datapath=datapath, class_="message-box")
    box.div(title, class_="box-title")
    box.textBox(value="^.message", default="Hello", placeholder="Write a message")
    box.button("Reset", action="this.SET('.message', 'Hello');")
    if show_detail:
        box.p("^.message", class_="detail")
    return box
