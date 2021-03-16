"""app dependencies."""

import re
from base64 import b64decode

from fastapi import HTTPException, Query

from .settings import MosaicSettings


mosaic_settings = MosaicSettings()


def CustomMosaicParams(
    layer: str = Query(..., description="Mosaic Layer name ('{username}.{layer}')"),
):
    """Create mosaic path from args."""
    pattern = (
        r"^(?P<username>[a-zA-Z0-9-_]{1,32})\.(?P<layername>[a-zA-Z0-9-_]{1,32})$"
    )
    match = re.match(pattern, layer)
    if not match:
        raise HTTPException(
            status_code=400, detail=f"Invalid layer name: `{layer}`",
        )

    meta = match.groupdict()
    username = meta["username"]
    layername = meta["layername"]

    return f"{mosaic_settings.backend}{mosaic_settings.host}:{layer}"


def CustomPathParams(
    url: str = Query(..., description="Dataset URL"),
    url_params: str = Query(None, description="Base64 encoded Query parameters to add to the dataset URL."),
) -> str:
    """DatasetPath Params."""
    if url_params:
        url += f"{b64decode(url_params).decode()}"
    return url
