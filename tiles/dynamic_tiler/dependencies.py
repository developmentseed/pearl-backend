"""app dependencies."""

import re
from dataclasses import dataclass

from fastapi import HTTPException, Query

from .settings import mosaic_settings


mosaic_config = mosaic_settings()


@dataclass
class MosaicParams:
    """Create mosaic path from args"""

    layer: str = Query(..., description="Mosaic Layer name ('{username}.{layer}')")

    def __post_init__(self,):
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

        self.url = f"{mosaic_config.backend}{mosaic_config.host}:{self.layer}"
