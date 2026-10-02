from fastapi import APIRouter, HTTPException
from typing import List
import datetime
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
    MetadataUpdateRequest,
    GeotagRequest,
    PackageRadiusRequest,
    PackageCreateRequest,
    PackageAssignRequest,
    PackageUpdateRequest,
    PackageDisbandRequest,
    BatchPackageAssignRequest
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
        cleaned_id = req.event_id.strip()
        if not cleaned_id or cleaned_id.lower() in ("none", "standalone"):
            asset.event_id = None
            asset.event_title = None
        else:
            asset.event_id = cleaned_id
            existing_event = next((a for a in WIRE_STORE.values() if a.event_id == cleaned_id and a.public_id != asset.public_id), None)
            if existing_event:
                if req.event_title is None and existing_event.event_title:
                    asset.event_title = existing_event.event_title
                if req.incident_type is None and existing_event.incident_type:
                    asset.incident_type = existing_event.incident_type
    if req.event_title is not None:
        new_title = req.event_title.strip()
        asset.event_title = new_title or None
        if asset.event_id and new_title:
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

@router.post("/geotag", response_model=MediaAssetResponse)
async def manual_geotag(req: GeotagRequest):
    """
    Manually tags GPS coordinates onto an asset that lacked EXIF coordinates
    and dynamically checks spatiotemporal proximity to group it into matching event packages.
    """
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = WIRE_STORE[req.public_id]
    asset.telemetry.gps_latitude = req.lat
    asset.telemetry.gps_longitude = req.lng
    asset.telemetry.has_gps = True

    # Scan for existing event clusters within range
    now = datetime.datetime.now(datetime.timezone.utc)
    event_id, event_title = IntakeService._find_spatiotemporal_cluster(
        lat=req.lat,
        lon=req.lng,
        upload_time=now,
        default_headline=asset.headline or "Breaking News"
    )

    asset.event_id = event_id
    asset.event_title = event_title
    WIRE_STORE[req.public_id] = asset
    return asset

@router.post("/package-radius")
async def update_package_radius(req: PackageRadiusRequest):
    """
    Updates the clustering radius for a specific event package
    and dynamically re-evaluates all wire assets against the new boundary.
    """
    updated_assets = []
    # Find anchor asset of this event to get anchor lat/lon
    anchor_asset = None
    for a in WIRE_STORE.values():
        if a.event_id == req.event_id and a.telemetry.has_gps and a.telemetry.gps_latitude is not None:
            anchor_asset = a
            break

    if not anchor_asset:
        # Just update radius on any matching assets
        for a in WIRE_STORE.values():
            if a.event_id == req.event_id:
                a.cluster_radius_km = req.cluster_radius_km
                updated_assets.append(a.public_id)
        return {"success": True, "event_id": req.event_id, "cluster_radius_km": req.cluster_radius_km, "updated": updated_assets}

    anchor_lat = anchor_asset.telemetry.gps_latitude
    anchor_lon = anchor_asset.telemetry.gps_longitude

    for a in list(WIRE_STORE.values()):
        if not a.telemetry.has_gps or a.telemetry.gps_latitude is None or a.telemetry.gps_longitude is None:
            continue

        dist = IntakeService._haversine_km(anchor_lat, anchor_lon, a.telemetry.gps_latitude, a.telemetry.gps_longitude)
        if dist <= req.cluster_radius_km:
            a.event_id = req.event_id
            a.event_title = anchor_asset.event_title
            a.cluster_radius_km = req.cluster_radius_km
            updated_assets.append(a.public_id)
        elif a.event_id == req.event_id and a.public_id != anchor_asset.public_id and dist > req.cluster_radius_km:
            # Ejected from cluster
            a.event_id = None
            a.event_title = None
            a.cluster_radius_km = 1.5

    return {
        "success": True,
        "event_id": req.event_id,
        "cluster_radius_km": req.cluster_radius_km,
        "asset_count": len(updated_assets)
    }

@router.post("/package/assign", response_model=MediaAssetResponse)
async def assign_package(req: PackageAssignRequest):
    """
    Directly assigns an asset to a package or detaches it to standalone,
    inheriting the package's beat/title while preserving the asset's original GPS ground truth.
    """
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = WIRE_STORE[req.public_id]
    if not req.event_id or req.event_id.strip() == "" or req.event_id.lower() in ("none", "standalone"):
        asset.event_id = None
        asset.event_title = None
    else:
        cleaned_id = req.event_id.strip()
        asset.event_id = cleaned_id
        existing_event = next((a for a in WIRE_STORE.values() if a.event_id == cleaned_id and a.public_id != req.public_id), None)
        if existing_event:
            asset.event_title = req.event_title or existing_event.event_title
            asset.incident_type = existing_event.incident_type
        elif req.event_title:
            asset.event_title = req.event_title.strip()

    WIRE_STORE[req.public_id] = asset
    return asset

