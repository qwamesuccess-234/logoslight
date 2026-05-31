"""
apps/community/views.py
Discord-style API endpoints.

Endpoints:
  GET    /community/                         → list public communities
  POST   /community/                         → create a community
  GET    /community/search/?q=bible          → search communities by name
  GET    /community/join/?code=ABC123        → find community by invite code
  POST   /community/{id}/join/              → join a community
  POST   /community/{id}/leave/             → leave a community
  GET    /community/{id}/                   → community detail + channels
  GET    /community/{id}/channels/          → list channels
  POST   /community/{id}/channels/          → create channel (owner/admin)
  GET    /community/{id}/channels/{cid}/messages/  → get messages
  POST   /community/{id}/channels/{cid}/messages/  → send message
  DELETE /community/{id}/channels/{cid}/messages/{mid}/  → delete message
  POST   /community/{id}/channels/{cid}/messages/{mid}/react/  → add reaction
  GET    /community/{id}/members/           → list members
  PATCH  /community/{id}/members/{uid}/role/ → change member role (owner/admin)
  DELETE /community/{id}/members/{uid}/     → kick member (owner/admin)
  GET    /community/mine/                   → my communities
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Community, Channel, Membership, Message, Reaction
from .serializers import (
    CommunitySerializer,
    CommunityListSerializer,
    ChannelSerializer,
    MessageSerializer,
    MemberSerializer,
    ReactionSerializer,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_membership(community, user):
    return Membership.objects.filter(community=community, user=user).first()

def is_admin_or_owner(membership):
    return membership and membership.role in ('owner', 'admin')


# ─── Community List + Create ──────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def community_list_create(request):
    if request.method == 'GET':
        # Return public communities, ordered by member count
        communities = Community.objects.filter(is_public=True).prefetch_related(
            'channels', 'memberships'
        )[:50]
        serializer = CommunityListSerializer(
            communities, many=True, context={'request': request}
        )
        return Response({'results': serializer.data, 'count': len(serializer.data)})

    # POST — create a new community
    serializer = CommunitySerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        community = serializer.save(owner=request.user)

        # Auto-create default channels
        default_channels = [
            {'name': 'general',           'channel_type': 'text',         'position': 0, 'description': 'General discussion'},
            {'name': 'announcements',     'channel_type': 'announcement', 'position': 1, 'description': 'Important updates', 'is_read_only': True},
            {'name': 'prayer-requests',   'channel_type': 'prayer',       'position': 2, 'description': 'Share your prayer needs'},
            {'name': 'bible-study',       'channel_type': 'study',        'position': 3, 'description': 'Deep-dive Scripture study'},
        ]
        for ch in default_channels:
            Channel.objects.create(community=community, **ch)

        # Auto-join creator as owner
        Membership.objects.create(community=community, user=request.user, role='owner')

    full = CommunitySerializer(community, context={'request': request})
    return Response(full.data, status=status.HTTP_201_CREATED)


# ─── Search Communities ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def community_search(request):
    """GET /community/search/?q=bible  — search by name or invite code."""
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': [], 'count': 0})

    communities = Community.objects.filter(
        Q(name__icontains=q) | Q(invite_code__iexact=q),
        is_public=True,
    ).prefetch_related('memberships', 'channels')[:20]

    serializer = CommunityListSerializer(
        communities, many=True, context={'request': request}
    )
    return Response({'results': serializer.data, 'count': len(serializer.data)})


# ─── Find by Invite Code ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def community_by_code(request):
    """GET /community/join/?code=ABC123"""
    code = request.query_params.get('code', '').strip().upper()
    if not code:
        return Response({'error': 'Provide ?code= parameter.'}, status=400)
    try:
        community = Community.objects.prefetch_related('channels', 'memberships').get(
            invite_code=code
        )
    except Community.DoesNotExist:
        return Response({'error': 'No community found with that invite code.'}, status=404)

    serializer = CommunitySerializer(community, context={'request': request})
    return Response(serializer.data)


# ─── My Communities ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_communities(request):
    """GET /community/mine/ — communities the user has joined."""
    memberships = Membership.objects.filter(
        user=request.user
    ).select_related('community').prefetch_related(
        'community__channels', 'community__memberships'
    )
    communities = [m.community for m in memberships]
    serializer = CommunityListSerializer(
        communities, many=True, context={'request': request}
    )
    return Response({'results': serializer.data, 'count': len(serializer.data)})


# ─── Community Detail ─────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def community_detail(request, community_id):
    try:
        community = Community.objects.prefetch_related(
            'channels', 'memberships'
        ).get(pk=community_id)
    except Community.DoesNotExist:
        return Response({'error': 'Community not found.'}, status=404)

    if request.method == 'GET':
        serializer = CommunitySerializer(community, context={'request': request})
        return Response(serializer.data)

    membership = get_membership(community, request.user)

    if request.method == 'PATCH':
        if not is_admin_or_owner(membership):
            return Response({'error': 'Only admins can edit this community.'}, status=403)
        serializer = CommunitySerializer(
            community, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    if request.method == 'DELETE':
        if membership and membership.role != 'owner':
            return Response({'error': 'Only the owner can delete this community.'}, status=403)
        community.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Join / Leave ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def community_join(request, community_id):
    try:
        community = Community.objects.get(pk=community_id)
    except Community.DoesNotExist:
        return Response({'error': 'Community not found.'}, status=404)

    if Membership.objects.filter(community=community, user=request.user).exists():
        return Response({'error': 'You are already a member.'}, status=400)

    with transaction.atomic():
        Membership.objects.create(community=community, user=request.user, role='member')
        Community.objects.filter(pk=community_id).update(
            member_count=community.member_count + 1
        )

    return Response({'status': 'joined', 'community': community.name})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def community_leave(request, community_id):
    try:
        community = Community.objects.get(pk=community_id)
    except Community.DoesNotExist:
        return Response({'error': 'Community not found.'}, status=404)

    membership = get_membership(community, request.user)
    if not membership:
        return Response({'error': 'You are not a member.'}, status=400)
    if membership.role == 'owner':
        return Response(
            {'error': 'Owners cannot leave. Transfer ownership or delete the community.'},
            status=400
        )

    with transaction.atomic():
        membership.delete()
        Community.objects.filter(pk=community_id).update(
            member_count=max(community.member_count - 1, 0)
        )

    return Response({'status': 'left'})


# ─── Channels ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def channel_list_create(request, community_id):
    try:
        community = Community.objects.get(pk=community_id)
    except Community.DoesNotExist:
        return Response({'error': 'Community not found.'}, status=404)

    membership = get_membership(community, request.user)

    if request.method == 'GET':
        if not membership:
            return Response({'error': 'Join this community to see its channels.'}, status=403)
        channels = community.channels.all()
        return Response(ChannelSerializer(channels, many=True).data)

    # POST — create channel (admin/owner only)
    if not is_admin_or_owner(membership):
        return Response({'error': 'Only admins can create channels.'}, status=403)

    serializer = ChannelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    channel = serializer.save(community=community)
    return Response(ChannelSerializer(channel).data, status=201)


# ─── Messages ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def message_list_create(request, community_id, channel_id):
    try:
        community = Community.objects.get(pk=community_id)
        channel   = Channel.objects.get(pk=channel_id, community=community)
    except (Community.DoesNotExist, Channel.DoesNotExist):
        return Response({'error': 'Not found.'}, status=404)

    membership = get_membership(community, request.user)
    if not membership:
        return Response({'error': 'Join this community to read messages.'}, status=403)

    if request.method == 'GET':
        # Paginate — return last 50 messages
        before_id = request.query_params.get('before')
        qs = Message.objects.filter(channel=channel).select_related(
            'author', 'parent_message__author'
        ).prefetch_related('reactions__user')

        if before_id:
            qs = qs.filter(id__lt=before_id)

        messages = list(qs.order_by('-created_at')[:50])
        messages.reverse()  # oldest first for chat display

        return Response({
            'results': MessageSerializer(messages, many=True).data,
            'has_more': qs.count() > 50,
        })

    # POST — send message
    if channel.is_read_only and not is_admin_or_owner(membership):
        return Response(
            {'error': 'This channel is read-only. Only admins can post here.'},
            status=403
        )

    serializer = MessageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    message = serializer.save(author=request.user, channel=channel)
    return Response(MessageSerializer(message).data, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def message_detail(request, community_id, channel_id, message_id):
    try:
        community = Community.objects.get(pk=community_id)
        channel   = Channel.objects.get(pk=channel_id, community=community)
        message   = Message.objects.get(pk=message_id, channel=channel)
    except (Community.DoesNotExist, Channel.DoesNotExist, Message.DoesNotExist):
        return Response({'error': 'Not found.'}, status=404)

    membership = get_membership(community, request.user)
    is_author  = message.author == request.user

    if request.method == 'PATCH':
        if not is_author:
            return Response({'error': 'You can only edit your own messages.'}, status=403)
        message.content   = request.data.get('content', message.content)
        message.edited_at = timezone.now()
        message.save()
        return Response(MessageSerializer(message).data)

    if request.method == 'DELETE':
        if not is_author and not is_admin_or_owner(membership):
            return Response({'error': 'You cannot delete this message.'}, status=403)
        message.delete()
        return Response(status=204)


# ─── Reactions ────────────────────────────────────────────────────────────────

@api_view(['POST', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def message_react(request, community_id, channel_id, message_id):
    try:
        community = Community.objects.get(pk=community_id)
        channel   = Channel.objects.get(pk=channel_id, community=community)
        message   = Message.objects.get(pk=message_id, channel=channel)
    except (Community.DoesNotExist, Channel.DoesNotExist, Message.DoesNotExist):
        return Response({'error': 'Not found.'}, status=404)

    membership = get_membership(community, request.user)
    if not membership:
        return Response({'error': 'Join this community first.'}, status=403)

    emoji = request.data.get('emoji', '').strip()
    if not emoji:
        return Response({'error': 'Provide an emoji.'}, status=400)

    if request.method == 'POST':
        reaction, created = Reaction.objects.get_or_create(
            message=message, user=request.user, emoji=emoji
        )
        if not created:
            return Response({'error': 'Already reacted with this emoji.'}, status=400)
        return Response({'status': 'reacted', 'emoji': emoji}, status=201)

    # DELETE — remove reaction
    Reaction.objects.filter(message=message, user=request.user, emoji=emoji).delete()
    return Response({'status': 'removed'}, status=204)


# ─── Members ──────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def member_list(request, community_id):
    try:
        community = Community.objects.get(pk=community_id)
    except Community.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    membership = get_membership(community, request.user)
    if not membership:
        return Response({'error': 'Join this community to see its members.'}, status=403)

    members = Membership.objects.filter(community=community).select_related('user')
    return Response(MemberSerializer(members, many=True).data)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def kick_member(request, community_id, user_id):
    """Kick a member (owner/admin only)."""
    try:
        community  = Community.objects.get(pk=community_id)
        target_mem = Membership.objects.get(community=community, user_id=user_id)
    except (Community.DoesNotExist, Membership.DoesNotExist):
        return Response({'error': 'Not found.'}, status=404)

    requester_mem = get_membership(community, request.user)
    if not is_admin_or_owner(requester_mem):
        return Response({'error': 'Only admins can kick members.'}, status=403)
    if target_mem.role == 'owner':
        return Response({'error': 'Cannot kick the owner.'}, status=400)

    target_mem.delete()
    Community.objects.filter(pk=community_id).update(
        member_count=max(community.member_count - 1, 0)
    )
    return Response({'status': 'kicked'})


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def change_role(request, community_id, user_id):
    """Change a member's role (owner only)."""
    try:
        community  = Community.objects.get(pk=community_id)
        target_mem = Membership.objects.get(community=community, user_id=user_id)
    except (Community.DoesNotExist, Membership.DoesNotExist):
        return Response({'error': 'Not found.'}, status=404)

    requester_mem = get_membership(community, request.user)
    if not requester_mem or requester_mem.role != 'owner':
        return Response({'error': 'Only the owner can change roles.'}, status=403)

    new_role = request.data.get('role')
    if new_role not in ('admin', 'member'):
        return Response({'error': 'Role must be "admin" or "member".'}, status=400)

    target_mem.role = new_role
    target_mem.save()
    return Response(MemberSerializer(target_mem).data)