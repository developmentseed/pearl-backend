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
from stac_fastapi.pgstac.config import Settings as STACSettings
from stac_fastapi.pgstac.core import CoreCrudClient
from stac_fastapi.pgstac.db import close_db_connection as stac_closedb
from stac_fastapi.pgstac.db import connect_to_db as stac_connectdb
from stac_fastapi.pgstac.extensions import QueryExtension
from stac_fastapi.pgstac.transactions import TransactionsClient
from stac_fastapi.pgstac.types.search import PgstacSearch

# Boiler Plate for Stac FastApi PGStac
class Settings(STACSettings):
    ...


settings = Settings()

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
    debug=settings.debug,
)
app.state.settings = settings
app.state.router_prefix = ""


app.add_middleware(StacRouteFixMiddleware)

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
    dependencies=[Depends(authenticated)],
    prefix="/stac",
    tags=["STAC"],
)

"""
    Setup API doc over-rides for individual endpoints
"""


def custom_openapi():
    """
    Read JSON files from folder with over-rides for summaries and descriptions for specific paths and
    over-write the same in the OpenAPI schema.
    """
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = app.openapi()
    for f in TAGS_JSON_FILES:
        with f.open() as tags:
            endpoints = json.load(tags)
        for endpoint in endpoints:
            if (
                endpoint["path"] not in openapi_schema["paths"]
                or endpoint["method"] not in openapi_schema["paths"][endpoint["path"]]
            ):
                logger.warn(f"Endpoint not configured correctly for {endpoint['path']}")
                continue
            openapi_schema["paths"][endpoint["path"]][endpoint["method"]][
                "summary"
            ] = endpoint["summary"]
            openapi_schema["paths"][endpoint["path"]][endpoint["method"]][
                "description"
            ] = endpoint["description"]
    return openapi_schema


app.openapi_schema = custom_openapi()


@app.on_event("startup")
@app.get(
    "/reload", dependencies=[Depends(authenticated)], tags=["Management"]
)  # reload is useful to be able to refresh the table catalog from the database
async def startup_event():
    """Application startup: register the db and create table list."""
    # stac-fastapi, tifeatures, and timvt all have there own nearly identical connect_to_db functions we should sync them up so that we make sure to use a single connection pool across all three
    await connect_to_db(app)
    await stac_connectdb(app)

    # table catalog between tifeatures and timvt should be synced up and ideally we just use the same catalog for both
    await register_table_catalog(app)
    return {"Refreshed": True}


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown: de-register the db."""
    await close_db_connection(app)
    await stac_closedb(app)

@app.get(
    "/healthcheck",
    tags=["Management"],
)
async def healthcheck():
    """Always return 200 when running."""
    return {"Hello": "World"}

