# Generated by Django 5.1.5 on 2025-05-20 09:43

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timer', '0005_ticket_project_owner_email_alter_ticket_project'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='ticket',
            name='product',
        ),
    ]
