# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
from gramlot.contrib.fastapi_genropy import GenropyPage
from gramlot.page import endpoint


class Page(GenropyPage):
    example_view = True

    def main(self, root):
        root.p('Search for a customer by name, then choose a result.')
        root.dbSelect(
            value='^customer_id', rpcmethod=self.lookup_customers,
            lbl='Customer', width='100%',
            selectedCaption='customer_name', selected_suburb='customer_suburb',
            selected_postcode='customer_postcode', selected_state='customer_state',
        )
        root.p('^customer_id', mask='Customer ID: %s')
        root.p('^customer_name', mask='Name: %s')
        root.p('^customer_suburb', mask='Locality: %s')
        root.p('^customer_postcode', mask='Postcode: %s')
        root.p('^customer_state', mask='State: %s')

    @endpoint
    def lookup_customers(self, _querystring='', _id=None):
        table = self.db.table('invc.customer')
        columns = '$id,$account_name,$suburb,$postcode,$state'
        if _id is not None:
            rows = table.query(columns=columns, where='$id=:key',
                               key=_id, limit=1).fetch()
        else:
            rows = table.query(
                columns=columns, where='$account_name ILIKE :text',
                text=f'%{_querystring}%', order_by='$account_name,$id', limit=10,
            ).fetch()
        return dict(self.selection_result(rows, identifier='id'), caption='account_name')
