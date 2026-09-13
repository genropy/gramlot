# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
from gramlot.contrib.fastapi_genropy import GenropyPage


class Page(GenropyPage):
    title = 'Customer relation tree'
    example_view = True
    relation_roots = ('invc.customer',)

    def main(self, root):
        root.p('Expand a relation to explore its fields and further relations.')
        root.relationTree('invc.customer', selectedPath='^selected')
        root.p('^selected', mask='Path: %s')
