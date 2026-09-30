from fastapi import APIRouter
from app.services.packaging_service import PackagingService

router = APIRouter()

@router.get("/urls")
async def get_packaging_urls(
    public_id: str,
    headline: str = "BREAKING NEWS",
    subheadline: str = "EYEWITNESS REPORT",
    pixelate: bool = True,
    resource_type: str = "image"
):
    """
    On-demand packaging URL builder for syndication feeds.
    Returns 16:9, 9:16, 1:1, and 6s video preview formats.
    """
    return PackagingService.generate_broadcast_urls(
        public_id=public_id,
        headline=headline,
        subheadline=subheadline,
        pixelate_bystanders=pixelate,
        resource_type=resource_type
    )
