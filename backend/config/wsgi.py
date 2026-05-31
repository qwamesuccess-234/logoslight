"""
config/wsgi.py
━━━━━━━━━━━━━
WSGI = Web Server Gateway Interface.
This is the entry point that production servers (gunicorn, uvicorn) use
to communicate with our Django app.

SYSTEM DESIGN: The call chain is:
  Browser → Nginx (reverse proxy) → Gunicorn (WSGI server) → Django (our code)
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

application = get_wsgi_application()