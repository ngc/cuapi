# Generated by Django 5.0.6 on 2024-05-28 02:08

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CourseDetails',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('registration_term', models.CharField(max_length=100)),
                ('crn', models.CharField(max_length=100)),
                ('subject_code', models.CharField(max_length=100)),
                ('long_title', models.CharField(max_length=100)),
                ('short_title', models.CharField(max_length=100)),
                ('course_description', models.CharField(max_length=100)),
                ('course_credit_value', models.FloatField()),
                ('schedule_type', models.CharField(max_length=100)),
                ('registration_status', models.CharField(max_length=100)),
                ('global_id', models.CharField(max_length=100)),
                ('related_offering', models.CharField(max_length=100)),
                ('section_key', models.CharField(max_length=100)),
                ('section_information', models.JSONField()),
                ('meeting_details', models.JSONField()),
            ],
        ),
    ]
