# Generated by Django 5.2 on 2025-05-09 11:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('history', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reports',
            name='title',
            field=models.TextField(),
        ),
    ]
