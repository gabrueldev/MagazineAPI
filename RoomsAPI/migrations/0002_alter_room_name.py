from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('RoomsAPI', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='room',
            name='name',
            field=models.CharField(max_length=20, unique=True),
        ),
    ]
