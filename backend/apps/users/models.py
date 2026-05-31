"""
apps/users/models.py
━━━━━━━━━━━━━━━━━━━━
SYSTEM DESIGN: Custom User Model
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALWAYS define a custom User model from the start of a Django project.
If you start with Django's default User and later add clerk_id or avatar_url,
the migration is extremely painful (Django's auth system has many FK references).

AbstractUser gives us all default fields (username, email, password, is_active...)
and we ADD our custom fields on top.

clerk_id is the bridge between:
  - Clerk (manages auth UI, sessions, tokens)
  - Our database (stores app-specific user data)
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Extended user model bridging Clerk auth with our Supabase database.

    clerk_id: The Clerk user ID (e.g., "user_2abc123...").
              Populated when the user first signs in OR via the Clerk webhook.
              Indexed for O(log n) JWT lookup (called on every request).
    """
    clerk_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,    # PERFORMANCE: index for O(log n) auth lookup
        null=True,        # null during initial migration before Clerk is set up
        blank=True,
    )
    bio = models.TextField(blank=True, default='')
    avatar_url = models.URLField(
        blank=True,
        default='',
        help_text='Stored in Supabase Storage. Never served from Django directly.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['clerk_id']),   # JWT auth lookup
            models.Index(fields=['email']),       # Email search
        ]

    def __str__(self) -> str:
        return f"{self.username} ({self.email})"