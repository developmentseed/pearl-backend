"""app dependencies."""

import re
from base64 import b64decode
from dataclasses import dataclass

from fastapi import HTTPException, Query

from titiler.dependencies import DefaultDependency

from .settings import MosaicSettings


mosaic_settings = MosaicSettings()


@dataclass
class MosaicParams(DefaultDependency):
    """Create mosaic path from args"""

    layer: str = Query(..., description="Mosaic Layer name ('{username}.{layer}')")

    def __post_init__(self):
        """Define mosaic URL."""
        pattern = (
            r"^(?P<username>[a-zA-Z0-9-_]{1,32})\.(?P<layername>[a-zA-Z0-9-_]{1,32})$"
        )
        match = re.match(pattern, self.layer)
        if not match:
            raise HTTPException(
                status_code=400, detail=f"Invalid layer name: `{self.layer}`",
            )

        meta = match.groupdict()
        self.username = meta["username"]
        self.layername = meta["layername"]

        self.url = f"{mosaic_settings.backend}{mosaic_settings.host}:{self.layer}"


@dataclass
class CustomPathParams(DefaultDependency):

    url: str = Query(..., description="Dataset URL")
    url_params: str = Query(None, description="Base64 encoded Query parameters to add to the dataset URL.")

    def __post_init__(self):
        """Parse url_params."""
        if self.url_params:
            self.url += f"?{b64decode(self.url_params).decode()}"
