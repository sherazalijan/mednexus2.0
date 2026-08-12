import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# CHANGE: slowapi's default in-memory storage is per-process. On a
# serverless deployment (multiple concurrent instances, no shared memory)
# an in-memory limiter is easy to bypass — each cold-started instance
# starts its own counter at zero. If REDIS_URL is set, use it as the
# shared counter store so limits actually hold across instances. Without
# Redis, this still works correctly on a single persistent process (e.g.
# Render/Fly.io/Railway) — just not across multiple serverless instances.
REDIS_URL = os.getenv("REDIS_URL")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=REDIS_URL if REDIS_URL else "memory://",
)
