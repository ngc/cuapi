# Generated by Django 5.0.6 on 2024-06-02 22:15

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0008_alter_offering_unique_together'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='coursesection',
            unique_together={('registration_term', 'related_offering', 'section_key')},
        ),
    ]
