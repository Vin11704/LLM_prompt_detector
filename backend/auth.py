import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Response, Request, HTTPException, Depends
from model import LoginRequest

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "3600"))  # 1 hour default
SECURE_COOKIES = True
COOKIE_NAME = "session_token"

# Stateless, HMAC-signed session tokens.
#
# The session lives entirely in the signed cookie — there is no server-side
# store — so authentication works across any number of Cloud Run instances and
# survives instance restarts / scale-to-zero. SESSION_SECRET MUST be a stable
# value shared by every instance; if it changes, all existing sessions are
# invalidated. In local dev an ephemeral secret is generated (fine for a single
# process) but a warning is logged.
SESSION_SECRET = os.getenv("SESSION_SECRET")
if not SESSION_SECRET:
    SESSION_SECRET = secrets.token_urlsafe(32)
    logger.warning(
        "SESSION_SECRET is not set — using an ephemeral per-process secret. "
        "Sessions will NOT be valid across instances or restarts. "
        "Set SESSION_SECRET in the environment for production."
    )
_SECRET_BYTES = SESSION_SECRET.encode("utf-8")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload_b64: str) -> str:
    sig = hmac.new(_SECRET_BYTES, payload_b64.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(sig)


def _create_token(username: str) -> str:
    payload = {"user": username, "iat": int(time.time())}
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{payload_b64}.{_sign(payload_b64)}"


def _verify_token(token: str) -> dict:
    """Return the decoded payload if the token is valid, else raise ValueError."""
    try:
        payload_b64, sig = token.split(".", 1)
    except ValueError:
        raise ValueError("Malformed token")

    expected_sig = _sign(payload_b64)
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Bad signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        raise ValueError("Malformed payload")

    if time.time() - payload.get("iat", 0) > SESSION_MAX_AGE:
        raise ValueError("Session expired")

    return payload


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    env_username = os.getenv("AUTH_username", "")
    env_password = os.getenv("AUTH_password", "")

    # Prevent timing attacks
    is_username_correct = secrets.compare_digest(req.username, env_username)
    is_password_correct = secrets.compare_digest(req.password, env_password)

    if is_username_correct and is_password_correct:
        token = _create_token(req.username)
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            secure=SECURE_COOKIES,
            samesite="none",
            max_age=SESSION_MAX_AGE,
        )
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.post("/logout")
async def logout(request: Request, response: Response):
    # Stateless tokens can't be revoked server-side; clearing the cookie is
    # sufficient for this single-user tool.
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Logged out successfully"}


def verify_session(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = _verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return payload["user"]


@router.get("/check-auth")
async def check_auth(user: str = Depends(verify_session)):
    return {"message": "Authenticated"}
