#!/bin/sh

python manage.py migrate
exec gunicorn -b 0.0.0.0:3969 cuapi.wsgi