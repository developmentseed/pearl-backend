"""Cache Plugin."""

from aiocache import cached, logger
from starlette.responses import Response


class api_cache(cached):
    """Custom Cached Decorator."""

    async def get_from_cache(self, key):
        try:
            value = await self.cache.get(key)
            if isinstance(value, Response):
                value.headers["X-Cache"] = "HIT"
            return value
        except Exception:
            logger.exception("Couldn't retrieve %s, unexpected error", key)
