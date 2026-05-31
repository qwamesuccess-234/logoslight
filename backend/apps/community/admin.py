from django.contrib import admin
from .models import Community, Channel, Membership, Message, Reaction

@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display  = ['name', 'owner', 'member_count', 'is_public', 'invite_code', 'created_at']
    list_filter   = ['is_public']
    search_fields = ['name', 'invite_code']
    readonly_fields = ['invite_code', 'created_at']

@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display  = ['name', 'community', 'channel_type', 'is_read_only', 'position']
    list_filter   = ['community', 'channel_type']

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display  = ['user', 'community', 'role', 'joined_at']
    list_filter   = ['role', 'community']
    raw_id_fields = ['user']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ['author', 'channel', 'content', 'created_at']
    list_filter   = ['channel__community']
    raw_id_fields = ['author']

@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'emoji']