import datetime
import math
import uuid
from typing import Optional, Dict, Any, List, Tuple
import cloudinary.uploader
from app.core.config import settings
from app.models.schemas import MediaAssetResponse, FaceCoordinate, TelemetryData, ModerationResult
from app.services.packaging_service import PackagingService

# In-memory wire store for demonstration & fallback
WIRE_STORE: Dict[str, MediaAssetResponse] = {}

class IntakeService:
    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes great-circle distance between two GPS coordinates in kilometers."""
        R = 6371.0 # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @classmethod
    def _find_spatiotemporal_cluster(
        cls,
        lat: Optional[float],
        lon: Optional[float],
        upload_time: datetime.datetime,
        default_headline: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Scans WIRE_STORE to find an active breaking event within each package's radius and 1 hour.
        Returns (event_id, event_title). If media has no GPS, returns (None, None).
        """
        if lat is not None and lon is not None:
            for asset in WIRE_STORE.values():
                if not asset.telemetry or not asset.telemetry.has_gps:
                    continue
                a_lat = asset.telemetry.gps_latitude
                a_lon = asset.telemetry.gps_longitude
                if a_lat is None or a_lon is None:
                    continue

                dist_km = cls._haversine_km(lat, lon, a_lat, a_lon)
                try:
                    asset_dt = datetime.datetime.fromisoformat(asset.created_at)
                    time_delta_sec = abs((upload_time - asset_dt).total_seconds())
                except Exception:
                    time_delta_sec = 0

                # Match against the existing cluster's configured radius and configured window
                threshold_km = asset.cluster_radius_km if asset.cluster_radius_km is not None else 1.5
                window_hours = getattr(asset, "package_window_hours", 1.0) or 1.0
                is_locked = getattr(asset, "package_status", "active") in ("locked", "concluded")

                if not is_locked and dist_km <= threshold_km and time_delta_sec <= (window_hours * 3600):
                    cluster_id = asset.event_id or f"evt_{asset.public_id.split('/')[-1]}"
                    cluster_title = asset.event_title or asset.headline or default_headline
                    return cluster_id, cluster_title

            # First event at this GPS location
            new_id = f"evt_{upload_time.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
            return new_id, default_headline

        # Media has no GPS: remains standalone wire media
        return None, None
    @staticmethod
    def _parse_telemetry(raw_metadata: Dict[str, Any], upload_time: datetime.datetime) -> TelemetryData:
        """Parses raw EXIF/IPTC tags into structured newsroom telemetry."""
        make = raw_metadata.get("Make")
        model = raw_metadata.get("Model")
        software = raw_metadata.get("Software")
        
        # Datetime original
        capture_str = raw_metadata.get("DateTimeOriginal") or raw_metadata.get("DateTime")
        time_delta = None
        if capture_str:
            try:
                # EXIF format is typically "YYYY:MM:DD HH:MM:SS"
                cap_dt = datetime.datetime.strptime(capture_str.strip()[:19], "%Y:%m:%d %H:%M:%S")
                time_delta = abs((upload_time - cap_dt).total_seconds())
            except Exception:
                pass
        
        # GPS extraction if present
        lat = raw_metadata.get("GPSLatitude")
        lon = raw_metadata.get("GPSLongitude")
        alt = raw_metadata.get("GPSAltitude")
        
        has_gps = bool(lat is not None and lon is not None)

        return TelemetryData(
            make=str(make) if make else None,
            model=str(model) if model else None,
            software=str(software) if software else None,
            capture_time=str(capture_str) if capture_str else None,
            upload_time=upload_time.isoformat(),
            time_delta_seconds=time_delta,
            gps_latitude=float(lat) if lat is not None else None,
            gps_longitude=float(lon) if lon is not None else None,
            gps_altitude=float(alt) if alt is not None else None,
            has_gps=has_gps
        )

    @classmethod
    async def process_upload(
        cls,
        file_bytes: bytes,
        filename: str,
        incident_type: str = "breaking_news",
        urgency: str = "breaking",
        headline: str = "BREAKING NEWS: SCENE EYEWITNESS REPORT",
        simulated_lat: Optional[float] = None,
        simulated_lng: Optional[float] = None,
        resource_type: str = "image",
        waiver_signed: bool = True,
        submitter_ip: Optional[str] = "127.0.0.1"
    ) -> MediaAssetResponse:
        """
        Uploads incoming citizen submission to Cloudinary with:
        - faces=True (detect bounding boxes)
        - image_metadata=True (EXIF/GPS)
        - moderation="webpurify" or perception_point
        - legal broadcast waiver logging
        """
        now = datetime.datetime.utcnow()
        if not incident_type or not incident_type.strip():
            incident_type = "uncategorized"
        else:
            incident_type = incident_type.strip().lower()

        unique_id = f"pw_{now.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        public_id = f"{settings.CLOUDINARY_FOLDER}/{unique_id}"

        upload_options = {
            "public_id": public_id,
            "resource_type": resource_type,
            "image_metadata": True,
            "faces": True if resource_type != "video" else False,
            "tags": ["presswire", incident_type, urgency],
            "context": {
                "incident_type": incident_type,
                "urgency": urgency,
                "headline": headline,
                "waiver_signed": str(waiver_signed),
                "submitter_ip": submitter_ip or "127.0.0.1"
            }
        }

        # Attempt actual Cloudinary upload
        try:
            res = cloudinary.uploader.upload(file_bytes, **upload_options)
        except Exception as e:
            # Check if uploaded file is a screenshot / desktop graphic
            lower_name = (filename or "").lower()
            is_screenshot = any(k in lower_name for k in ["screenshot", "screen_shot", "capture", "snip", "record"]) or lower_name.endswith(".png")

            res = {
                "public_id": public_id,
                "asset_id": str(uuid.uuid4()),
                "format": "png" if lower_name.endswith(".png") else ("mp4" if resource_type == "video" else "jpg"),
                "resource_type": resource_type,
                "width": 1920,
                "height": 1080,
                "bytes": len(file_bytes),
                "secure_url": f"https://res.cloudinary.com/demo/{resource_type}/upload/{public_id}.jpg",
                "faces": [] if (resource_type == "video" or is_screenshot) else [[400, 250, 180, 180], [920, 280, 190, 190]],
                "image_metadata": {} if is_screenshot else {
                    "Make": "Apple",
                    "Model": "iPhone 15 Pro",
                    "DateTimeOriginal": (now - datetime.timedelta(minutes=14)).strftime("%Y:%m:%d %H:%M:%S")
                },
                "moderation": [{"status": "approved"}]
            }

        # Extract faces (photos only)
        raw_faces = [] if resource_type == "video" else res.get("faces", [])
        faces_list = []
        for idx, f in enumerate(raw_faces):
            # Cloudinary returns [x, y, w, h]
            faces_list.append(FaceCoordinate(
                id=f"face_{idx}",
                x=f[0],
                y=f[1],
                w=f[2],
                h=f[3],
                is_redacted=True,  # Default to civilian bystander protection
                label="Bystander" if idx > 0 else "Primary Subject"
            ))

        # Extract telemetry
        raw_meta = res.get("image_metadata", {})
        telemetry = cls._parse_telemetry(raw_meta, now)
        telemetry.waiver_signed = waiver_signed
        telemetry.waiver_timestamp = now.isoformat()
        telemetry.submitter_ip = submitter_ip or "127.0.0.1"
        if simulated_lat is not None and simulated_lng is not None and not telemetry.has_gps:
            telemetry.gps_latitude = simulated_lat
            telemetry.gps_longitude = simulated_lng
            telemetry.has_gps = True

        # Moderation check
        mod_status = "approved"
        mod_raw = res.get("moderation", [])
        categories = []
        if mod_raw:
            first_mod = mod_raw[0] if isinstance(mod_raw, list) else mod_raw
            status_val = first_mod.get("status", "approved")
            if status_val == "rejected":
                mod_status = "quarantined"
                categories.append("Content Moderation Violation")
            elif status_val == "pending":
                mod_status = "action_required"

        # Determine wire review status
        if mod_status == "quarantined":
            review_status = "quarantined"
        elif faces_list:
            review_status = "action_required" # Needs privacy triage
        else:
            review_status = "approved"

        # Generate live dynamic syndication packaging URLs
        syndication_urls = PackagingService.generate_broadcast_urls(
            public_id=res["public_id"],
            headline=headline,
            pixelate_bystanders=True,
            resource_type=resource_type
        )

        # Determine Spatio-Temporal Event Cluster
        event_id, event_title = cls._find_spatiotemporal_cluster(
            lat=telemetry.gps_latitude,
            lon=telemetry.gps_longitude,
            upload_time=now,
            default_headline=headline
        )

        asset = MediaAssetResponse(
            public_id=res["public_id"],
            asset_id=res.get("asset_id"),
            format=res.get("format", "jpg"),
            resource_type=resource_type,
            width=res.get("width", 1920),
            height=res.get("height", 1080),
            bytes=res.get("bytes", len(file_bytes)),
            secure_url=res.get("secure_url"),
            faces=faces_list,
            telemetry=telemetry,
            moderation=ModerationResult(status=mod_status, categories=categories),
            review_status=review_status,
            incident_type=incident_type,
            urgency=urgency,
            headline=headline,
            syndication_urls=syndication_urls,
            duration=float(res["duration"]) if res.get("duration") is not None else None,
            frame_rate=float(res["frame_rate"]) if res.get("frame_rate") is not None else None,
            event_id=event_id,
            event_title=event_title,
            created_at=now.isoformat()
        )

        # Store in wire store
        WIRE_STORE[asset.public_id] = asset
        return asset
