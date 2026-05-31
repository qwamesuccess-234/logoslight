"""
config/settings/base.py
━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM DESIGN LESSON: Settings are split into base / dev / prod.
  - base.py  → shared across ALL environments
  - dev.py   → overrides for local development (DEBUG=True, relaxed CORS)
  - prod.py  → overrides for production (HTTPS, secure cookies, strict CORS)

This pattern is called the "Settings Inheritance Pattern."
It prevents accidentally deploying debug code to production.
"""

import environ
import dj_database_url
from pathlib import Path

# ─── Path Setup ────────────────────────────────────────────────────────────────
# BASE_DIR points to the /backend folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Environment Variables ─────────────────────────────────────────────────────
# WHY: Never hardcode secrets. django-environ reads from .env file.
# Any value that could expose data, access keys, or passwords lives ONLY in .env
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

# ─── Core Django Settings ──────────────────────────────────────────────────────
SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# ─── Installed Apps ────────────────────────────────────────────────────────────
# SYSTEM DESIGN: Each "app" is a bounded domain. This is the Domain-Driven Design
# principle — bible, notes, community are separate concerns.
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # ── Third-party ──
    'rest_framework',            # DRF: our API framework
    'corsheaders',               # Allow cross-origin requests from React
    'drf_spectacular',           # Auto API documentation
    'django_filters',            # Query parameter filtering
    # ── Local apps (our bounded domains) ──
    'apps.users',                # Authentication + user profiles
    'apps.bible',                # Scripture reading, search, bookmarks
    'apps.devotional',           # Daily plans and devotionals
    'apps.notes',                # Personal study journals/notes
    'apps.community',            # Group discussions and posts
]

# ─── Middleware ────────────────────────────────────────────────────────────────
# SYSTEM DESIGN: Middleware is a pipeline — each layer processes requests
# in order (top-down for requests, bottom-up for responses).
# CorsMiddleware MUST be first so it intercepts preflight OPTIONS requests.
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # 1st: handle CORS headers
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── Database — Supabase PostgreSQL ────────────────────────────────────────────
# SYSTEM DESIGN: We use Supabase as a managed PostgreSQL host.
# Django's ORM doesn't change at all — it just connects to Supabase's DB.
# conn_max_age=600 = keep DB connections alive for 10 minutes.
# WHY: Opening a new DB connection costs ~50ms. Reusing = O(1), not O(n).
DATABASES = {
    'default': dj_database_url.config(
        default=env('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ─── Custom User Model ─────────────────────────────────────────────────────────
# SYSTEM DESIGN: ALWAYS define a custom User model from the start.
# If you use Django's default and later need to add fields (like clerk_id),
# the migration is painful. Custom from day 1 = zero pain later.
AUTH_USER_MODEL = 'users.User'

# ─── Django REST Framework ─────────────────────────────────────────────────────
# SYSTEM DESIGN: DRF is our API layer. Every HTTP request to /api/ goes
# through this config. Authentication is handled here globally.
REST_FRAMEWORK = {
    # Authentication: every request is verified against Clerk's JWT
    # WHY ClerkAuthentication and NOT SimpleJWT?
    # Clerk handles token issuance, expiry, refresh, and revocation.
    # We only need to VERIFY the token, not manage it.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.core.authentication.ClerkAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Rate limiting — protects against brute force / scraping attacks
    # SECURITY: O(1) cost to check rate limit vs O(∞) cost of unlimited API abuse
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '2000/day',
    },
    # Filtering: ?search=John, ?ordering=-created_at
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # Pagination: never return unbounded querysets — O(n) → catastrophic
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    # API Documentation schema
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ─── Clerk Auth Settings ───────────────────────────────────────────────────────
CLERK_DOMAIN = env('CLERK_DOMAIN')
CLERK_WEBHOOK_SECRET = env('CLERK_WEBHOOK_SECRET')

# ─── Supabase Settings ─────────────────────────────────────────────────────────
# SERVICE_KEY is backend-only — it bypasses Row-Level Security (RLS).
# NEVER put this in frontend code. It's like having DB root access.
SUPABASE_URL = env('SUPABASE_URL')
SUPABASE_SERVICE_KEY = env('SUPABASE_SERVICE_KEY')

# ─── API.Bible ─────────────────────────────────────────────────────────────────
# Get a free key at https://scripture.api.bible (dashboard: https://scripture.api.bible/admin)
BIBLE_API_KEY = env('BIBLE_API_KEY', default='').strip()
# Current production host (legacy api.scripture.api.bible returns 401 for new keys)
BIBLE_API_BASE_URL = env(
    'BIBLE_API_BASE_URL',
    default='https://rest.api.bible/v1',
).rstrip('/')
# Optional: skip auto-detect and use a fixed translation id from GET /api/v1/bible/list/
BIBLE_API_BIBLE_ID = env('BIBLE_API_BIBLE_ID', default='').strip()

# ─── CORS — Cross-Origin Resource Sharing ─────────────────────────────────────
# SYSTEM DESIGN: React runs on port 5173, Django on 8000. 
# Browsers block cross-origin requests by default (Same-Origin Policy).
# CORS headers tell the browser "this origin is allowed."
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:5173']
)
CORS_ALLOW_CREDENTIALS = True  # Allow cookies / auth headers

# ─── API Documentation ─────────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'LogosLight Bible Study API',
    'DESCRIPTION': (
        'A production-grade REST API for the LogosLight Bible study platform. '
        'Supports scripture reading, personal notes, daily devotionals, and community discussions.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# For verse reactions — use database cache in production
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# ─── Static & Media ────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Note: Media files (avatars, etc.) are stored in Supabase Storage, not locally

# ─── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'