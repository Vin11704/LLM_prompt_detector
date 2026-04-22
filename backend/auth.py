import os
import secrets
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Response, Request, HTTPException, Depends
from model import LoginRequest

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

@router.post("/login")
async def login(req: LoginRequest, response: Response):
    env_username = os.getenv("username", "")
    env_password = os.getenv("password", "")

    # Prevent timing attacks
    is_username_correct = secrets.compare_digest(req.username, env_username)
    is_password_correct = secrets.compare_digest(req.password, env_password)

    if is_username_correct and is_password_correct:
        response.set_cookie(key="session_token", value="authenticated", httponly=True, samesite="lax")
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

def verify_session(request: Request):
    token = request.cookies.get("session_token")
    if token != "authenticated":
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token

@router.get("/check-auth")
async def check_auth(token: str = Depends(verify_session)):
    return {"message": "Authenticated"}
