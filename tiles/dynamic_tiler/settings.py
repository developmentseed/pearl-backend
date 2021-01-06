"""app settings"""

import pydantic


class MosaicSettings(pydantic.BaseSettings):
    """Application settings"""

    backend: str
    host: str

    class Config:
        """model config"""

        env_prefix = "MOSAIC_"


mosaic_config = MosaicSettings()
