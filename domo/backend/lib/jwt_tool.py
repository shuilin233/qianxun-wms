"""JWT令牌 — 纯Python stdlib实现（无需flask-jwt-extended）"""
import json, time, hmac, hashlib, base64, os

SECRET = None  # 由运行时的 config 设置

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)

def create_token(user_id: int, username: str = "", role: str = "", expires_seconds: int = 604800) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = int(time.time())
    payload = _b64url_encode(json.dumps({
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + expires_seconds,
    }).encode())
    signing_input = f"{header}.{payload}"
    sig = hmac.new(SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"

def verify_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        expected_sig = _b64url_encode(hmac.new(SECRET.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig_b64, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_user_id(payload: dict) -> int:
    return int(payload["sub"])

def get_username(payload: dict) -> str:
    return payload.get("username", "")

def get_role(payload: dict) -> str:
    return payload.get("role", "")
