import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

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
    
    # Database configuration (SQLite WAL for local/hackathon, PostgreSQL in production)
    DATABASE_URL: str = "sqlite+aiosqlite:///data/presswire.db"
    DATABASE_SYNC_URL: str = "sqlite:///data/presswire.db"

settings = Settings()
