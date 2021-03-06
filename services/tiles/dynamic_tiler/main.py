"""Dynamic Tiler app."""

from brotli_asgi import BrotliMiddleware
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from titiler.core.factory import TMSFactory
from titiler.core.resources.enums import OptionalHeader
from titiler.application.middleware import CacheControlMiddleware, TotalTimeMiddleware
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from titiler.mosaic.errors import MOSAIC_STATUS_CODES

from .endpoints.factory import MosaicTilerFactory, CustomTilerFactory
from .cache import setup_cache
from .settings import ApiSettings
from .dependencies import CustomPathParams, CustomMosaicParams


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
    optional_headers = [OptionalHeader.x_assets, OptionalHeader.server_timing]

app.add_event_handler("startup", setup_cache)
add_exception_handlers(app, DEFAULT_STATUS_CODES)
add_exception_handlers(app, MOSAIC_STATUS_CODES)

mosaic_endpoint = MosaicTilerFactory(
    path_dependency=CustomMosaicParams,
    router_prefix="mosaic",
    optional_headers=optional_headers,
)
app.include_router(mosaic_endpoint.router, prefix="/mosaic", tags=["Mosaic"])

cog_endpoints = CustomTilerFactory(
    path_dependency=CustomPathParams,
    router_prefix="cog",
    optional_headers=optional_headers,
)
app.include_router(cog_endpoints.router, prefix="/cog", tags=["COG"])

tms_endpoint = TMSFactory()
app.include_router(tms_endpoint.router, tags=["TileMatrixSets"])


@app.get("/healthz", description="Health Check", tags=["Health Check"])
def ping():
    """Health check."""
    return {"ping": "pong!"}
