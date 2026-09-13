from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.CreateModel(name='Customer', fields=[
        ('id', models.AutoField(primary_key=True, serialize=False)),
        ('name', models.CharField(max_length=120)),
        ('city', models.CharField(max_length=120)),
    ])]
