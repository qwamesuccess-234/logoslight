"""
apps/notes/models.py
━━━━━━━━━━━━━━━━━━━━
Personal study notes — private by default.
A note is always tied to a Bible reference (book/chapter/verse).

SECURITY: Supabase RLS + Django permission class both enforce
that users can ONLY access their own notes. Defense in depth.
"""
from django.db import models
from django.conf import settings
from rest_framework import viewsets, permissions, serializers, filters
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.core.permissions import IsOwner


# ─── Model ────────────────────────────────────────────────────────────────────

class StudyNote(models.Model):
    """
    A personal Bible study note.
    Private to the user — never visible to others.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_notes'
    )
    title = models.CharField(max_length=300)
    content = models.TextField()
    # Optional verse anchor — a note doesn't have to be tied to a specific verse
    book = models.CharField(max_length=50, blank=True, default='')
    chapter = models.PositiveIntegerField(null=True, blank=True)
    verse = models.PositiveIntegerField(null=True, blank=True)
    tags = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='Comma-separated tags: "faith, grace, love"'
    )
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_notes'
        ordering = ['-updated_at']   # Most recently edited first
        indexes = [
            models.Index(fields=['user', 'book']),      # "my notes in Romans"
            models.Index(fields=['user', 'is_favorite']), # "my favorites"
        ]

    def __str__(self) -> str:
        ref = f" ({self.book} {self.chapter}:{self.verse})" if self.book else ""
        return f"{self.title}{ref}"


# ─── Serializer ───────────────────────────────────────────────────────────────

class StudyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyNote
        fields = [
            'id', 'title', 'content', 'book', 'chapter', 'verse',
            'tags', 'is_favorite', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_content(self, value: str) -> str:
        """Minimal XSS protection at the serializer level."""
        dangerous = ['<script', 'javascript:', 'onerror=', 'onload=']
        for pattern in dangerous:
            if pattern.lower() in value.lower():
                raise serializers.ValidationError('Note content contains invalid markup.')
        return value


# ─── ViewSet ──────────────────────────────────────────────────────────────────

class StudyNoteViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for personal study notes.

    Supports:
      ?search=faith         → full-text search on title/content
      ?book=Romans          → filter by Bible book
      ?is_favorite=true     → only favorites
      ?ordering=-updated_at → sort
    """
    serializer_class = StudyNoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    search_fields = ['title', 'content', 'tags']
    filterset_fields = ['book', 'is_favorite']
    ordering_fields = ['created_at', 'updated_at', 'title']

    def get_queryset(self):
        # SECURITY: ALWAYS filter by request.user for private resources
        # This is the application-level guard. Supabase RLS is the DB-level guard.
        return StudyNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─── URLs ─────────────────────────────────────────────────────────────────────

router = DefaultRouter()
router.register(r'', StudyNoteViewSet, basename='note')

urlpatterns = [path('', include(router.urls))]