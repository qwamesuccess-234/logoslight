"""
config/urls.py — updated to use new community URLs
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from apps.users.views import ClerkWebhookView

urlpatterns = [
    path('admin/',              admin.site.urls),
    path('webhooks/clerk/',     ClerkWebhookView.as_view(), name='clerk-webhook'),

    path('api/v1/auth/',        include('apps.users.urls')),
    path('api/v1/bible/',       include('apps.bible.urls')),
    path('api/v1/devotional/',  include('apps.devotional.urls')),
    path('api/v1/notes/',       include('apps.notes.urls')),
    path('api/v1/community/',   include('apps.community.urls')),  # ← new Discord-style

    path('api/schema/',  SpectacularAPIView.as_view(),                      name='schema'),
    path('api/docs/',    SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/',   SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),
]