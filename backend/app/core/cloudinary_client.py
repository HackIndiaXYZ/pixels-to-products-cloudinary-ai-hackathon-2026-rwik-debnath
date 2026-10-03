import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings

def init_cloudinary():
    """Initializes Cloudinary SDK with config or CLOUDINARY_URL."""
    url = settings.CLOUDINARY_URL or os.environ.get("CLOUDINARY_URL")

    if url:
        clean_url = url.strip().strip("'\"")
        os.environ["CLOUDINARY_URL"] = clean_url
        settings.CLOUDINARY_URL = clean_url
        cloudinary.reset_config()
        cfg = cloudinary.config()
        if cfg.cloud_name:
            settings.CLOUDINARY_CLOUD_NAME = cfg.cloud_name
        if cfg.api_key:
            settings.CLOUDINARY_API_KEY = cfg.api_key
        if cfg.api_secret:
            settings.CLOUDINARY_API_SECRET = cfg.api_secret
    else:
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )

init_cloudinary()
