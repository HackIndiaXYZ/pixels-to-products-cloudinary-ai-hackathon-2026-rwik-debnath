from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional
from app.services.intake_service import IntakeService
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
        return asset
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
