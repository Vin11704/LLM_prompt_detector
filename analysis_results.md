# Authentication Vulnerability Analysis

**Scope:** [auth.py](file:///d:/cloudsine/backend/auth.py), [main.py](file:///d:/cloudsine/backend/main.py), [deploy.ps1](file:///d:/cloudsine/deploy.ps1), [.env](file:///d:/cloudsine/.env), frontend auth flow

---

## Summary

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | Static, guessable session token | 🔴 **Critical** | `auth.py:23, 34` |
| 2 | Missing `Secure` flag on cookie | 🔴 **Critical** | `auth.py:23` |
| 3 | Plaintext credentials in `.env` deployed to Cloud Run | 🟠 **High** | `.env:4-5`, `deploy.ps1:10-21` |
| 4 | Wildcard CORS `allow_origins=["*"]` | 🟠 **High** | `main.py:19` |
| 5 | No brute-force / rate-limit protection | 🟡 **Medium** | `auth.py:13` |
| 6 | No session expiry or rotation | 🟡 **Medium** | `auth.py:23` |
| 7 | Env var name collision (`username`) | 🟡 **Medium** | `auth.py:15` |
| 8 | Missing CSRF protection | 🟡 **Medium** | `auth.py:23` |

---

## Detailed Findings

### 1. 🔴 Critical — Static, Guessable Session Token

> [!CAUTION]
> This is the most severe vulnerability. Any attacker can forge a valid session without ever logging in.

**Location:** [auth.py:23](file:///d:/cloudsine/backend/auth.py#L23), [auth.py:34](file:///d:/cloudsine/backend/auth.py#L34)

The session cookie is set to the **literal string `"authenticated"`** and verified by comparing against that same literal:

```python
# auth.py:23 — Setting the cookie
response.set_cookie(key="session_token", value="authenticated", ...)

# auth.py:34 — Verifying the cookie
if token != "authenticated":
    raise HTTPException(status_code=401, detail="Not authenticated")
```

**Impact:** An attacker can bypass authentication entirely by manually setting the cookie:
```
Cookie: session_token=authenticated
```
No login is needed. Every user shares the same "token" — there is **no real session**.

**Recommended Fix:** Generate a cryptographically random token per login using `secrets.token_urlsafe()` and store active sessions server-side (e.g., in a dictionary, database, or Redis):

```python
import secrets

sessions = {}  # In production, use Redis or a database

@router.post("/login")
async def login(req: LoginRequest, response: Response):
    # ... credential check ...
    token = secrets.token_urlsafe(32)
    sessions[token] = {"user": req.username, "created": time.time()}
    response.set_cookie(key="session_token", value=token, httponly=True, secure=True, samesite="lax")
    return {"message": "Login successful"}

def verify_session(request: Request):
    token = request.cookies.get("session_token")
    if not token or token not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sessions[token]
```

---

### 2. 🔴 Critical — Missing `Secure` Flag on Cookie

**Location:** [auth.py:23](file:///d:/cloudsine/backend/auth.py#L23)

```python
response.set_cookie(key="session_token", value="authenticated", httponly=True, samesite="lax")
#                                                                                  ^ no secure=True
```

**Impact:** The cookie will be sent over unencrypted HTTP connections, allowing a man-in-the-middle attacker to intercept the session token. Since this app is deployed to Cloud Run (HTTPS), the `Secure` flag should always be set in production.

**Recommended Fix:**
```python
response.set_cookie(
    key="session_token",
    value=token,
    httponly=True,
    secure=True,       # Only send over HTTPS
    samesite="lax",
    max_age=3600,      # Also add an expiry
)
```

---

### 3. 🟠 High — Plaintext Credentials Deployed as Environment Variables

**Location:** [.env:4-5](file:///d:/cloudsine/.env#L4-L5), [deploy.ps1:10-21](file:///d:/cloudsine/deploy.ps1#L10-L21)

The `.env` file stores credentials in plaintext:
```
username="mks"
password="DoAnythingNow304"
```

The deployment script (`deploy.ps1`) reads **all non-comment, non-`GOOGLE_APPLICATION_CREDENTIALS` lines** from `.env` and passes them as `--set-env-vars` to Cloud Run. This means the username and password end up as plaintext environment variables visible in the Cloud Run console and to any IAM principal with `run.services.get` permission.

> [!WARNING]
> The `.env` file is in `.gitignore` (good), but the deploy script injects credentials into the Cloud Run service metadata where they are visible to anyone with project access.

**Recommended Fix:**
- Use **Google Secret Manager** to store credentials and mount them as secrets in Cloud Run.
- At minimum, use `--set-secrets` instead of `--set-env-vars` in the deploy command.

---

### 4. 🟠 High — Wildcard CORS Policy

**Location:** [main.py:17-22](file:///d:/cloudsine/backend/main.py#L17-L22)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ← Allows ANY origin
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

**Impact:** With `allow_origins=["*"]`, any website can make cross-origin requests to this API. Combined with cookie-based auth (`samesite="lax"` allows GET requests from cross-origin navigations), this weakens the authentication boundary. A malicious page could probe `/auth/check-auth` to fingerprint logged-in users.

> [!IMPORTANT]
> `allow_origins=["*"]` with `allow_credentials=True` is blocked by browsers, but the current config doesn't set `allow_credentials=True` — which means **cookies are NOT sent on cross-origin fetch requests** unless the frontend explicitly uses `credentials: 'include'`. However, since the frontend is served from the same origin this works for the intended flow, but the wildcard still needlessly expands the attack surface.

**Recommended Fix:** Restrict to the actual deployment origin:
```python
allow_origins=["https://llmsecurity-main-<hash>.a.run.app"],
```

---

### 5. 🟡 Medium — No Brute-Force / Rate-Limit Protection

**Location:** [auth.py:13-25](file:///d:/cloudsine/backend/auth.py#L13-L25)

The `/auth/login` endpoint has no rate limiting, account lockout, or exponential backoff. An attacker can make unlimited login attempts.

**Recommended Fix:** Add rate limiting with a library like `slowapi`:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(req: LoginRequest, response: Response, request: Request):
    ...
```

---

### 6. 🟡 Medium — No Session Expiry or Rotation

**Location:** [auth.py:23](file:///d:/cloudsine/backend/auth.py#L23)

The cookie is set without a `max_age` or `expires`, making it a **session cookie** (deleted when the browser closes). However:
- There is no server-side expiry since the token is just a static string
- There is no session rotation after login (no new token on re-auth)
- Logout only deletes the client-side cookie — since the token is `"authenticated"`, replaying it still works

**Recommended Fix:** Set `max_age` on the cookie and implement server-side session tracking with expiry (see Finding #1's fix).

---

### 7. 🟡 Medium — Environment Variable Name Collision

**Location:** [auth.py:15](file:///d:/cloudsine/backend/auth.py#L15)

```python
env_username = os.getenv("username", "")
```

`username` is a common system environment variable (on Windows it resolves to the logged-in OS user). If the `.env` file fails to load, `os.getenv("username")` could silently return the OS username instead of an empty string, potentially allowing unintended access.

**Recommended Fix:** Use prefixed, distinct names:
```python
env_username = os.getenv("APP_AUTH_USERNAME", "")
env_password = os.getenv("APP_AUTH_PASSWORD", "")
```

---

### 8. 🟡 Medium — Missing CSRF Protection

**Location:** [auth.py:23](file:///d:/cloudsine/backend/auth.py#L23)

While `samesite="lax"` prevents cookies from being sent on cross-origin POST requests (mitigating the most common CSRF vectors), there is no explicit CSRF token mechanism. If the `SameSite` policy is relaxed or a browser bug exists, POST-based endpoints like `/evaluate` and `/parse` would be vulnerable.

**Recommended Fix:** For defense-in-depth, consider adding a CSRF token validated on state-changing requests, or switch to `samesite="strict"`.

---

## Good Practices Already Present ✅

| Practice | Location |
|----------|----------|
| `secrets.compare_digest()` for timing-safe comparison | `auth.py:19-20` |
| `httponly=True` on cookie (prevents JS access) | `auth.py:23` |
| `.env` in `.gitignore` | `.gitignore:1` |
| Credentials not in `.env.example` | `.env.example` |
| `LoginRequest` Pydantic model validates input shape | `model.py:4-6` |
| Frontend clears inputs after successful login | `app.js:426-427` |
