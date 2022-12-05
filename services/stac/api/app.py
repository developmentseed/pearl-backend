import json
import logging
import pathlib
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from stac_fastapi.api.app import StacApi
from stac_fastapi.api.models import create_get_request_model, create_post_request_model
from stac_fastapi.extensions.core import (
    ContextExtension,
    FieldsExtension,
    FilterExtension,
    SortExtension,
    TokenPaginationExtension,
    TransactionExtension,
)
from fastapi.responses import ORJSONResponse
from stac_fastapi.pgstac.config import Settings as STACSettings
from stac_fastapi.pgstac.core import CoreCrudClient
from stac_fastapi.pgstac.db import close_db_connection as stac_closedb
from stac_fastapi.pgstac.db import connect_to_db as stac_connectdb
from stac_fastapi.pgstac.extensions import QueryExtension
from stac_fastapi.pgstac.transactions import TransactionsClient
from stac_fastapi.pgstac.types.search import PgstacSearch

settings = STACSettings()

extensions = [
    TransactionExtension(
        client=TransactionsClient(),
        settings=settings,
        response_class=ORJSONResponse,
    ),
    QueryExtension(),
    SortExtension(),
    FieldsExtension(),
    TokenPaginationExtension(),
    ContextExtension(),
    FilterExtension(),
]

post_request_model = create_post_request_model(extensions, base_model=PgstacSearch)
# End Stac FastAPI Boiler Plate

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

app = FastAPI(
    title="Pearl Backend STAC",
    version="0.0.1",
    debug=True
)
app.state.settings = settings
app.state.router_prefix = ""


app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

stac = StacApi(
    settings=settings,
    extensions=extensions,
    client=CoreCrudClient(post_request_model=post_request_model),
    response_class=ORJSONResponse,
    search_get_request_model=create_get_request_model(extensions),
    search_post_request_model=post_request_model,
)
app.include_router(
    stac.router,
    prefix="/stac",
    tags=["STAC"],
)

@app.on_event("startup")
async def startup_event():
    """Application startup: register the db and create table list."""
    await stac_connectdb(app)

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown: de-register the db."""
    await stac_closedb(app)

@app.get(
    "/healthcheck",
    tags=["Management"],
)
async def healthcheck():
    """Always return 200 when running."""
    return {"Hello": "World"}

