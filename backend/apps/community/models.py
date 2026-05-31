"""
apps/community/models.py
━━━━━━━━━━━━━━━━━━━━━━━━
Discord-style community system:
  Community  → like a Discord server (has name, icon, description, invite code)
  Channel    → like a Discord channel inside a server (#general, #prayer, etc.)
  Membership → user joins a community (with roles: owner, admin, member)
  Message    → messages inside a channel (replaces flat posts)
  Reaction   → emoji reactions on messages
"""
import uuid
from django.db import models
from django.conf import settings


class Community(models.Model):
    """
    A Bible study community — like a Discord server.
    Has an auto-generated invite code so others can search & join.
    """
    name         = models.CharField(max_length=100)
    description  = models.TextField(blank=True, default='')
    icon         = models.CharField(
        max_length=10, default='✝️',
        help_text='Emoji used as the community icon'
    )
    banner_color = models.CharField(
        max_length=7, default='#1e1b4b',
        help_text='Hex color for the community banner'
    )
    invite_code  = models.CharField(
        max_length=12, unique=True, blank=True,
        help_text='Short code others use to search and join'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_communities'
    )
    is_public    = models.BooleanField(default=True)
    member_count = models.PositiveIntegerField(default=1)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'communities'
        ordering  = ['-member_count', 'name']
        indexes   = [
            models.Index(fields=['invite_code']),
            models.Index(fields=['name']),
        ]

    def save(self, *args, **kwargs):
        if not self.invite_code:
            # Generate a short human-readable invite code
            self.invite_code = uuid.uuid4().hex[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Channel(models.Model):
    """
    A text channel inside a community — like #general, #prayer-requests.
    """
    CHANNEL_TYPES = [
        ('text',        '# Text'),
        ('announcement','📢 Announcement'),
        ('prayer',      '🙏 Prayer'),
        ('study',       '📖 Study'),
    ]

    community    = models.ForeignKey(
        Community, on_delete=models.CASCADE, related_name='channels'
    )
    name         = models.CharField(max_length=80)
    channel_type = models.CharField(
        max_length=20, choices=CHANNEL_TYPES, default='text'
    )
    description  = models.CharField(max_length=200, blank=True, default='')
    position     = models.PositiveIntegerField(default=0)
    is_read_only = models.BooleanField(
        default=False,
        help_text='Only admins/owner can post (e.g. announcements)'
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'channels'
        ordering  = ['position', 'name']
        unique_together = [['community', 'name']]
        indexes   = [models.Index(fields=['community', 'position'])]

    def __str__(self):
        return f"#{self.name} ({self.community.name})"


class Membership(models.Model):
    """
    A user's membership in a community.
    Roles mirror Discord: owner > admin > member.
    """
    ROLES = [
        ('owner',  '👑 Owner'),
        ('admin',  '🛡️ Admin'),
        ('member', '👤 Member'),
    ]

    community = models.ForeignKey(
        Community, on_delete=models.CASCADE, related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_memberships'
    )
    role      = models.CharField(max_length=10, choices=ROLES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    nickname  = models.CharField(max_length=80, blank=True, default='')

    class Meta:
        db_table        = 'memberships'
        unique_together = [['community', 'user']]
        indexes         = [models.Index(fields=['community', 'user'])]

    def __str__(self):
        return f"{self.user.username} in {self.community.name} ({self.role})"


class Message(models.Model):
    """
    A message in a channel — like a Discord message.
    Supports replies (parent_message FK).
    """
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name='messages'
    )
    author  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='channel_messages'
    )
    content        = models.TextField()
    parent_message = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='replies'
    )
    is_pinned  = models.BooleanField(default=False)
    edited_at  = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'channel_messages'
        ordering = ['created_at']
        indexes  = [
            models.Index(fields=['channel', 'created_at']),
            models.Index(fields=['author']),
        ]

    def __str__(self):
        return f"{self.author.username}: {self.content[:50]}"


class Reaction(models.Model):
    """Emoji reaction on a message — like Discord reactions."""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name='reactions'
    )
    user  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    emoji = models.CharField(max_length=10)

    class Meta:
        db_table        = 'message_reactions'
        unique_together = [['message', 'user', 'emoji']]

    def __str__(self):
        return f"{self.emoji} by {self.user.username}"