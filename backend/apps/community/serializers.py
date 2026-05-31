"""
apps/community/serializers.py
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Community, Channel, Membership, Message, Reaction

User = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username', read_only=True)
    avatar_url = serializers.CharField(source='user.avatar_url', read_only=True)

    class Meta:
        model  = Membership
        fields = ['id', 'username', 'avatar_url', 'role', 'nickname', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ChannelSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model  = Channel
        fields = [
            'id', 'name', 'channel_type', 'description',
            'position', 'is_read_only', 'message_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_message_count(self, obj) -> int:
        return obj.messages.count()


class CommunitySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    channels       = ChannelSerializer(many=True, read_only=True)
    is_member      = serializers.SerializerMethodField()
    my_role        = serializers.SerializerMethodField()

    class Meta:
        model  = Community
        fields = [
            'id', 'name', 'description', 'icon', 'banner_color',
            'invite_code', 'owner_username', 'is_public',
            'member_count', 'channels', 'is_member', 'my_role', 'created_at',
        ]
        read_only_fields = ['id', 'invite_code', 'owner_username', 'member_count', 'created_at']

    def get_is_member(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.memberships.filter(user=request.user).exists()

    def get_my_role(self, obj) -> str:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return ''
        m = obj.memberships.filter(user=request.user).first()
        return m.role if m else ''


class CommunityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for search results and list views."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    is_member      = serializers.SerializerMethodField()
    channel_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Community
        fields = [
            'id', 'name', 'description', 'icon', 'banner_color',
            'invite_code', 'owner_username', 'member_count',
            'channel_count', 'is_member', 'is_public', 'created_at',
        ]

    def get_is_member(self, obj) -> bool:
        request = self.context.get('request')
        if not request:
            return False
        return obj.memberships.filter(user=request.user).exists()

    def get_channel_count(self, obj) -> int:
        return obj.channels.count()


class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Reaction
        fields = ['id', 'emoji', 'username']
        read_only_fields = ['id', 'username']


class MessageSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar   = serializers.CharField(source='author.avatar_url', read_only=True)
    reactions       = ReactionSerializer(many=True, read_only=True)
    reply_count     = serializers.SerializerMethodField()
    reply_to        = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'author_username', 'author_avatar', 'content',
            'parent_message', 'reply_to', 'reply_count',
            'is_pinned', 'reactions', 'edited_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'author_username', 'author_avatar',
            'reactions', 'reply_count', 'reply_to', 'edited_at', 'created_at',
        ]

    def get_reply_count(self, obj) -> int:
        return obj.replies.count()

    def get_reply_to(self, obj) -> dict | None:
        if obj.parent_message:
            return {
                'id':       obj.parent_message.id,
                'author':   obj.parent_message.author.username,
                'preview':  obj.parent_message.content[:80],
            }
        return None