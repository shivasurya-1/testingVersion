# Generated by Django 5.1.5 on 2025-04-30 11:01

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('project_details', '0002_projectattachment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='projectsdetails',
            name='file',
        ),
    ]