@router.post("/package/batch-assign")
async def batch_assign_package(req: BatchPackageAssignRequest):
    """
    Mass assigns multiple assets to a package or mass-detaches them to standalone stories.
    """
    updated_ids = []
    is_detach = not req.event_id or req.event_id.strip() == "" or req.event_id.lower() in ("none", "standalone")
    cleaned_id = None if is_detach else req.event_id.strip()

    existing_event = None
    if cleaned_id:
        existing_event = next((a for a in WIRE_STORE.values() if a.event_id == cleaned_id and a.public_id not in req.public_ids), None)

    for pid in req.public_ids:
        if pid in WIRE_STORE:
            asset = WIRE_STORE[pid]
            if is_detach:
                asset.event_id = None
                asset.event_title = None
            else:
                asset.event_id = cleaned_id
                if existing_event:
                    asset.event_title = req.event_title or existing_event.event_title
                    asset.incident_type = existing_event.incident_type
                elif req.event_title:
                    asset.event_title = req.event_title.strip()
            WIRE_STORE[pid] = asset
            updated_ids.append(pid)

    return {
        "success": True,
        "count": len(updated_ids),
        "public_ids": updated_ids,
        "event_id": cleaned_id,
        "event_title": req.event_title
    }

@router.post("/package/create")
async def create_package(req: PackageCreateRequest):
    """
    Creates a new manual package dossier with an optional geo-anchor.
    If coordinates are supplied, incoming field media near that anchor will auto-cluster into it.
    """
    import re
    slug = re.sub(r'[^a-zA-Z0-9]+', '_', req.event_title.strip().lower()).strip('_')
    event_id = f"evt_{slug}"

    # If coordinates are provided, find matching existing assets to cluster immediately
    clustered_count = 0
    if req.lat is not None and req.lng is not None:
        for a in WIRE_STORE.values():
            if a.telemetry.has_gps and a.telemetry.gps_latitude is not None and a.telemetry.gps_longitude is not None:
                dist = IntakeService._haversine_km(req.lat, req.lng, a.telemetry.gps_latitude, a.telemetry.gps_longitude)
                if dist <= req.cluster_radius_km:
                    a.event_id = event_id
                    a.event_title = req.event_title
                    a.incident_type = req.incident_type
                    a.cluster_radius_km = req.cluster_radius_km
                    clustered_count += 1

    return {
        "success": True,
        "event_id": event_id,
        "event_title": req.event_title,
        "incident_type": req.incident_type,
        "cluster_radius_km": req.cluster_radius_km,
        "lat": req.lat,
        "lng": req.lng,
        "clustered_assets": clustered_count
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

@router.post("/package/update")
async def update_package(req: PackageUpdateRequest):
    """
    Updates package properties (title, beat, radius, window, status) across all grouped assets.
    """
    matching_assets = [a for a in WIRE_STORE.values() if a.event_id == req.event_id]
    if not matching_assets:
        raise HTTPException(status_code=404, detail="Package event_id not found")

    for asset in matching_assets:
        if req.event_title is not None and req.event_title.strip():
            asset.event_title = req.event_title.strip()
        if req.incident_type is not None and req.incident_type.strip():
            asset.incident_type = req.incident_type.strip()
        if req.cluster_radius_km is not None:
            asset.cluster_radius_km = req.cluster_radius_km
        if req.package_window_hours is not None:
            asset.package_window_hours = req.package_window_hours
        if req.package_status is not None:
            asset.package_status = req.package_status.strip().lower()

    return {
        "success": True,
        "event_id": req.event_id,
        "event_title": matching_assets[0].event_title,
        "incident_type": matching_assets[0].incident_type,
        "cluster_radius_km": matching_assets[0].cluster_radius_km,
        "package_window_hours": matching_assets[0].package_window_hours,
        "package_status": matching_assets[0].package_status,
        "asset_count": len(matching_assets)
    }

@router.post("/package/disband")
async def disband_package(req: PackageDisbandRequest):
    """
    Disbands a package, detaching all its member assets back to standalone wire stories.
    """
    matching_assets = [a for a in WIRE_STORE.values() if a.event_id == req.event_id]
    for asset in matching_assets:
        asset.event_id = None
        asset.event_title = None

    return {
        "success": True,
        "event_id": req.event_id,
        "disbanded_count": len(matching_assets)
    }
