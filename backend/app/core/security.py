import logging
from typing import Any

import jwt
from jwt import PyJWKClient

from app.config import settings

logger = logging.getLogger(__name__)

_jwk_client: PyJWKClient | None = None


class ClerkTokenError(Exception):
    pass


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.jwks_url)
    return _jwk_client


def verify_clerk_token(token: str) -> dict[str, Any]:
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        
        # Clerk issuer might have a trailing slash or not. 
        # We allow both to be safe, or just rely on the exact match if we're sure.
        # Most Clerk tokens have the issuer without the trailing slash.
        issuers = []
        if settings.clerk_issuer:
            clean_iss = settings.clerk_issuer.rstrip("/")
            issuers = [clean_iss, f"{clean_iss}/"]

        # Use leeway to handle clock skew (common with Clerk/distributed systems)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuers if issuers else None,
            leeway=60,
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        logger.error("Token has expired: %s", str(exc))
        raise ClerkTokenError("Token has expired. Please sign in again.") from exc
    except jwt.InvalidIssuerError as exc:
        logger.error("Invalid issuer: %s. Expected one of: %s", str(exc), issuers)
        raise ClerkTokenError("Invalid token issuer") from exc
    except jwt.PyJWTError as exc:
        logger.error("JWT verification failed: %s", str(exc))
        raise ClerkTokenError("Invalid or expired token") from exc
    except Exception as exc:
        logger.error("Unexpected error during token verification: %s", str(exc))
        raise ClerkTokenError("Authentication error") from exc
