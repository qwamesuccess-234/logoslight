"""
config/settings/prod.py
━━━━━━━━━━━━━━━━━━━━━━━
Production hardening. Every setting here prevents a real attack vector.
SYSTEM DESIGN: Security in depth — multiple layers of protection.

Usage: set DJANGO_SETTINGS_MODULE=config.settings.prod
"""
from .base import *  # noqa: F401, F403

DEBUG = False  # CRITICAL: Never True in production — exposes stack traces

# ─── HTTPS Enforcement ─────────────────────────────────────────────────────────
# HSTS: browser will ONLY connect via HTTPS for 1 year after first visit
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True         # HTTP → HTTPS redirect

# ─── Secure Cookies ────────────────────────────────────────────────────────────
# Cookies can only be sent over HTTPS (not interceptable on HTTP)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True     # JS cannot read session cookie

# ─── Click-jacking Protection ──────────────────────────────────────────────────
X_FRAME_OPTIONS = 'DENY'                 # No iframes embedding our pages
SECURE_CONTENT_TYPE_NOSNIFF = True       # Prevents MIME sniffing attacks
SECURE_BROWSER_XSS_FILTER = True        # Legacy XSS filter (belt + suspenders)