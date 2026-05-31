from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

# DefaultRouter generates:
#   GET    /users/{id}/   → public profile
#   GET    /users/me/     → current user
#   PUT    /users/me/     → update profile
#   PATCH  /users/me/     → partial update
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]