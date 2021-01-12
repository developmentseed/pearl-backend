"""app settings"""

from functools import lru_cache

import pydantic
from typing import Optional


class MosaicSettings(pydantic.BaseSettings):
    """Application settings"""

    backend: str
    host: str

    class Config:
        """model config"""
        env_file = ".env"
        env_prefix = "MOSAIC_"


@lru_cache()
def mosaic_settings() -> MosaicSettings:
    """
    This function returns a cached instance of the APISettings object.
    Caching is used to prevent re-reading the environment every time the API settings are used in an endpoint.
    If you want to change an environment variable and reset the cache (e.g., during testing), this can be done
    using the `lru_cache` instance method `get_api_settings.cache_clear()`.

    From https://github.com/dmontagu/fastapi-utils/blob/af95ff4a8195caaa9edaa3dbd5b6eeb09691d9c7/fastapi_utils/api_settings.py#L60-L69
    """
    return MosaicSettings()


class CacheSettings(pydantic.BaseSettings):
    """Cache settings"""

    endpoint: Optional[str] = None
    ttl: int = 3600

    class Config:
        """model config"""

        env_prefix = "CACHE_"


@lru_cache()
def cache_settings() -> CacheSettings:
    """
    This function returns a cached instance of the APISettings object.
    Caching is used to prevent re-reading the environment every time the API settings are used in an endpoint.
    If you want to change an environment variable and reset the cache (e.g., during testing), this can be done
    using the `lru_cache` instance method `get_api_settings.cache_clear()`.

    From https://github.com/dmontagu/fastapi-utils/blob/af95ff4a8195caaa9edaa3dbd5b6eeb09691d9c7/fastapi_utils/api_settings.py#L60-L69
    """
    return CacheSettings()
