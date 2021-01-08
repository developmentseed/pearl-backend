"""Dynamic Tiler app."""

import urllib

import aiocache
from brotli_asgi import BrotliMiddleware
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from titiler.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from titiler.middleware import CacheControlMiddleware

from .endpoints import mosaic
from .settings import cache_settings

CacheSettings = cache_settings()


app = FastAPI(title="LULC Dynamic Map Tile Services", version="0.1.0")
app.include_router(mosaic.router, prefix="/mosaic", tags=["Mosaic"])

add_exception_handlers(app, DEFAULT_STATUS_CODES)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(BrotliMiddleware, minimum_size=0, gzip_fallback=True)
app.add_middleware(CacheControlMiddleware, cachecontrol="public, max-age=3600")


@app.get("/healthz", description="Health Check", tags=["Health Check"])
def ping():
    """Health check."""
    return {"ping": "pong!"}


@app.on_event("startup")
def initialize_caches():
    """ Initialize the cache """
    config = {
        'cache': "aiocache.SimpleMemoryCache",
        'ttl': CacheSettings.ttl,
        'serializer': {
            'class': "aiocache.serializers.PickleSerializer"
        }
    }

    if CacheSettings.endpoint:
        url = urllib.parse.urlparse(CacheSettings.endpoint)
        ulr_config = dict(urllib.parse.parse_qsl(url.query))
        config.update(ulr_config)

        cache_class = aiocache.Cache.get_scheme_class(url.scheme)
        config.update(cache_class.parse_uri_path(url.path))
        config["endpoint"] = url.hostname
        config["port"] = str(url.port)

        if url.password:
            config["password"] = url.password

        if cache_class == aiocache.Cache.REDIS:
            config["cache"] = "aiocache.RedisCache"
        elif cache_class == aiocache.Cache.MEMCACHED:
            config["cache"] = "aiocache.MemcachedCache"

    aiocache.caches.set_config({"default": config})
