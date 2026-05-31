"""
apps/bible/models.py
━━━━━━━━━━━━━━━━━━━━
SYSTEM DESIGN: External API Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We use the Bible API (api.bible / scripture.api.bible) for the actual
scripture text. We do NOT store the Bible text ourselves — that would be
hundreds of thousands of rows for no benefit.

What we DO store in our database:
  - Bookmarks (user → verse reference)
  - Reading progress (user → where they are in a plan)

This is the "thin model" pattern: store only user-generated data,
fetch reference data from external APIs on demand.
"""
from django.db import models
from django.conf import settings


class Bookmark(models.Model):
    """
    A user's bookmarked Bible verse.

    We store the reference (book, chapter, verse) not the text.
    The text is fetched from the Bible API when needed.
    This way our DB stays lean and the text is always up-to-date.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,      # DELETE user → delete their bookmarks
        related_name='bookmarks'
    )
    # Verse reference — stored as strings to be API-agnostic
    book = models.CharField(max_length=50)       # e.g., "John"
    chapter = models.PositiveIntegerField()       # e.g., 3
    verse = models.PositiveIntegerField()         # e.g., 16
    verse_end = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='For range bookmarks: John 3:16-18'
    )
    note = models.TextField(blank=True, default='')  # Optional private note on the verse
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bookmarks'
        ordering = ['-created_at']
        # Prevent duplicate bookmarks for the same verse
        unique_together = [['user', 'book', 'chapter', 'verse']]
        indexes = [
            models.Index(fields=['user', 'book']),  # "all my John bookmarks"
        ]

    def __str__(self) -> str:
        return f"{self.user.username} → {self.book} {self.chapter}:{self.verse}"


class ReadingProgress(models.Model):
    """
    Tracks where a user is in their Bible reading.
    Used by the daily reading plan feature.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reading_progress'
    )
    book = models.CharField(max_length=50)
    last_chapter_read = models.PositiveIntegerField(default=1)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reading_progress'
        unique_together = [['user', 'book']]

    def __str__(self) -> str:
        return f"{self.user.username} — {self.book} ch.{self.last_chapter_read}"