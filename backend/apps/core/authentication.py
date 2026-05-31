"""
apps/core/authentication.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM DESIGN LESSON: Custom Authentication Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every request to a protected endpoint flows through this class FIRST.
It answers the question: "Who is making this request?"

The flow is:
  HTTP Request → ClerkAuthentication.authenticate()
    → Extract Bearer token from Authorization header
    → Fetch Clerk's public keys (JWKS) — cached so it's O(1) per request
    → Verify token signature, expiry, and claims
    → Look up the Django User by clerk_id (O(log n) with index)
    → Return (user, token) tuple → DRF sets request.user

WHY NOT SimpleJWT?
  Clerk already manages token issuance, expiry, and refresh in the browser.
  We only need to VERIFY the token, not issue it. SimpleJWT would be redundant.
"""

import jwt
from jwt import PyJWKClient
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

# ─── JWKS Client Cache ────────────────────────────────────────────────────────
# PERFORMANCE: We cache the JWKS client at module level (singleton pattern).
# Without caching, every request would fetch Clerk's public keys over the
# network — that's O(n) network calls for n requests. Cached = O(1).
_jwks_client = None


def get_jwks_client() -> PyJWKClient:
    """
    Return a cached JWKS client for Clerk JWT verification.

    JWKS = JSON Web Key Set (Clerk's public keys used to verify token signatures).
    lifespan=3600 means keys are refreshed every hour (Clerk rarely rotates them).
    """
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"https://{settings.CLERK_DOMAIN}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            jwks_url,
            cache_jwk_set=True,   # Cache the key set in memory
            lifespan=3600,        # Refresh every 1 hour
        )
    return _jwks_client


class ClerkAuthentication(BaseAuthentication):
    """
    DRF Authentication class that verifies Clerk-issued JWTs.

    Every protected endpoint will call authenticate() automatically
    because it's listed in REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'].

    Big-O:
      - JWKS fetch: O(1) after first request (cached)
      - JWT decode: O(1) — cryptographic signature check
      - DB lookup: O(log n) — clerk_id is indexed
      Total per request: O(log n)
    """

    def authenticate(self, request):
        """
        Extract and verify the Clerk JWT from the Authorization header.

        Returns:
            Tuple (user, token) if valid — DRF sets request.user = user
            None if no Authorization header — lets other authenticators try
            Raises AuthenticationFailed if token is present but invalid
        """
        auth_header = request.headers.get('Authorization', '')

        # If there's no Bearer token, return None (not an error).
        # DRF will then check DEFAULT_PERMISSION_CLASSES.
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        # ── Verify the token ──────────────────────────────────────────────
        try:
            signing_key = get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=['RS256'],          # Clerk uses RS256 (asymmetric)
                options={'verify_exp': True},  # Reject expired tokens
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired. Please sign in again.')
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f'Invalid authentication token: {exc}')

        # ── Extract Clerk User ID from token ──────────────────────────────
        clerk_id = payload.get('sub')  # 'sub' = subject = Clerk user ID
        if not clerk_id:
            raise AuthenticationFailed('Token is missing the subject (sub) claim.')

        # ── Find or create the Django user ────────────────────────────────
        # WHY get_or_create?
        # On first login, the Clerk webhook might not have fired yet.
        # This ensures we always have a Django user for the Clerk user.
        # Indexed on clerk_id → O(log n), not O(n) table scan.
        user, _ = User.objects.get_or_create(
            clerk_id=clerk_id,
            defaults={
                'username': clerk_id,
                'email': payload.get('email', ''),
            }
        )
        return (user, token)

    def authenticate_header(self, request) -> str:
        """
        Returned in the WWW-Authenticate header on 401 responses.
        Tells the client what authentication scheme to use.
        """
        return 'Bearer realm="LogosLight API"'