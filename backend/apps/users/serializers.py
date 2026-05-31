"""
apps/users/serializers.py + views.py combined for brevity.
In a real project these would be separate files.
"""

# ─── serializers.py ────────────────────────────────────────────────────────────
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Public-safe user profile.
    SECURITY: ALWAYS list fields explicitly.
    Never use fields = '__all__' — it risks leaking password hashes,
    is_superuser, last_login, and other internal fields.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'bio', 'avatar_url', 'created_at']
        read_only_fields = ['id', 'email', 'created_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Only allow updating safe profile fields — never email or clerk_id."""
    class Meta:
        model = User
        fields = ['username', 'bio', 'avatar_url']