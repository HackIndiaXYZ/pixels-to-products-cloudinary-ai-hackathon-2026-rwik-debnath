from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, Index
from app.db.base import Base
from app.models.schemas import (
    MediaAssetResponse,
    StoryPackageResponse,
    FaceCoordinate,
    TelemetryData,
    ModerationResult
)

class AssetModel(Base):
    __tablename__ = "media_assets"

    public_id = Column(String, primary_key=True, index=True)
    asset_id = Column(String, nullable=True)
    format = Column(String(10), nullable=False, default="jpg")
    resource_type = Column(String(20), nullable=False, default="image")
    width = Column(Integer, nullable=False, default=1200)
    height = Column(Integer, nullable=False, default=800)
    bytes = Column(Integer, nullable=False, default=0)
    secure_url = Column(Text, nullable=False)
    
    review_status = Column(String(30), nullable=False, default="action_required", index=True)
    incident_type = Column(String(50), nullable=False, default="breaking_news", index=True)
    urgency = Column(String(20), nullable=False, default="breaking")
    headline = Column(Text, nullable=True, default="Breaking News")
    pixelate_bystanders = Column(Boolean, nullable=False, default=True)
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    
    duration = Column(Float, nullable=True)
    frame_rate = Column(Float, nullable=True)
    
    event_id = Column(String, nullable=True, index=True)
    event_title = Column(Text, nullable=True)
    cluster_radius_km = Column(Float, nullable=True, default=1.5)
    package_window_hours = Column(Float, nullable=True, default=1.0)
    package_status = Column(String(20), nullable=True, default="active")
    
    focal_x = Column(Integer, nullable=True)
    focal_y = Column(Integer, nullable=True)
    focal_gravity = Column(String(30), nullable=True, default="auto:subject")
    brand_theme = Column(String(50), nullable=True, default="global_wire")
    custom_strap_id = Column(String(255), nullable=True)
    created_at = Column(String(50), nullable=False, index=True)

    # Structured JSON fields
    faces = Column(JSON, nullable=False, default=list)
    telemetry = Column(JSON, nullable=False, default=dict)
    moderation = Column(JSON, nullable=False, default=dict)
    syndication_urls = Column(JSON, nullable=False, default=dict)

    @classmethod
    def from_pydantic(cls, asset: MediaAssetResponse) -> "AssetModel":
        """Converts a Pydantic MediaAssetResponse into an AssetModel instance."""
        faces_data = [
            f.model_dump() if hasattr(f, "model_dump") else (f.dict() if hasattr(f, "dict") else f)
            for f in (asset.faces or [])
        ]
        telemetry_data = (
            asset.telemetry.model_dump()
            if hasattr(asset.telemetry, "model_dump")
            else (asset.telemetry.dict() if hasattr(asset.telemetry, "dict") else (asset.telemetry or {}))
        )
        moderation_data = (
            asset.moderation.model_dump()
            if hasattr(asset.moderation, "model_dump")
            else (asset.moderation.dict() if hasattr(asset.moderation, "dict") else (asset.moderation or {}))
        )

        return cls(
            public_id=asset.public_id,
            asset_id=asset.asset_id,
            format=asset.format,
            resource_type=asset.resource_type,
            width=asset.width,
            height=asset.height,
            bytes=asset.bytes,
            secure_url=asset.secure_url,
            review_status=asset.review_status,
            incident_type=asset.incident_type,
            urgency=asset.urgency,
            headline=asset.headline,
            pixelate_bystanders=asset.pixelate_bystanders,
            is_archived=asset.is_archived,
            duration=asset.duration,
            frame_rate=asset.frame_rate,
            event_id=asset.event_id,
            event_title=asset.event_title,
            cluster_radius_km=asset.cluster_radius_km,
            package_window_hours=asset.package_window_hours,
            package_status=asset.package_status,
            focal_x=asset.focal_x,
            focal_y=asset.focal_y,
            focal_gravity=asset.focal_gravity,
            brand_theme=asset.brand_theme or "global_wire",
            custom_strap_id=asset.custom_strap_id,
            created_at=asset.created_at,
            faces=faces_data,
            telemetry=telemetry_data,
            moderation=moderation_data,
            syndication_urls=asset.syndication_urls or {},
        )

    def to_pydantic(self) -> MediaAssetResponse:
        """Converts this AssetModel instance to a Pydantic MediaAssetResponse."""
        faces_objs = [
            FaceCoordinate(**f) if isinstance(f, dict) else f
            for f in (self.faces or [])
        ]
        telemetry_obj = (
            TelemetryData(**self.telemetry)
            if isinstance(self.telemetry, dict)
            else (self.telemetry or TelemetryData())
        )
        moderation_obj = (
            ModerationResult(**self.moderation)
            if isinstance(self.moderation, dict)
            else (self.moderation or ModerationResult())
        )

        return MediaAssetResponse(
            public_id=self.public_id,
            asset_id=self.asset_id,
            format=self.format,
            resource_type=self.resource_type,
            width=self.width,
            height=self.height,
            bytes=self.bytes,
            secure_url=self.secure_url,
            faces=faces_objs,
            telemetry=telemetry_obj,
            moderation=moderation_obj,
            review_status=self.review_status,
            incident_type=self.incident_type,
            urgency=self.urgency,
            headline=self.headline,
            syndication_urls=self.syndication_urls or {},
            pixelate_bystanders=self.pixelate_bystanders,
            is_archived=self.is_archived,
            duration=self.duration,
            frame_rate=self.frame_rate,
            event_id=self.event_id,
            event_title=self.event_title,
            cluster_radius_km=self.cluster_radius_km,
            package_window_hours=self.package_window_hours,
            package_status=self.package_status,
            focal_x=self.focal_x,
            focal_y=self.focal_y,
            focal_gravity=self.focal_gravity,
            brand_theme=self.brand_theme or "global_wire",
            custom_strap_id=self.custom_strap_id,
            created_at=self.created_at,
        )


class PackageModel(Base):
    __tablename__ = "story_packages"

    event_id = Column(String, primary_key=True, index=True)
    event_title = Column(Text, nullable=False)
    incident_type = Column(String(50), nullable=False)
    cluster_radius_km = Column(Float, nullable=False, default=1.5)
    package_window_hours = Column(Float, nullable=True, default=1.0)
    package_status = Column(String(20), nullable=False, default="active")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(String(50), nullable=False, index=True)

    @classmethod
    def from_pydantic(cls, pkg: StoryPackageResponse) -> "PackageModel":
        return cls(
            event_id=pkg.event_id,
            event_title=pkg.event_title,
            incident_type=pkg.incident_type,
            cluster_radius_km=pkg.cluster_radius_km if pkg.cluster_radius_km is not None else 1.5,
            package_window_hours=pkg.package_window_hours if pkg.package_window_hours is not None else 1.0,
            package_status=pkg.package_status or "active",
            lat=pkg.lat,
            lng=pkg.lng,
            created_at=pkg.created_at,
        )

    def to_pydantic(self, asset_count: int = 0) -> StoryPackageResponse:
        return StoryPackageResponse(
            event_id=self.event_id,
            event_title=self.event_title,
            incident_type=self.incident_type,
            cluster_radius_km=self.cluster_radius_km,
            package_window_hours=self.package_window_hours,
            package_status=self.package_status,
            lat=self.lat,
            lng=self.lng,
            created_at=self.created_at,
            asset_count=asset_count,
        )
