import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "PressWire Ingestion & Syndication API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Cloudinary configuration
    CLOUDINARY_CLOUD_NAME: str = "presswire_newsroom"
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_URL: Optional[str] = None
    
    # Default folder for uploads
    CLOUDINARY_FOLDER: str = "presswire"

settings = Settings()
