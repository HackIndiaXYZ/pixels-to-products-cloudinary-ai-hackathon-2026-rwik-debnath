from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.intake_service import IntakeService
from app.models.schemas import MediaAssetResponse

router = APIRouter()

@router.post("/upload", response_model=MediaAssetResponse)
async def intake_upload(
    file: UploadFile = File(...),
    incident_type: str = Form("breaking_news"),
    urgency: str = Form("breaking"),
    headline: str = Form("BREAKING NEWS: CITIZEN REPORT"),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None)
):
    """
    Public Intake Gate:
    Accepts raw media upload from citizen or field reporter,
    initiates automated moderation, extracts EXIF/GPS telemetry,
    and runs facial detection coordinate indexing.
    """
    try:
        content = await file.read()
        resource_type = "video" if file.content_type and "video" in file.content_type else "image"
        
        asset = await IntakeService.process_upload(
            file_bytes=content,
            filename=file.filename or "upload.jpg",
            incident_type=incident_type,
            urgency=urgency,
            headline=headline,
            simulated_lat=lat,
            simulated_lng=lng,
            resource_type=resource_type
        )
        return asset
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
