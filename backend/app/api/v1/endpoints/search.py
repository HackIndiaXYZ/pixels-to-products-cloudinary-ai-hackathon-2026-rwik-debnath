from fastapi import APIRouter
from typing import Optional, List
from app.services.search_service import SearchService
from app.models.schemas import MediaAssetResponse

router = APIRouter()

@router.get("/query", response_model=List[MediaAssetResponse])
async def search_wire(
    q: Optional[str] = None,
    incident_type: Optional[str] = None,
    review_status: Optional[str] = None,
    urgency: Optional[str] = None,
    is_archived: Optional[bool] = None,
    limit: int = 30
):
    """
    Real-time newsroom search querying Cloudinary assets by tags,
    metadata fields (review_status, urgency), and incident types.
    """
    return SearchService.query_assets(
        query_str=q,
        incident_type=incident_type,
        review_status=review_status,
        urgency=urgency,
        is_archived=is_archived,
        max_results=limit
    )
