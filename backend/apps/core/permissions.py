"""
apps/core/permissions.py
━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM DESIGN: Custom Permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DRF has two levels of permission checks:
  1. View-level  → has_permission(request, view)  — "can this user access this endpoint?"
  2. Object-level → has_object_permission(...)     — "can this user touch THIS object?"

We define both here. IsOwnerOrReadOnly is the most common pattern:
  - Anyone authenticated can READ (GET, HEAD, OPTIONS)
  - Only the owner can WRITE (POST, PUT, PATCH, DELETE)
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission: owner can edit, others can only read.

    Used on: Notes, Community Posts — the author owns their content.

    Example usage in a ViewSet:
        permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    """
    def has_object_permission(self, request, view, obj):
        # SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS') — read-only, always allowed
        if request.method in SAFE_METHODS:
            return True
        # Write access: only the object's owner
        # The 'user' field must exist on the model (e.g., note.user, post.author)
        owner_field = getattr(obj, 'user', None) or getattr(obj, 'author', None)
        return owner_field == request.user


class IsOwner(BasePermission):
    """
    Strict ownership: ONLY the owner can read OR write.

    Used on: Personal notes — others should never see them.
    """
    def has_object_permission(self, request, view, obj):
        owner_field = getattr(obj, 'user', None) or getattr(obj, 'author', None)
        return owner_field == request.user