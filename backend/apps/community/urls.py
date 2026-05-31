"""
apps/community/urls.py
Discord-style URL structure
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Community CRUD ──────────────────────────────────────────────────────
    path('',                    views.community_list_create,  name='community-list'),
    path('search/',             views.community_search,       name='community-search'),
    path('join/',               views.community_by_code,      name='community-by-code'),
    path('mine/',               views.my_communities,         name='my-communities'),
    path('<int:community_id>/', views.community_detail,       name='community-detail'),

    # ── Membership ──────────────────────────────────────────────────────────
    path('<int:community_id>/join/',                    views.community_join,   name='community-join'),
    path('<int:community_id>/leave/',                   views.community_leave,  name='community-leave'),
    path('<int:community_id>/members/',                 views.member_list,      name='member-list'),
    path('<int:community_id>/members/<int:user_id>/kick/',      views.kick_member, name='kick-member'),
    path('<int:community_id>/members/<int:user_id>/role/',      views.change_role, name='change-role'),

    # ── Channels ────────────────────────────────────────────────────────────
    path('<int:community_id>/channels/',                views.channel_list_create, name='channel-list'),

    # ── Messages ────────────────────────────────────────────────────────────
    path(
        '<int:community_id>/channels/<int:channel_id>/messages/',
        views.message_list_create,
        name='message-list',
    ),
    path(
        '<int:community_id>/channels/<int:channel_id>/messages/<int:message_id>/',
        views.message_detail,
        name='message-detail',
    ),
    path(
        '<int:community_id>/channels/<int:channel_id>/messages/<int:message_id>/react/',
        views.message_react,
        name='message-react',
    ),
]