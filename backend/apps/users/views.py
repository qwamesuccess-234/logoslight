"""
apps/users/views.py
━━━━━━━━━━━━━━━━━━━
Two responsibilities:
  1. UserViewSet     → Profile read/update (authenticated)
  2. ClerkWebhookView → Sync Clerk user events to our database

SYSTEM DESIGN: Clerk Webhook Flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When someone signs up on Clerk, Clerk calls our webhook:
  Clerk → POST /webhooks/clerk/ → ClerkWebhookView → creates User in our DB

This ensures our database always has a record for every Clerk user,
even if they've never made an API request.

Webhook events we handle:
  user.created  → create User row
  user.updated  → update name/email
  user.deleted  → delete User row (cascades to all their data via FK)
"""
from svix.webhooks import Webhook, WebhookVerificationError
from rest_framework import mixins, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from django.conf import settings
from django.contrib.auth import get_user_model

from .serializers import UserProfileSerializer, UserUpdateSerializer

User = get_user_model()


class UserViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Profile endpoints (no list/create/delete — use /me/ for your own profile).

    GET    /api/v1/auth/users/me/       → current user's profile
    PUT    /api/v1/auth/users/me/       → update profile
    PATCH  /api/v1/auth/users/me/       → partial update
    GET    /api/v1/auth/users/{id}/     → public profile by id
    """
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me')
    def me(self, request):
        """
        GET  → return current user's profile
        PUT  → update current user's profile
        PATCH → partial update
        """
        if request.method == 'GET':
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data)

        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=(request.method == 'PATCH')
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data)


class ClerkWebhookView(APIView):
    """
    Receives and processes Clerk user lifecycle events.

    SECURITY: This endpoint is AllowAny (Clerk can't send a JWT — it IS the
    auth provider). Instead, we verify the svix HMAC signature. Any request
    without a valid signature from our CLERK_WEBHOOK_SECRET is rejected.

    Big-O: O(log n) per event — single indexed DB operation.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # No JWT auth for webhooks

    def post(self, request):
        # ── Step 1: Verify the webhook signature ─────────────────────────
        # Without this check, anyone could fake user.deleted events and
        # wipe your entire user database.
        wh = Webhook(settings.CLERK_WEBHOOK_SECRET)
        headers = {
            'svix-id':        request.headers.get('svix-id', ''),
            'svix-timestamp': request.headers.get('svix-timestamp', ''),
            'svix-signature': request.headers.get('svix-signature', ''),
        }
        try:
            payload = wh.verify(request.body, headers)
        except WebhookVerificationError:
            return Response(
                {'error': 'Webhook signature verification failed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Step 2: Handle the event type ─────────────────────────────────
        event_type = payload.get('type')
        data = payload.get('data', {})

        if event_type == 'user.created':
            # Primary email (Clerk users can have multiple)
            primary_email = ''
            if data.get('email_addresses'):
                primary_email = data['email_addresses'][0].get('email_address', '')

            User.objects.get_or_create(
                clerk_id=data['id'],
                defaults={
                    'username': data.get('username') or data['id'],
                    'email': primary_email,
                    'first_name': data.get('first_name', ''),
                    'last_name': data.get('last_name', ''),
                }
            )

        elif event_type == 'user.updated':
            primary_email = ''
            if data.get('email_addresses'):
                primary_email = data['email_addresses'][0].get('email_address', '')

            User.objects.filter(clerk_id=data['id']).update(
                email=primary_email,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
            )

        elif event_type == 'user.deleted':
            # CASCADE: deletes all their notes, posts, etc. via FK relationships
            User.objects.filter(clerk_id=data['id']).delete()

        return Response({'status': 'ok'})
