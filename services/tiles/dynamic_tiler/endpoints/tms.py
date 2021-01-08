"""TMS Api."""

from titiler.dependencies import WebMercatorTileMatrixSetName, WebMercatorTMSParams
from titiler.endpoints.factory import TMSFactory

router = TMSFactory(
    supported_tms=WebMercatorTileMatrixSetName,
    tms_dependency=WebMercatorTMSParams,
).router  # noqa
