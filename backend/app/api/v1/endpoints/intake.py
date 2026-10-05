from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional
from app.services.intake_service import IntakeService, WIRE_STORE, PACKAGE_STORE
from app.services.broadcaster import broadcaster
from app.models.schemas import MediaAssetResponse

router = APIRouter()

@router.post("/upload", response_model=MediaAssetResponse)
async def intake_upload(
    request: Request,
    file: UploadFile = File(...),
    incident_type: str = Form("breaking_news"),
    urgency: str = Form("breaking"),
    headline: str = Form("BREAKING NEWS: CITIZEN REPORT"),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    waiver_signed: bool = Form(True)
):
    """
    Public Intake Gate:
    Accepts raw media upload from citizen or field reporter,
    initiates automated moderation, extracts EXIF/GPS telemetry,
    logs irrevocable broadcast copyright release waiver,
    and runs facial detection coordinate indexing.
    """
    content_type = (file.content_type or "").lower()
    filename_lower = (file.filename or "").lower()
    if "video" in content_type or any(filename_lower.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"]):
        raise HTTPException(
            status_code=400,
            detail="Video uploads are not supported. PressWire Wire Intake exclusively processes high-resolution photo journalism (JPEG, PNG, WebP, HEIC)."
        )

    try:
        content = await file.read()
        client_ip = request.client.host if request.client else "127.0.0.1"
        
        asset = await IntakeService.process_upload(
            file_bytes=content,
            filename=file.filename or "upload.jpg",
            incident_type=incident_type,
            urgency=urgency,
            headline=headline,
            simulated_lat=lat,
            simulated_lng=lng,
            resource_type="image",
            waiver_signed=waiver_signed,
            submitter_ip=client_ip
        )
        broadcaster.broadcast("asset:ingested", asset.model_dump())
        if asset.event_id and asset.event_id in PACKAGE_STORE:
            pkg = PACKAGE_STORE[asset.event_id]
            pkg.asset_count = sum(1 for a in WIRE_STORE.values() if a.event_id == asset.event_id)
            broadcaster.broadcast("package:updated", pkg.model_dump())
        return asset
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate-batch")
async def simulate_batch_intake(request: Request):
    """
    Ingests the 4 canonical breaking news assets from data/assets:
    1. modi_1.jpg: PM Modi speech (politics_civic, breaking)
    2. modi_2.jpg: PM Convoy arrive (politics_civic, breaking -> auto-clusters with modi_1!)
    3. car.jpg: Highway Patrol inspection (transit, standard -> OCR plate detection)
    4. severe_weather.jpg: Coastal Cyclone warning (severe_weather, breaking -> 0 faces)
    """
    import os
    candidate_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "data", "assets")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "assets")),
        os.path.abspath(os.path.join(os.getcwd(), "..", "data", "assets")),
        os.path.abspath(os.path.join(os.getcwd(), "data", "assets")),
        "/app/data/assets",
        "/data/assets",
    ]
    base_dir = next((d for d in candidate_dirs if os.path.exists(d)), candidate_dirs[0])
    if not os.path.exists(base_dir):
        raise HTTPException(
            status_code=404,
            detail=f"Asset directory not found. Checked: {candidate_dirs}"
        )

    specs = [
        {
            "file": "modi_1.jpg" if os.path.exists(os.path.join(base_dir, "modi_1.jpg")) else "pm_angle_1.jpg",
            "headline": "PM Modi Addresses Public Rally in West Bengal",
            "incident_type": "politics_civic",
            "urgency": "breaking"
        },
        {
            "file": "modi_2.jpg" if os.path.exists(os.path.join(base_dir, "modi_2.jpg")) else "pm_angle_2.jpg",
            "headline": "Eyewitness Angle: PM Convoy Arrives at Brigade Ground",
            "incident_type": "politics_civic",
            "urgency": "breaking"
        },
        {
            "file": "car.jpg",
            "headline": "Traffic Bureau Alert: Highway Patrol Inspection",
            "incident_type": "transit",
            "urgency": "standard"
        },
        {
            "file": "severe_weather.jpg",
            "headline": "Severe Weather Warning: Monsoonal Storm System Detected",
            "incident_type": "severe_weather",
            "urgency": "breaking"
        },
        {
            "file": "accident.jpg" if os.path.exists(os.path.join(base_dir, "accident.jpg")) else "accident.png",
            "headline": "Highway Incident: Multi-Vehicle Collision Reported",
            "incident_type": "public_safety",
            "urgency": "breaking"
        }
    ]

    import asyncio
    client_ip = request.client.host if request.client else "127.0.0.1"
    valid_specs = [s for s in specs if os.path.exists(os.path.join(base_dir, s["file"]))]

    if not valid_specs:
        raise HTTPException(
            status_code=404,
            detail=f"No valid assets found in {base_dir}"
        )

    async def _run_batch_worker():
        import logging
        logger = logging.getLogger("presswire.batch")
        logger.info(f"[BatchIntake] Starting sequential background ingestion of {len(valid_specs)} assets...")
        for spec in valid_specs:
            try:
                p = os.path.join(base_dir, spec["file"])
                with open(p, "rb") as f:
                    content = f.read()

                asset = await IntakeService.process_upload(
                    file_bytes=content,
                    filename=spec["file"],
                    incident_type=spec["incident_type"],
                    urgency=spec["urgency"],
                    headline=spec["headline"],
                    resource_type="image",
                    waiver_signed=True,
                    submitter_ip=client_ip
                )
                # Broadcast immediately to desk over SSE as soon as this asset completes!
                broadcaster.broadcast("asset:ingested", asset.model_dump())
                if asset.event_id and asset.event_id in PACKAGE_STORE:
                    pkg = PACKAGE_STORE[asset.event_id]
                    pkg.asset_count = sum(1 for a in WIRE_STORE.values() if a.event_id == asset.event_id)
                    broadcaster.broadcast("package:updated", pkg.model_dump())
                logger.info(f"[BatchIntake] Successfully ingested and broadcast {spec['file']} -> {asset.public_id}")
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"[BatchIntake] Error ingesting {spec.get('file')}: {e}", exc_info=True)
        logger.info(f"[BatchIntake] Sequential batch ingestion completed.")

    # Spawn background task for immediate <50ms HTTP response to client (prevents mobile timeouts and OOM)
    asyncio.create_task(_run_batch_worker())

    return {
        "success": True,
        "count": len(valid_specs),
        "message": f"Batch transmission started for {len(valid_specs)} takes. Broadcasting live to editorial desk."
    }

