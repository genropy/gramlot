# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
from recipe import message_box


def comparison(root, python_source, javascript_source):
    root.h1("One box, two recipes")
    root.p("Edit each message and try Reset. Each box has its own Data path.")
    root.checkBox(value="^showDetail", default=False, lbl="Show extra node")
    root.p("Python decides the extra node at build time. JavaScript adds or removes it live.")
    columns = root.div(class_="columns")
    python = columns.section()
    python.h2("Python composition")
    for key in ("first", "second"):
        message_box(python, datapath=f"python.{key}", title=f"Python · {key}")
    python.pre(python_source)
    javascript = columns.section()
    javascript.h2("JavaScript recipe")
    javascript.div(node_id="javascript_recipes")
    javascript.pre(javascript_source)
    root.a("Open the JavaScript-only standalone page", href="standalone.html")
