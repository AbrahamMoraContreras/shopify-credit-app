from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
from pydantic import ValidationError

from core.config import settings

ALGORITHM = "HS256"

def create_access_token(subject: Union[str, Any]) -> str:
    """
    Generates a JWT access token.
    `subject` is typically the merchant's UUID as a string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_ACCESS_TOKEN_SECRET, algorithm=ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    """
    Generates a JWT refresh token.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_REFRESH_TOKEN_SECRET, algorithm=ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str, is_refresh: bool = False) -> str | None:
    """
    Verifies a JWT token and returns the subject (merchant_id) if valid.
    """
    secret = (
        settings.JWT_REFRESH_TOKEN_SECRET
        if is_refresh
        else settings.JWT_ACCESS_TOKEN_SECRET
    )
    try:
        decoded_data = jwt.decode(token, secret, algorithms=[ALGORITHM])
        return decoded_data.get("sub")
    except jwt.PyJWTError:
        return None
