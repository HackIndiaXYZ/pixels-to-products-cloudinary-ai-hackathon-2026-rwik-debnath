import urllib.parse
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
        resource_type: str = "image"
    ) -> dict:
        """
        Generates dynamic syndication URLs according to PressWire specs:
        - 16:9 Linear Broadcast with lower-third overlay
        - 9:16 Social Story with predominant blur background
        - 1:1 Feed thumbnail with f_auto, q_auto
        - 6s Autonomous Video Highlight (if video)
        """
        enc_headline = cls.sanitize_text(headline)
        cloud_name = settings.CLOUDINARY_CLOUD_NAME

        redaction_trans = [{"effect": "pixelate_faces:10"}] if pixelate_bystanders else []

        # 1. 16:9 Linear TV Broadcast with lower-third overlay
        tv_transformations = [
            *redaction_trans,
            {"aspect_ratio": "16:9", "crop": "fill", "gravity": "auto:subject"},
            {
                "overlay": {"font_family": "Arial", "font_size": 34, "font_weight": "bold", "text": enc_headline},
                "color": "#FFFFFF",
                "background": "#D90429",
                "gravity": "south_west",
                "x": 40,
                "y": 40
            },
            {"fetch_format": "auto", "quality": "auto"}
        ]
        tv_16_9_url, _ = cloudinary_url(public_id, transformation=tv_transformations, cloud_name=cloud_name, secure=True)

        # 1b. Clean 16:9 Linear Broadcast (Redacted, 16:9 crop, NO lower-third banner - for TV Networks)
        tv_clean_transformations = [
            *redaction_trans,
            {"aspect_ratio": "16:9", "crop": "fill", "gravity": "auto:subject"},
            {"fetch_format": "auto", "quality": "auto"}
        ]
        tv_16_9_clean_url, _ = cloudinary_url(public_id, transformation=tv_clean_transformations, cloud_name=cloud_name, secure=True)

        # 2. 9:16 Vertical Social Story / Reel with Context Blur Fill
        social_transformations = [
            *redaction_trans,
            {
                "aspect_ratio": "9:16",
                "crop": "pad",
                "background": "auto:predominant",
                "gravity": "auto:subject"
            },
            {"fetch_format": "auto", "quality": "auto"}
        ]
        social_9_16_url, _ = cloudinary_url(public_id, transformation=social_transformations, cloud_name=cloud_name, secure=True)

        # 3. 1:1 Fast-Loading Wire Index Card / Micro-Thumbnail
        feed_transformations = [
            *redaction_trans,
            {"aspect_ratio": "1:1", "crop": "fill", "gravity": "auto:subject"},
            {"fetch_format": "auto", "quality": "auto"}
        ]
        feed_1_1_url, _ = cloudinary_url(public_id, transformation=feed_transformations, cloud_name=cloud_name, secure=True)

        # 4. Clean Master Delivery (Raw subject crop without banner)
        clean_master_url, _ = cloudinary_url(
            public_id,
            transformation=[*redaction_trans, {"fetch_format": "auto", "quality": "auto"}],
            cloud_name=cloud_name,
            secure=True
        )

        urls = {
            "broadcast_16_9": tv_16_9_url,
            "broadcast_16_9_clean": tv_16_9_clean_url,
            "social_9_16": social_9_16_url,
            "feed_1_1": feed_1_1_url,
            "clean_master": clean_master_url
        }

        # 5. Video Highlight Reel (6 seconds with key segments)
        if resource_type == "video":
            video_preview_url, _ = cloudinary_url(
                public_id,
                resource_type="video",
                transformation=[
                    {"effect": "preview:duration_6:max_seg_3"},
                    {"fetch_format": "auto", "quality": "auto"}
                ],
                cloud_name=cloud_name,
                secure=True
            )
            urls["video_highlight_6s"] = video_preview_url

        return urls
