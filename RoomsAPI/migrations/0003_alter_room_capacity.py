from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('RoomsAPI', '0002_alter_room_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='room',
            name='capacity',
            field=models.IntegerField(),
        ),
    ]
