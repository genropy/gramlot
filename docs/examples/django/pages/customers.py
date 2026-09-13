"""Public customer grid; saving requires an authenticated user with permission."""
from django.core.exceptions import PermissionDenied
from django.db import transaction
from gramlot.contrib.django import DjangoPage
from gramlot.grid import GridStruct
from gramlot.page import endpoint
from gramlot_demo.models import Customer


class Page(DjangoPage):
    title = 'Django customers'
    example_view = True

    def main(self, root):
        root.h1('Django customers')
        root.p('Select a customer, enter a city and save. Saving requires change permission.')
        root.data('status', '')
        root.data('city', '')
        root.rpcStore(self.customers, storeCode='customers', storepath='rows',
                      _identifier='id', _onStart=True, _fired='^reload',
                      _onError='this.SET("status", error.message);')
        struct = GridStruct()
        cells = struct.view().rows()
        cells.cell('name', name='Customer', width=240)
        cells.cell('city', name='City', width=180)
        root.data('struct', struct)
        root.grid(store='customers', structpath='struct', height='220px', selectedKey='^customer_id')
        root.textBox(value='^city', lbl='New city')
        root.button('Save city', fire='save')
        root.dataRpc(self.save_city, customer_id='=customer_id', city='=city', _fired='^save',
                     _lockScreen=True,
                     _onResult='this.SET("status", "Saved"); this.FIRE("reload");',
                     _onError='this.SET("status", error.message);')
        root.p('^status', id='save-status')

    @endpoint
    def customers(self):
        return self.selection_result(Customer.objects.order_by('id'), fields=['id', 'name', 'city'])

    @endpoint
    def save_city(self, customer_id: int, city: str):
        if not self.request.user.has_perm('gramlot_demo.change_customer'):
            raise PermissionDenied
        city = city.strip()
        if not city or len(city) > 120:
            raise ValueError('Enter a city of at most 120 characters')
        with transaction.atomic():
            customer = Customer.objects.select_for_update().get(pk=customer_id)
            customer.city = city
            customer.full_clean()
            customer.save(update_fields=['city'])
        return customer.id
