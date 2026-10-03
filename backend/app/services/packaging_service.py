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
        """Sanitizes text for Cloudinary text overlay."""
        if not text:
            return "BREAKING NEWS"
        # Cloudinary delimiters: replace commas and slashes to prevent url parsing collisions
        sanitized = text.replace(",", " -").replace("/", " -").replace("?", "")
        if len(sanitized) > 42:
            sanitized = sanitized[:39].strip() + "..."
        return sanitized

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
        focal_gravity: Optional[str] = None,
        brand_theme: str = "global_wire",
        custom_strap_id: Optional[str] = None
    ) -> dict:
        """
        Generates dynamic Dual-Delivery syndication URLs according to PressWire specs:
        - broadcast_16_9_clean: Clean Master Delivery for TV Control Rooms / Chyron (Zero Overlays)
        - broadcast_16_9_branded: Digital Syndication Feed with Station Branding / Custom Lower-Third
        - broadcast_16_9: Clean Master default (preserves backward compatibility)
        - social_9_16: 9:16 Vertical Social Story with predominant subject crop
        - feed_1_1: 1:1 Fast-Loading Wire Index Card / Micro-Thumbnail
        - clean_master: Raw full-resolution subject crop with selective privacy redactions
        """
        cloud_name = cloudinary.config().cloud_name or settings.CLOUDINARY_CLOUD_NAME
        redaction_trans = [{"effect": "pixelate_faces:10"}] if pixelate_bystanders else []

        has_custom_focal = focal_x is not None and focal_y is not None
        display_headline = cls.sanitize_text(headline)

        # Base 16:9 crop definition
        if has_custom_focal:
            tv_crop = {"aspect_ratio": "16:9", "crop": "fill", "gravity": "xy_center", "x": focal_x, "y": focal_y}
        else:
            tv_crop = {"aspect_ratio": "16:9", "crop": "fill", "gravity": focal_gravity or "auto:subject"}

        # 1. Clean 16:9 Linear Broadcast (No text or graphics)
        tv_clean_transformations = [
            *redaction_trans,
            tv_crop,
            {"fetch_format": "auto", "quality": "auto"}
        ]
        tv_16_9_clean_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=tv_clean_transformations,
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        # 2. Branded 16:9 Broadcast Delivery (Corner Station Watermark Bug Overlay)
        branded_layers = []

        # If station logo bug is active, place as constrained watermark bug in top-right corner
        if custom_strap_id and custom_strap_id.strip():
            clean_strap_id = custom_strap_id.strip().replace("/", ":")
            branded_layers.append({
                "overlay": clean_strap_id,
                "gravity": "north_east",
                "x": 40,
                "y": 40,
                "width": 180,
                "height": 70,
                "crop": "fit"
            })

        tv_branded_transformations = [
            *redaction_trans,
            tv_crop,
            *branded_layers,
            {"fetch_format": "auto", "quality": "auto"}
        ]
        tv_16_9_branded_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=tv_branded_transformations,
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        # 3. 9:16 Vertical Social Story / Reel
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

        # 4. 1:1 Fast-Loading Wire Index Card / Micro-Thumbnail
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

        # 5. Clean Master Delivery (Raw subject crop without banner or forced aspect ratio)
        clean_master_url, _ = cloudinary_url(
            public_id,
            resource_type="image",
            transformation=[*redaction_trans, {"fetch_format": "auto", "quality": "auto"}],
            cloud_name=cloud_name,
            secure=True,
            version=version
        )

        return {
            "broadcast_16_9": tv_16_9_clean_url,
            "broadcast_16_9_clean": tv_16_9_clean_url,
            "broadcast_16_9_branded": tv_16_9_branded_url,
            "social_9_16": social_9_16_url,
            "feed_1_1": feed_1_1_url,
            "clean_master": clean_master_url
        }
