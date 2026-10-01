from fastapi import APIRouter, HTTPException
from typing import List
import cloudinary.uploader
import cloudinary.api
from app.models.schemas import (
    RedactionUpdateRequest,
    MediaAssetResponse,
    BatchDeleteRequest,
    DeleteResponse,
    ArchiveToggleRequest,
    BatchArchiveRequest,
    SweepApprovedResponse,
    MetadataUpdateRequest
)
from app.services.redaction_service import RedactionService
from app.services.packaging_service import PackagingService
from app.services.intake_service import WIRE_STORE, IntakeService

router = APIRouter()

@router.get("/queue", response_model=List[MediaAssetResponse])
async def get_wire_queue():
    """Returns the live newsroom wire queue sorted by creation date."""
    return sorted(list(WIRE_STORE.values()), key=lambda x: x.created_at, reverse=True)

@router.get("/asset/{public_id:path}", response_model=MediaAssetResponse)
async def get_asset_details(public_id: str):
    """Retrieves an individual media asset from the wire store."""
    if public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found on wire")
    return WIRE_STORE[public_id]

@router.delete("/asset/{public_id:path}", response_model=DeleteResponse)
async def delete_asset(public_id: str):
    """
    Deletes an individual media asset from the wire queue and purges it from Cloudinary.
    """
    resource_type = "image"
    if public_id in WIRE_STORE:
        resource_type = WIRE_STORE[public_id].resource_type
        del WIRE_STORE[public_id]
    
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        pass

    return DeleteResponse(success=True, deleted_ids=[public_id], count=1)

@router.post("/batch-delete", response_model=DeleteResponse)
async def batch_delete_assets(req: BatchDeleteRequest):
    """
    Mass purges multiple media assets from the wire queue and Cloudinary.
    """
    deleted_ids = []
    for pid in req.public_ids:
        if pid in WIRE_STORE:
            res_type = WIRE_STORE[pid].resource_type
            del WIRE_STORE[pid]
            deleted_ids.append(pid)
            try:
                cloudinary.uploader.destroy(pid, resource_type=res_type)
            except Exception:
                pass
        else:
            deleted_ids.append(pid)
            try:
                cloudinary.uploader.destroy(pid)
            except Exception:
                pass

    return DeleteResponse(success=True, deleted_ids=deleted_ids, count=len(deleted_ids))

@router.post("/redact", response_model=MediaAssetResponse)
async def update_redactions(req: RedactionUpdateRequest):
    """
    Applies selective privacy redactions:
    Updates Cloudinary's explicit face_coordinates attribute with the coordinates
    of civilian bystanders, leaving identified public figures unblurred.
    """
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = WIRE_STORE[req.public_id]

    # Update Cloudinary explicit face_coordinates (only for images; videos use native temporal face tracking)
    if asset.resource_type != "video":
        update_res = RedactionService.update_selective_faces(
            public_id=req.public_id,
            bystander_coordinates=req.face_coordinates
        )
    
    # Update stored face states
    if req.faces is not None:
        asset.faces = req.faces
    else:
        for f in asset.faces:
            # Check if this face coordinate matches one in the request
            match = any(
                abs(f.x - req_c[0]) <= 5 and abs(f.y - req_c[1]) <= 5
                for req_c in req.face_coordinates
            )
            f.is_redacted = match

    if req.review_status:
        asset.review_status = req.review_status
    if req.headline is not None:
        asset.headline = req.headline.strip() or "BREAKING NEWS"
    if req.incident_type is not None:
        cleaned_cat = req.incident_type.strip().lower()
        asset.incident_type = cleaned_cat or "uncategorized"
    if req.urgency is not None:
        asset.urgency = req.urgency.strip().lower() or "breaking"

    # Determine whether bystanders should be pixelated
    pixelate_flag = True
    if req.pixelate_bystanders is not None:
        pixelate_flag = req.pixelate_bystanders
    elif asset.resource_type != "video" and len(req.face_coordinates) == 0:
        pixelate_flag = False

    asset.pixelate_bystanders = pixelate_flag

    # Re-generate broadcast packaging URLs with updated headline / bystander count
    asset.syndication_urls = PackagingService.generate_broadcast_urls(
        public_id=asset.public_id,
        headline=asset.headline or "BREAKING NEWS",
        pixelate_bystanders=pixelate_flag,
        resource_type=asset.resource_type
    )

    WIRE_STORE[req.public_id] = asset
    return asset

