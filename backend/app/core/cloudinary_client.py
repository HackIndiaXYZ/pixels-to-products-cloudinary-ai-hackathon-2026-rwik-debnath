import os
import re
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings

def init_cloudinary():
    """Initializes Cloudinary SDK with config or CLOUDINARY_URL."""
    raw_url = os.environ.get("CLOUDINARY_URL") or settings.CLOUDINARY_URL
    api_key = os.environ.get("CLOUDINARY_API_KEY") or settings.CLOUDINARY_API_KEY
    api_secret = os.environ.get("CLOUDINARY_API_SECRET") or settings.CLOUDINARY_API_SECRET
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME") or settings.CLOUDINARY_CLOUD_NAME

    if raw_url:
        clean_url = str(raw_url).strip().strip("'\"")
        os.environ["CLOUDINARY_URL"] = clean_url
        settings.CLOUDINARY_URL = clean_url
        
        # Parse cloudinary://<api_key>:<api_secret>@<cloud_name>
        m = re.match(r"cloudinary://([^:]+):([^@]+)@([^\s/\?]+)", clean_url)
        if m:
            api_key = api_key or m.group(1).strip()
            api_secret = api_secret or m.group(2).strip()
            cloud_name = cloud_name or m.group(3).strip()

    if cloud_name:
        settings.CLOUDINARY_CLOUD_NAME = str(cloud_name).strip()
    if api_key:
        settings.CLOUDINARY_API_KEY = str(api_key).strip()
    if api_secret:
        settings.CLOUDINARY_API_SECRET = str(api_secret).strip()

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

init_cloudinary()
