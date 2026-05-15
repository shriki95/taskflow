import json
import os
import hmac
import hashlib
import base64
import uuid
from datetime import datetime, timedelta
from typing import Optional

import boto3
import jwt

TABLE_NAME = os.environ.get('TABLE_NAME', 'task-management-dev')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGORITHM = 'HS256'

_table = None


def get_table():
    global _table
    if _table is None:
        _table = boto3.resource('dynamodb').Table(TABLE_NAME)
    return _table


def response(status_code: int, body: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        'body': json.dumps(body, default=str),
    }


def error(status_code: int, message: str) -> dict:
    return response(status_code, {'error': message})


def get_body(event: dict) -> dict:
    try:
        return json.loads(event.get('body') or '{}')
    except (json.JSONDecodeError, TypeError):
        return {}


def create_token(user_id: str, email: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_current_user(event: dict) -> Optional[dict]:
    headers = event.get('headers') or {}
    auth_header = headers.get('authorization') or headers.get('Authorization') or ''
    if not auth_header.startswith('Bearer '):
        return None
    return verify_token(auth_header[7:])


def require_auth(event: dict):
    user = get_current_user(event)
    if not user:
        return None, error(401, 'Unauthorized')
    return user, None


def hash_password(password: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return base64.b64encode(salt + key).decode('ascii')


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        decoded = base64.b64decode(stored_hash.encode('ascii'))
        salt, stored_key = decoded[:32], decoded[32:]
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
        return hmac.compare_digest(key, stored_key)
    except Exception:
        return False


def now_iso() -> str:
    return datetime.utcnow().isoformat() + 'Z'


def new_id() -> str:
    return str(uuid.uuid4())


AVATAR_COLORS = [
    '#7c3aed', '#2563eb', '#059669', '#d97706',
    '#dc2626', '#db2777', '#0891b2', '#4f46e5',
]


def pick_color(seed: str) -> str:
    return AVATAR_COLORS[abs(hash(seed)) % len(AVATAR_COLORS)]
