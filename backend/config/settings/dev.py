"""
config/settings/dev.py
━━━━━━━━━━━━━━━━━━━━━
Development overrides. These settings are relaxed for local convenience
but would be a security disaster in production.

Usage: set DJANGO_SETTINGS_MODULE=config.settings.dev
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# In dev, allow all hosts (your machine, Docker containers, etc.)
ALLOWED_HOSTS = ['*']

# In dev, allow all origins so you can test from any local port
CORS_ALLOW_ALL_ORIGINS = True

# Pretty-print SQL queries in the terminal (dev only)
# Uncomment to see every DB query:
# LOGGING = {
#     'version': 1,
#     'handlers': {'console': {'class': 'logging.StreamHandler'}},
#     'loggers': {'django.db.backends': {'handlers': ['console'], 'level': 'DEBUG'}},
# }