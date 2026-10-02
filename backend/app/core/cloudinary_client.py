import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings

def init_cloudinary():
    """Initializes Cloudinary SDK with config or CLOUDINARY_URL."""
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET

    if settings.CLOUDINARY_URL:
        os.environ["CLOUDINARY_URL"] = settings.CLOUDINARY_URL
        cloudinary.reset_config()
        cfg = cloudinary.config()
        if cfg.cloud_name:
            settings.CLOUDINARY_CLOUD_NAME = cfg.cloud_name
    else:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )

init_cloudinary()
