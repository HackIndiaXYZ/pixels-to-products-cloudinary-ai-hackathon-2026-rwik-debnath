from fastapi import APIRouter, HTTPException
from typing import List, Optional, Tuple
import datetime
import re
import httpx
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
    ResolveMapRequest,
    ResolveMapResponse,
    PackageRadiusRequest,
    PackageCreateRequest,
    PackageAssignRequest,
    PackageUpdateRequest,
    PackageDisbandRequest,
    BatchPackageAssignRequest,
    StoryPackageResponse,
    FocalPointRequest
)
from app.services.redaction_service import RedactionService
from app.services.packaging_service import PackagingService
from app.services.intake_service import WIRE_STORE, PACKAGE_STORE, IntakeService

router = APIRouter()

@router.get("/queue", response_model=List[MediaAssetResponse])
async def get_wire_queue():
    """Returns the live newsroom wire queue sorted by creation date."""
    return sorted(list(WIRE_STORE.values()), key=lambda x: x.created_at, reverse=True)

@router.get("/packages", response_model=List[StoryPackageResponse])
async def get_packages():
    """Returns all registered story packages, dynamically syncing any active asset clusters."""
    # Ensure any packages in WIRE_STORE are registered in PACKAGE_STORE
    for a in WIRE_STORE.values():
        if a.event_id and a.event_id not in PACKAGE_STORE:
            PACKAGE_STORE[a.event_id] = StoryPackageResponse(
                event_id=a.event_id,
                event_title=a.event_title or a.headline or "Story Package",
                incident_type=a.incident_type or "uncategorized",
                cluster_radius_km=a.cluster_radius_km if a.cluster_radius_km is not None else 1.5,
                package_window_hours=getattr(a, "package_window_hours", 1.0) or 1.0,
                package_status=getattr(a, "package_status", "active") or "active",
                lat=a.telemetry.gps_latitude if a.telemetry else None,
                lng=a.telemetry.gps_longitude if a.telemetry else None,
                created_at=a.created_at,
                asset_count=0
            )

    # Recalculate live asset_count for each package
    for pkg_id, pkg in PACKAGE_STORE.items():
        matching = [a for a in WIRE_STORE.values() if a.event_id == pkg_id]
        pkg.asset_count = len(matching)

    return sorted(list(PACKAGE_STORE.values()), key=lambda x: x.created_at, reverse=True)

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

    # Update Cloudinary explicit face_coordinates
    version = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    update_res = RedactionService.update_selective_faces(
        public_id=req.public_id,
        bystander_coordinates=req.face_coordinates
    )
    if update_res.get("success") and update_res.get("version"):
        version = update_res["version"]
    
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
    if req.pixelate_bystanders is not None:
        pixelate_flag = req.pixelate_bystanders
    elif len(req.face_coordinates) == 0:
        pixelate_flag = False
    else:
        pixelate_flag = True
    asset.pixelate_bystanders = pixelate_flag

    if req.focal_x is not None:
        asset.focal_x = req.focal_x
    if req.focal_y is not None:
        asset.focal_y = req.focal_y
    if req.focal_gravity is not None:
        asset.focal_gravity = req.focal_gravity

    # Re-generate broadcast packaging URLs with updated headline / bystander count / version / focal framing
    asset.syndication_urls = PackagingService.generate_broadcast_urls(
        public_id=asset.public_id,
        headline=asset.headline or "BREAKING NEWS",
        pixelate_bystanders=pixelate_flag,
        resource_type="image",
        version=version,
        focal_x=asset.focal_x,
        focal_y=asset.focal_y,
        focal_gravity=asset.focal_gravity
    )

    WIRE_STORE[req.public_id] = asset
    return asset

