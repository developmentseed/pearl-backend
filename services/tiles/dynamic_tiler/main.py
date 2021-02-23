"""Dynamic Tiler app."""

from brotli_asgi import BrotliMiddleware
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from titiler.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from titiler.middleware import CacheControlMiddleware, TotalTimeMiddleware
from titiler.endpoints.factory import TilerFactory, TMSFactory
from titiler.resources.enums import OptionalHeaders

from .endpoints.factory import MosaicTilerFactory
from .cache import setup_cache
from .settings import ApiSettings


api_settings = ApiSettings()

app = FastAPI(title="LULC Dynamic Map Tile Services", version="0.1.0")
app.add_middleware(BrotliMiddleware, minimum_size=0, gzip_fallback=True)
app.add_middleware(CacheControlMiddleware, cachecontrol=api_settings.cachecontrol)
if api_settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=api_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

optional_headers = []
if api_settings.debug:
    app.add_middleware(TotalTimeMiddleware)
    optional_headers = [OptionalHeaders.x_assets, OptionalHeaders.server_timing]

app.add_event_handler("startup", setup_cache)
add_exception_handlers(app, DEFAULT_STATUS_CODES)

mosaic_endpoint = MosaicTilerFactory(
    router_prefix="mosaic", optional_headers=optional_headers
)
app.include_router(mosaic_endpoint.router, prefix="/mosaic", tags=["Mosaic"])

cog_endpoints = TilerFactory(router_prefix="cog", optional_headers=optional_headers)
app.include_router(cog_endpoints.router, prefix="/cog", tags=["COG"])

tms_endpoint = TMSFactory()
app.include_router(tms_endpoint.router,  tags=["TileMatrixSets"])


@app.get("/healthz", description="Health Check", tags=["Health Check"])
def ping():
    """Health check."""
    return {"ping": "pong!"}
