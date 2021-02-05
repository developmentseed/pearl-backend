"""TiTiler COG endpoint."""

from titiler.endpoints.factory import TilerFactory


cog = TilerFactory(router_prefix="cog")
router = cog.router  # noqa
