# Generated by Django 5.1.5 on 2025-04-27 07:32

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('resolution', '0001_initial'),
        ('timer', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='resolution',
            name='ticket_id',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='timer.ticket'),
        ),
    ]
