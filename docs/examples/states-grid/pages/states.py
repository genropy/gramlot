# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
from gramlot.contrib.fastapi_genropy import GenropyPage
from gramlot.grid import GridStruct
from gramlot.page import endpoint


class Page(GenropyPage):
    example_view = True

    def main(self, root):
        root.data('status', 'Loading states…')
        root.button('Reload', fire='reload')
        root.p('^status')
        root.rpcStore(
            self.load_states, storeCode='states', storepath='rows',
            _identifier='code', _onStart=True, _fired='^reload',
            _onCalling='this.SET("status", "Loading states…");',
            _onResult='this.SET("status", result.rows.length + " states loaded");',
            _onError='this.SET("status", error.message);',
        )
        struct = GridStruct()
        cells = struct.view().rows()
        cells.cell('code', name='Code', width=80)
        cells.cell('name', name='State', width=230)
        cells.cell('region_code', name='Region', width=100)
        root.data('struct', struct)
        root.grid(store='states', structpath='struct', height='250px',
                  selectedKey='^selected_state')

        root.h3('Localities')
        root.data('localities_status', 'Select a state to see its localities.')
        root.p('^localities_status')
        root.rpcStore(
            self.load_localities, storeCode='localities', storepath='localities',
            _identifier='id', state='^selected_state', _lockScreen=True,
            _onCalling='this.SET("localities_status", "Loading localities…");',
            _onResult='this.SET("localities_status", kwargs.state ? result.rows.length + " localities in " + kwargs.state : "Select a state to see its localities.");',
            _onError='this.SET("localities_status", error.message);',
        )
        localities = GridStruct()
        cells = localities.view().rows()
        cells.cell('postcode', name='Postcode', width=90)
        cells.cell('suburb', name='Locality', width=270)
        cells.cell('state', name='State', width=75)
        root.data('localities_struct', localities)
        root.grid(store='localities', structpath='localities_struct', height='250px')

        root.h3('Customers')
        root.data('customers_status', 'Select a state to see its customers.')
        root.p('^customers_status')
        root.rpcStore(
            self.load_customers, storeCode='customers', storepath='customers',
            _identifier='id', state='^selected_state', _lockScreen=True,
            _onCalling='this.SET("customers_status", "Loading customers…");',
            _onResult='this.SET("customers_status", kwargs.state ? result.rows.length + " customers in " + kwargs.state : "Select a state to see its customers.");',
            _onError='this.SET("customers_status", error.message);',
        )
        customers = GridStruct()
        cells = customers.view().rows()
        cells.cell('account_name', name='Customer', width=230)
        cells.cell('suburb', name='Locality', width=150)
        cells.cell('postcode', name='Postcode', width=80)
        cells.cell('state', name='State', width=65)
        root.data('customers_struct', customers)
        root.grid(store='customers', structpath='customers_struct', height='250px')

    @endpoint
    def load_states(self):
        rows = self.db.table('invc.state').query(
            columns='$code,$name,$region_code', order_by='$name',
        ).fetch()
        return self.selection_result(rows, identifier='code')

    @endpoint
    def load_localities(self, state=None):
        if not state:
            return self.selection_result([], identifier='id')
        rows = self.db.table('invc.postcode').query(
            columns='$id,$postcode,$suburb,$state',
            where='$state=:state', state=state,
            order_by='$suburb,$postcode,$id',
        ).fetch()
        return self.selection_result(rows, identifier='id')

    @endpoint
    def load_customers(self, state=None):
        if not state:
            return self.selection_result([], identifier='id')
        rows = self.db.table('invc.customer').query(
            columns='$id,$account_name,$suburb,$postcode,$state',
            where='$state=:state', state=state,
            order_by='$account_name,$id',
        ).fetch()
        return self.selection_result(rows, identifier='id')
