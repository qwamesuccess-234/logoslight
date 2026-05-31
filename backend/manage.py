#!/usr/bin/env python
"""
manage.py — Django's command-line utility.
Usage examples:
  python manage.py runserver        → start dev server
  python manage.py makemigrations   → generate DB migrations
  python manage.py migrate          → apply migrations to DB
  python manage.py createsuperuser  → create admin user
  python manage.py test             → run tests
"""
import os
import sys


def main():
    # Point to the DEV settings by default for local development
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure you've activated your "
            "virtual environment and run: pip install -r requirements.txt"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()