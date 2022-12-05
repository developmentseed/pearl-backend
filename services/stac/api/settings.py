"""Settings for STAC app."""

import os
from typing import Optional

import boto3
import orjson
import pydantic

class Settings(PostgresSettings):
    """Settings for RICR API."""

    name: str = "RICR"
    cors_origins: str = "*"
    debug: bool = True
    session_secret_key: str
    oauth_client_id: str
    oauth_client_secret: str
    oauth_authorize_url: str
    oauth_token_url: str
    oauth_redirect_uri: str
    oauth_user_url: Optional[str] = None
    ricr_base_url: Optional[str] = None
    mc_test_noauth: bool = False

    @pydantic.validator("cors_origins")
    def parse_cors_origin(cls, v):
        """Parse CORS origins."""
        return [origin.strip() for origin in v.split(",")]

    class Config:
        """Model config."""

        env_file = ".env"


if "SecretARN" in os.environ:
    set_env_from_secrets()

settings = Settings()
