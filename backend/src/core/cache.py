import logging
from typing import Optional
import json
from redis import Redis
from redis.exceptions import ConnectionError
from uuid import UUID

logger = logging.getLogger(__name__)
redis = Redis(host="localhost", port=6379, decode_responses=True)

DASHBOARD_TTL = 60  # segundos


def get_cache(redis, key: str) -> Optional[dict]:
    try:
        raw = redis.get(key)
        return json.loads(raw) if raw else None
    except ConnectionError:
        return None

def set_cache(redis, key: str, value: dict, ttl: int = 60):
    try:
        redis.setex(key, ttl, json.dumps(value))
    except ConnectionError:
        pass

def get_dashboard_cache(merchant_id: UUID):
    try:
        key = f"dashboard:{merchant_id}"
        cached = redis.get(key)
        return json.loads(cached) if cached else None
    except ConnectionError:
        logger.warning("Redis no está disponible. Saltando caché del dashboard...")
        return None


def set_dashboard_cache(merchant_id: UUID, data: dict):
    try:
        key = f"dashboard:{merchant_id}"
        redis.setex(key, DASHBOARD_TTL, json.dumps(data, default=str)) # default=str to safely serialize dates and decimals
    except ConnectionError:
        pass
