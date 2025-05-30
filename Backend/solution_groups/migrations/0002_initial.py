# Generated by Django 5.1.5 on 2025-04-27 07:32

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('solution_groups', '0001_initial'),
        ('timer', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='solutiongrouptickets',
            name='ticket_id',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='solution_groups_tickets', to='timer.ticket'),
        ),
        migrations.AddField(
            model_name='solutiongrouptickets',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='solution_group_engineer', to=settings.AUTH_USER_MODEL),
        ),
    ]
