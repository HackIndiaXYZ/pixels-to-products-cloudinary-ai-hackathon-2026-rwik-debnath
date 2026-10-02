from typing import Optional, Dict, Any
import urllib.parse
import cloudinary
from cloudinary.utils import cloudinary_url
from app.core.cloudinary_client import init_cloudinary
from app.core.config import settings

# Ensure cloudinary config is loaded
init_cloudinary()

class PackagingService:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Sanitizes text for Cloudinary l_text overlay (commas and slashes)."""
        if not text:
            return "BREAKING%20NEWS"
        sanitized = text.replace(",", "%2C").replace("/", "%2F").replace("?", "%3F")
        return urllib.parse.quote(sanitized, safe="%")

    @classmethod
    def generate_broadcast_urls(
        cls,
        public_id: str,
        headline: str = "Breaking News",
        subheadline: str = "Eyewitness Report",
        pixelate_bystanders: bool = True,
        resource_type: str = "image",
        version: Optional[int] = None,
        focal_x: Optional[int] = None,
        focal_y: Optional[int] = None,
        focal_gravity: Optional[str] = None
    ) -> dict:
        """
        Generates dynamic syndication URLs according to PressWire specs:
        - 16:9 Linear Broadcast (clean master feed with smart subject framing)
        - 9:16 Vertical Social Story with predominant subject crop
        - 1:1 Fast-Loading Wire Index Card / Micro-Thumbnail
        - Clean Master Delivery with selective privacy redactions
        """
        cloud_name = cloudinary.config().cloud_name or settings.CLOUDINARY_CLOUD_NAME
        redaction_trans = [{"effect": "pixelate_faces:10"}] if pixelate_bystanders else []

        has_custom_focal = focal_x is not None and focal_y is not None

        # 1. 16:9 Clean Linear TV Broadcast (Redacted, 16:9 crop)
        if has_custom_focal:
            tv_crop = {"aspect_ratio": "16:9", "crop": "fill", "gravity": "xy_center", "x": focal_x, "y": focal_y}
        else:
            tv_crop = {"aspect_ratio": "16:9", "crop": "fill", "gravity": focal_gravity or "auto:subject"}

        tv_clean_transformations = [
            *redaction_trans,
            tv_crop,
            {"fetch_format": "auto", "quality": "auto"}
        ]
        tv_16_9_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=tv_clean_transformations,
            cloud_name=cloud_name,
            secure=True,
            version=version
        )
        tv_16_9_clean_url = tv_16_9_url

        # 2. 9:16 Vertical Social Story / Reel
        if has_custom_focal:
            social_crop = {
                "aspect_ratio": "9:16",
                "crop": "fill",
                "gravity": "xy_center",
                "x": focal_x,
                "y": focal_y
            }
        else:
            social_crop = {
                "aspect_ratio": "9:16",
                "crop": "fill",
                "gravity": focal_gravity or "auto:subject"
            }

        social_transformations = [
            *redaction_trans,
            social_crop,
            {"fetch_format": "auto", "quality": "auto"}
        ]
        social_9_16_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=social_transformations,
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        # 3. 1:1 Fast-Loading Wire Index Card / Micro-Thumbnail
        if has_custom_focal:
            feed_crop = {"aspect_ratio": "1:1", "crop": "fill", "gravity": "xy_center", "x": focal_x, "y": focal_y}
        else:
            feed_crop = {"aspect_ratio": "1:1", "crop": "fill", "gravity": focal_gravity or "auto:subject"}

        feed_transformations = [
            *redaction_trans,
            feed_crop,
            {"fetch_format": "auto", "quality": "auto"}
        ]
        feed_1_1_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=feed_transformations,
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        # 4. Clean Master Delivery (Raw subject crop without banner)
        clean_master_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=[*redaction_trans, {"fetch_format": "auto", "quality": "auto"}],
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        return {
            "broadcast_16_9": tv_16_9_url,
            "broadcast_16_9_clean": tv_16_9_clean_url,
            "social_9_16": social_9_16_url,
            "feed_1_1": feed_1_1_url,
            "clean_master": clean_master_url
        }
