import os
import secrets
import time
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Response, Request, HTTPException, Depends
from model import LoginRequest

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "3600"))  # 1 hour default
SECURE_COOKIES = os.getenv("SECURE_COOKIES", "true").lower() != "false"

# Server-side session store
# In production, replace with Redis or a database
_sessions: dict[str, dict] = {}


def _cleanup_expired_sessions():
    """Remove expired sessions."""
    now = time.time()
    expired = [k for k, v in _sessions.items() if now - v["created"] > SESSION_MAX_AGE]
    for k in expired:
        del _sessions[k]


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    env_username = os.getenv("AUTH_username", "")
    env_password = os.getenv("AUTH_password", "")

    # Prevent timing attacks
    is_username_correct = secrets.compare_digest(req.username, env_username)
    is_password_correct = secrets.compare_digest(req.password, env_password)

    if is_username_correct and is_password_correct:
        _cleanup_expired_sessions()

        token = secrets.token_urlsafe(32)
        _sessions[token] = {"user": req.username, "created": time.time()}
        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            secure=SECURE_COOKIES,
            samesite="lax",
            max_age=SESSION_MAX_AGE,
        )
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token and token in _sessions:
        del _sessions[token]
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}


def verify_session(request: Request):
    token = request.cookies.get("session_token")
    if not token or token not in _sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = _sessions[token]
    if time.time() - session["created"] > SESSION_MAX_AGE:
        del _sessions[token]
        raise HTTPException(status_code=401, detail="Session expired")

    return token


@router.get("/check-auth")
async def check_auth(token: str = Depends(verify_session)):
    return {"message": "Authenticated"}
