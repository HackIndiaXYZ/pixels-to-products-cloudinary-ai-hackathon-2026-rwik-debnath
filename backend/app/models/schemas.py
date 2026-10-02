from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FaceCoordinate(BaseModel):
    id: Optional[str] = None
    x: int
    y: int
    w: int
    h: int
    is_redacted: bool = True  # Default: bystanders are redacted
    label: Optional[str] = "Civilian / Bystander"

class TelemetryData(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    software: Optional[str] = None
    capture_time: Optional[str] = None
    upload_time: Optional[str] = None
    time_delta_seconds: Optional[float] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    gps_altitude: Optional[float] = None
    has_gps: bool = False
    waiver_signed: bool = True
    waiver_timestamp: Optional[str] = None
    submitter_ip: Optional[str] = None

class ModerationResult(BaseModel):
    status: str = "approved"  # "approved", "action_required", "quarantined"
    confidence: Optional[float] = None
    categories: List[str] = []
    raw_details: Optional[Dict[str, Any]] = None

class MediaAssetResponse(BaseModel):
    public_id: str
    asset_id: Optional[str] = None
    format: str
    resource_type: str = "image"
    width: int
    height: int
    bytes: int
    secure_url: str
    faces: List[FaceCoordinate] = []
    telemetry: TelemetryData
    moderation: ModerationResult
    review_status: str = "action_required"  # "quarantined", "action_required", "approved"
    incident_type: str = "breaking_news"
    urgency: str = "breaking"  # "breaking", "standard"
    headline: Optional[str] = "Breaking News"
    syndication_urls: Dict[str, str] = {}
    pixelate_bystanders: bool = True
    is_archived: bool = False
    duration: Optional[float] = None
    frame_rate: Optional[float] = None
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    cluster_radius_km: Optional[float] = 1.5
    package_window_hours: Optional[float] = 1.0
    package_status: Optional[str] = "active"
    created_at: str

class RedactionUpdateRequest(BaseModel):
    public_id: str
    face_coordinates: List[List[int]] = Field(
        ...,
        description="List of [x, y, w, h] coordinates that should be pixelated (bystanders only)"
    )
    faces: Optional[List[FaceCoordinate]] = None
    review_status: Optional[str] = "approved"
    incident_type: Optional[str] = None
    urgency: Optional[str] = None
    headline: Optional[str] = None
    pixelate_bystanders: Optional[bool] = None


class SearchQueryRequest(BaseModel):
    query: Optional[str] = None
    incident_type: Optional[str] = None
    review_status: Optional[str] = None
    urgency: Optional[str] = None
    max_results: int = 30

class BatchDeleteRequest(BaseModel):
    public_ids: List[str]

class DeleteResponse(BaseModel):
    success: bool
    deleted_ids: List[str]
    count: int

class ArchiveToggleRequest(BaseModel):
    public_id: str
    is_archived: bool = True

class BatchArchiveRequest(BaseModel):
    public_ids: List[str]
    is_archived: bool = True

class SweepApprovedResponse(BaseModel):
    success: bool
    swept_count: int
    swept_ids: List[str]

class MetadataUpdateRequest(BaseModel):
    public_id: str
    headline: Optional[str] = None
    incident_type: Optional[str] = None
    urgency: Optional[str] = None
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    cluster_radius_km: Optional[float] = None

class GeotagRequest(BaseModel):
    public_id: str
    lat: float
    lng: float
    location_name: Optional[str] = None

class PackageRadiusRequest(BaseModel):
    event_id: str
    cluster_radius_km: float

class PackageCreateRequest(BaseModel):
    event_title: str
    incident_type: str = "uncategorized"
    lat: Optional[float] = None
    lng: Optional[float] = None
    cluster_radius_km: float = 1.5

class PackageAssignRequest(BaseModel):
    public_id: str
    event_id: Optional[str] = None
    event_title: Optional[str] = None

class PackageUpdateRequest(BaseModel):
    event_id: str
    event_title: Optional[str] = None
    incident_type: Optional[str] = None
    cluster_radius_km: Optional[float] = None
    package_window_hours: Optional[float] = None
    package_status: Optional[str] = None

class PackageDisbandRequest(BaseModel):
    event_id: str

class BatchPackageAssignRequest(BaseModel):
    public_ids: List[str]
    event_id: Optional[str] = None
    event_title: Optional[str] = None