@router.post("/metadata", response_model=MediaAssetResponse)
async def update_metadata(req: MetadataUpdateRequest):
    """
    Updates editorial metadata (headline, incident_type/beat, urgency)
    and dynamically re-generates lower-third broadcast URLs without re-indexing face coordinates.
    """
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = WIRE_STORE[req.public_id]
    if req.headline is not None:
        asset.headline = req.headline.strip() or "BREAKING NEWS"
    if req.incident_type is not None:
        cleaned_cat = req.incident_type.strip().lower()
        asset.incident_type = cleaned_cat or "uncategorized"
    if req.urgency is not None:
        asset.urgency = req.urgency.strip().lower() or "breaking"
    if req.event_id is not None:
        asset.event_id = req.event_id
    if req.event_title is not None:
        new_title = req.event_title.strip()
        asset.event_title = new_title
        if asset.event_id:
            for s_asset in WIRE_STORE.values():
                if s_asset.event_id == asset.event_id:
                    s_asset.event_title = new_title
    if req.cluster_radius_km is not None:
        asset.cluster_radius_km = req.cluster_radius_km
        if asset.event_id:
            for s_asset in WIRE_STORE.values():
                if s_asset.event_id == asset.event_id:
                    s_asset.cluster_radius_km = req.cluster_radius_km

            # If asset has GPS, dynamically evaluate clustering within WIRE_STORE
            if (asset.telemetry and asset.telemetry.has_gps and
                asset.telemetry.gps_latitude is not None and asset.telemetry.gps_longitude is not None):
                anchor_lat = asset.telemetry.gps_latitude
                anchor_lon = asset.telemetry.gps_longitude
                for other in list(WIRE_STORE.values()):
                    if other.public_id == asset.public_id:
                        continue
                    if (other.telemetry and other.telemetry.has_gps and
                        other.telemetry.gps_latitude is not None and other.telemetry.gps_longitude is not None):
                        dist = IntakeService._haversine_km(
                            anchor_lat, anchor_lon,
                            other.telemetry.gps_latitude, other.telemetry.gps_longitude
                        )
                        if dist <= req.cluster_radius_km:
                            other.event_id = asset.event_id
                            other.event_title = asset.event_title
                            other.cluster_radius_km = req.cluster_radius_km
                        elif other.event_id == asset.event_id and dist > req.cluster_radius_km:
                            other.event_id = f"evt_{other.public_id.split('/')[-1]}"
                            other.event_title = other.headline

    # Re-generate broadcast packaging URLs with updated headline
    asset.syndication_urls = PackagingService.generate_broadcast_urls(
        public_id=asset.public_id,
        headline=asset.headline or "BREAKING NEWS",
        pixelate_bystanders=True,
        resource_type=asset.resource_type
    )

    WIRE_STORE[req.public_id] = asset
    return asset

@router.post("/archive", response_model=MediaAssetResponse)
async def toggle_archive(req: ArchiveToggleRequest):
    """Toggles the archive state of a single media asset."""
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")
    WIRE_STORE[req.public_id].is_archived = req.is_archived
    return WIRE_STORE[req.public_id]

@router.post("/batch-archive")
async def batch_archive(req: BatchArchiveRequest):
    """Mass archives or restores multiple assets."""
    updated_ids = []
    for pid in req.public_ids:
        if pid in WIRE_STORE:
            WIRE_STORE[pid].is_archived = req.is_archived
            updated_ids.append(pid)
    return {
        "success": True,
        "count": len(updated_ids),
        "public_ids": updated_ids,
        "is_archived": req.is_archived
    }

@router.post("/sweep-approved", response_model=SweepApprovedResponse)
async def sweep_approved():
    """Sweeps all currently approved assets from the live buffer into the archive."""
    swept = []
    for pid, asset in WIRE_STORE.items():
        if asset.review_status == "approved" and not asset.is_archived:
            asset.is_archived = True
            swept.append(pid)
    return SweepApprovedResponse(success=True, swept_count=len(swept), swept_ids=swept)
