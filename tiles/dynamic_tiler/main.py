"""Dynamic Tiler app."""

from brotli_asgi import BrotliMiddleware
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from titiler.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from titiler.middleware import CacheControlMiddleware

from .endpoints import mosaic


app = FastAPI(title="LULC Dynamic Map Tile Services", version="0.1.0")
app.include_router(mosaic.router, prefix="/mosaic", tags=["Mosaic"])

add_exception_handlers(app, DEFAULT_STATUS_CODES)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)
app.add_middleware(BrotliMiddleware, minimum_size=0, gzip_fallback=True)
app.add_middleware(CacheControlMiddleware, cachecontrol="public, max-age=3600")


@app.get("/healthz", description="Health Check", tags=["Health Check"])
def ping():
    """Health check."""
    return {"ping": "pong!"}