@router.post("/focal-point", response_model=MediaAssetResponse)
async def update_focal_point(req: FocalPointRequest):
    """
    Updates editorial crop focal coordinates (focal_x, focal_y, focal_gravity)
    and deterministically regenerates syndication packaging URLs.
    """
    if req.public_id not in WIRE_STORE:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset = WIRE_STORE[req.public_id]
    asset.focal_x = req.focal_x
    asset.focal_y = req.focal_y
    if req.focal_gravity is not None:
        asset.focal_gravity = req.focal_gravity

    version = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    asset.syndication_urls = PackagingService.generate_broadcast_urls(
        public_id=asset.public_id,
        headline=asset.headline or "BREAKING NEWS",
        pixelate_bystanders=asset.pixelate_bystanders,
        resource_type=asset.resource_type,
        version=version,
        focal_x=asset.focal_x,
        focal_y=asset.focal_y,
        focal_gravity=asset.focal_gravity
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
        pixelate_bystanders=asset.pixelate_bystanders,
        resource_type=asset.resource_type,
        focal_x=asset.focal_x,
        focal_y=asset.focal_y,
        focal_gravity=asset.focal_gravity
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

def extract_coords_from_text(text: str) -> Optional[Tuple[float, float]]:
    """Extracts latitude and longitude from URLs, query strings, or HTML content."""
    if not text:
        return None

    # 1. Standard @lat,lng in Google Maps URL
    m = re.search(r'@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 2. Query parameters (q=lat,lng or ll=lat,lng or loc=lat,lng or center=lat,lng)
    m = re.search(r'[?&](?:q|ll|loc|center|daddr|saddr)=(-?\d{1,2}\.\d+)[,+](-?\d{1,3}\.\d+)', text, re.IGNORECASE)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 3. Google protobuf coordinates: !3dlat!4dlng
    m = re.search(r'!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 4. OpenStreetMap #map=zoom/lat/lng
    m = re.search(r'#map=\d+/(-?\d{1,2}\.\d+)/(-?\d{1,3}\.\d+)', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 5. Raw coordinate string: e.g. "37.7749, -122.4194"
    m = re.search(r'^(-?\d{1,2}(?:\.\d+)?)[°\s]*([NSns])?[,\s]+(-?\d{1,3}(?:\.\d+)?)[°\s]*([EWew])?$', text.strip())
    if m:
        lat = float(m.group(1))
        if (m.group(2) or '').upper() == 'S':
            lat = -abs(lat)
        lng = float(m.group(3))
        if (m.group(4) or '').upper() == 'W':
            lng = -abs(lng)
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 6. HTML staticmap or image center
    m = re.search(r'center=(-?\d{1,2}\.\d+)(?:%2C|,)(-?\d{1,3}\.\d+)', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    # 7. Google Maps APP_INITIALIZATION_STATE coordinates
    m = re.search(r'\[null,null,(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)\]', text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng

    return None

@router.post("/resolve-map", response_model=ResolveMapResponse)
async def resolve_map_url(req: ResolveMapRequest):
    """
    Expands shortened map links (maps.app.goo.gl, goo.gl/maps, etc.)
    and extracts geographical coordinates (lat, lng) and location name.
    """
    raw_input = req.url.strip()
    if not raw_input:
        return ResolveMapResponse(success=False, error="Please provide a valid map link or coordinates.")

    # Fast path: check if coordinates can be extracted directly from string
    coords = extract_coords_from_text(raw_input)
    if coords:
        return ResolveMapResponse(
            success=True,
            lat=coords[0],
            lng=coords[1],
            resolved_url=raw_input if raw_input.startswith("http") else None
        )

    # If not a URL and could not parse coords
    if not (raw_input.startswith("http://") or raw_input.startswith("https://")):
        return ResolveMapResponse(
            success=False,
            error="Could not parse coordinates. Please enter valid lat, lng or paste a map URL."
        )

    # Follow redirect on the URL
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=8.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        ) as client:
            resp = await client.get(raw_input)
            final_url = str(resp.url)

            if resp.status_code == 404:
                return ResolveMapResponse(
                    success=False,
                    error="Map link returned 404 Not Found. Please verify the URL or enter coordinates directly below."
                )

            # Try to extract from the expanded destination URL
            coords = extract_coords_from_text(final_url)

            # If not in the URL, inspect the HTML content
            if not coords and resp.text:
                coords = extract_coords_from_text(resp.text)

            # Extract location title if available
            location_name = None
            if resp.text:
                m_title = re.search(r'<meta property="og:title" content="([^"]+)">', resp.text) or re.search(r'<title>([^<]+)</title>', resp.text)
                if m_title:
                    title_text = m_title.group(1).replace(" - Google Maps", "").replace("Google Maps", "").strip()
                    if title_text and not title_text.startswith("http"):
                        location_name = title_text

            if coords:
                return ResolveMapResponse(
                    success=True,
                    lat=coords[0],
                    lng=coords[1],
                    resolved_url=final_url,
                    location_name=location_name
                )
            else:
                return ResolveMapResponse(
                    success=False,
                    error="Could not extract coordinates from this link. Please enter lat, lng directly below.",
                    resolved_url=final_url
                )
    except httpx.TimeoutException:
        return ResolveMapResponse(
            success=False,
            error="Map link resolution timed out. Please enter lat, lng directly below."
        )
    except Exception as e:
        return ResolveMapResponse(
            success=False,
            error=f"Failed to resolve map link: {str(e)}"
        )

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
            a.incident_type = anchor_asset.incident_type
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

        # Look up package from PACKAGE_STORE or existing assets in WIRE_STORE
        target_pkg = PACKAGE_STORE.get(cleaned_id)
        target_beat = target_pkg.incident_type if target_pkg else None
        target_title = target_pkg.event_title if target_pkg else req.event_title

        if not target_beat or not target_title:
            existing_event = next((a for a in WIRE_STORE.values() if a.event_id == cleaned_id and a.public_id != req.public_id), None)
            if existing_event:
                target_beat = target_beat or existing_event.incident_type
                target_title = target_title or existing_event.event_title

        if target_beat:
            asset.incident_type = target_beat
        if target_title:
            asset.event_title = target_title.strip()
        elif req.event_title:
            asset.event_title = req.event_title.strip()

    WIRE_STORE[req.public_id] = asset

    if req.event_id and req.event_id.strip():
        pkg = PACKAGE_STORE.get(req.event_id.strip())
        if pkg:
            pkg.asset_count = sum(1 for a in WIRE_STORE.values() if a.event_id == pkg.event_id)

    return asset

@router.post("/package/batch-assign")
async def batch_assign_package(req: BatchPackageAssignRequest):
    """
    Mass assigns multiple assets to a package or mass-detaches them to standalone stories.
    """
    updated_ids = []
    is_detach = not req.event_id or req.event_id.strip() == "" or req.event_id.lower() in ("none", "standalone")
    cleaned_id = None if is_detach else req.event_id.strip()

    target_beat = None
    target_title = req.event_title
    target_pkg = PACKAGE_STORE.get(cleaned_id) if cleaned_id else None
    if target_pkg:
        target_beat = target_pkg.incident_type
        target_title = target_pkg.event_title or target_title

    if cleaned_id and (not target_beat or not target_title):
        existing_event = next((a for a in WIRE_STORE.values() if a.event_id == cleaned_id and a.public_id not in req.public_ids), None)
        if existing_event:
            target_beat = target_beat or existing_event.incident_type
            target_title = target_title or existing_event.event_title

    for pid in req.public_ids:
        if pid in WIRE_STORE:
            asset = WIRE_STORE[pid]
            if is_detach:
                asset.event_id = None
                asset.event_title = None
            else:
                asset.event_id = cleaned_id
                if target_beat:
                    asset.incident_type = target_beat
                if target_title:
                    asset.event_title = target_title.strip()
            WIRE_STORE[pid] = asset
            updated_ids.append(pid)

    if target_pkg and cleaned_id:
        target_pkg.asset_count = sum(1 for a in WIRE_STORE.values() if a.event_id == cleaned_id)

    return {
        "success": True,
        "count": len(updated_ids),
        "public_ids": updated_ids,
        "event_id": cleaned_id,
        "event_title": target_title,
        "incident_type": target_beat
    }

@router.post("/package/create", response_model=StoryPackageResponse)
async def create_package(req: PackageCreateRequest):
    """
    Creates a new manual package dossier with an optional geo-anchor.
    If coordinates are supplied, incoming field media near that anchor will auto-cluster into it.
    Strictly prevents duplicate titles and guarantees unique event_ids.
    """
    clean_title = req.event_title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Package title / headline cannot be empty.")

    clean_lower = clean_title.lower()

    # 1. Title Uniqueness: Prevent two packages from sharing conflicting names
    for p in PACKAGE_STORE.values():
        if p.event_title.strip().lower() == clean_lower:
            raise HTTPException(
                status_code=400,
                detail=f"A story package named '{clean_title}' already exists. Package titles must be unique."
            )
    for a in WIRE_STORE.values():
        if a.event_id and a.event_title and a.event_title.strip().lower() == clean_lower:
            raise HTTPException(
                status_code=400,
                detail=f"A story package named '{clean_title}' already exists. Package titles must be unique."
            )

    # 2. ID Uniqueness: Generate deterministic yet guaranteed collision-free event_id
    import re
    slug = re.sub(r'[^a-zA-Z0-9]+', '_', clean_lower).strip('_')
    base_id = f"evt_{slug}" if slug else f"evt_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"

    existing_ids = set(PACKAGE_STORE.keys()) | {a.event_id for a in WIRE_STORE.values() if a.event_id}
    event_id = base_id
    counter = 2
    while event_id in existing_ids:
        event_id = f"{base_id}_{counter}"
        counter += 1

    # Normalize incident beat: default to uncategorized (General Wire) if empty or legacy 'breaking'
    raw_beat = (req.incident_type or "").strip().lower()
    if not raw_beat or raw_beat in ("breaking", "none", "null", "undefined"):
        incident_type = "uncategorized"
    elif raw_beat == "breaking_news":
        incident_type = "breaking_news"
    else:
        incident_type = req.incident_type

    # Cluster any existing assets matching coordinates
    clustered_count = 0
    if req.lat is not None and req.lng is not None:
        for a in WIRE_STORE.values():
            if a.telemetry.has_gps and a.telemetry.gps_latitude is not None and a.telemetry.gps_longitude is not None:
                dist = IntakeService._haversine_km(req.lat, req.lng, a.telemetry.gps_latitude, a.telemetry.gps_longitude)
                if dist <= req.cluster_radius_km:
                    a.event_id = event_id
                    a.event_title = clean_title
                    a.incident_type = incident_type
                    a.cluster_radius_km = req.cluster_radius_km
                    clustered_count += 1

    pkg = StoryPackageResponse(
        event_id=event_id,
        event_title=clean_title,
        incident_type=incident_type,
        cluster_radius_km=req.cluster_radius_km if req.cluster_radius_km is not None else 1.5,
        package_window_hours=1.0,
        package_status="active",
        lat=req.lat,
        lng=req.lng,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        asset_count=clustered_count,
        clustered_assets=clustered_count
    )
    PACKAGE_STORE[event_id] = pkg
    return pkg

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
    Updates package properties (title, beat, radius, window, status) across all grouped assets and PACKAGE_STORE.
    Ensures renamed titles do not collide with another active package.
    """
    matching_assets = [a for a in WIRE_STORE.values() if a.event_id == req.event_id]
    pkg = PACKAGE_STORE.get(req.event_id)

    if not matching_assets and not pkg:
        raise HTTPException(status_code=404, detail="Package event_id not found")

    if req.event_title is not None and req.event_title.strip():
        new_title = req.event_title.strip()
        new_lower = new_title.lower()
        for other_id, other_pkg in PACKAGE_STORE.items():
            if other_id != req.event_id and other_pkg.event_title.strip().lower() == new_lower:
                raise HTTPException(
                    status_code=400,
                    detail=f"Another package is already titled '{new_title}'. Package titles must be unique."
                )
        for a in WIRE_STORE.values():
            if a.event_id and a.event_id != req.event_id and a.event_title and a.event_title.strip().lower() == new_lower:
                raise HTTPException(
                    status_code=400,
                    detail=f"Another package is already titled '{new_title}'. Package titles must be unique."
                )
        title = new_title
    else:
        title = pkg.event_title if pkg else (matching_assets[0].event_title if matching_assets else "")
    incident_type = req.incident_type.strip() if req.incident_type is not None and req.incident_type.strip() else (pkg.incident_type if pkg else (matching_assets[0].incident_type if matching_assets else "uncategorized"))
    radius = req.cluster_radius_km if req.cluster_radius_km is not None else (pkg.cluster_radius_km if pkg else 1.5)
    window = req.package_window_hours if req.package_window_hours is not None else (pkg.package_window_hours if pkg else 1.0)
    status = req.package_status.strip().lower() if req.package_status is not None else (pkg.package_status if pkg else "active")

    # Handle Geo Anchor location updates
    new_lat = pkg.lat if pkg else None
    new_lng = pkg.lng if pkg else None
    if req.lat is not None and req.lng is not None:
        new_lat = req.lat
        new_lng = req.lng
        # Auto-cluster any assets in WIRE_STORE matching this new geo anchor within radius
        for a in WIRE_STORE.values():
            if a.event_id is None and a.telemetry.has_gps and a.telemetry.gps_latitude is not None and a.telemetry.gps_longitude is not None:
                dist = IntakeService._haversine_km(req.lat, req.lng, a.telemetry.gps_latitude, a.telemetry.gps_longitude)
                if dist <= radius:
                    a.event_id = req.event_id
                    a.event_title = title
                    a.incident_type = incident_type
                    a.cluster_radius_km = radius
                    if a not in matching_assets:
                        matching_assets.append(a)
    elif req.clear_location:
        new_lat = None
        new_lng = None

    for asset in matching_assets:
        asset.event_title = title
        asset.incident_type = incident_type
        asset.cluster_radius_km = radius
        asset.package_window_hours = window
        asset.package_status = status

    if pkg:
        pkg.event_title = title
        pkg.incident_type = incident_type
        pkg.cluster_radius_km = radius
        pkg.package_window_hours = window
        pkg.package_status = status
        pkg.lat = new_lat
        pkg.lng = new_lng
        pkg.asset_count = len(matching_assets)
    else:
        PACKAGE_STORE[req.event_id] = StoryPackageResponse(
            event_id=req.event_id,
            event_title=title,
            incident_type=incident_type,
            cluster_radius_km=radius,
            package_window_hours=window,
            package_status=status,
            lat=new_lat,
            lng=new_lng,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            asset_count=len(matching_assets)
        )

    return {
        "success": True,
        "event_id": req.event_id,
        "event_title": title,
        "incident_type": incident_type,
        "cluster_radius_km": radius,
        "package_window_hours": window,
        "package_status": status,
        "lat": new_lat,
        "lng": new_lng,
        "asset_count": len(matching_assets)
    }

@router.post("/package/disband")
async def disband_package(req: PackageDisbandRequest):
    """
    Disbands a package, detaching all its member assets back to standalone wire stories and removing from PACKAGE_STORE.
    """
    matching_assets = [a for a in WIRE_STORE.values() if a.event_id == req.event_id]
    for asset in matching_assets:
        asset.event_id = None
        asset.event_title = None

    PACKAGE_STORE.pop(req.event_id, None)

    return {
        "success": True,
        "event_id": req.event_id,
        "disbanded_count": len(matching_assets)
    }

@router.post("/clear-all")
async def clear_all_assets():
    """
    Purges all media assets and story packages from the live wire store, leaving the newsroom completely clean and empty.
    """
    count = len(WIRE_STORE)
    pkg_count = len(PACKAGE_STORE)
    WIRE_STORE.clear()
    PACKAGE_STORE.clear()
    return {
        "success": True,
        "cleared_count": count,
        "cleared_packages": pkg_count
    }

