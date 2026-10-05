import asyncio
import pytest
from app.models.schemas import MediaAssetResponse, TelemetryData, ModerationResult
from app.services.intake_service import WIRE_STORE
from app.services.processing_service import ProcessingManager


@pytest.mark.asyncio
async def test_processing_manager_preemption():
    # Setup two mock pending assets in WIRE_STORE
    asset_a = MediaAssetResponse(
        public_id="presswire/test_asset_a",
        format="jpg",
        resource_type="image",
        width=1920,
        height=1080,
        bytes=1000,
        secure_url="https://res.cloudinary.com/test/image/upload/a.jpg",
        faces=[],
        telemetry=TelemetryData(),
        moderation=ModerationResult(status="approved"),
        review_status="approved",
        incident_type="general",
        urgency="standard",
        headline="Test Story A",
        syndication_urls={},
        processing_status="pending",
        created_at="2026-10-06T00:00:00Z"
    )
    asset_b = MediaAssetResponse(
        public_id="presswire/test_asset_b",
        format="jpg",
        resource_type="image",
        width=1920,
        height=1080,
        bytes=1000,
        secure_url="https://res.cloudinary.com/test/image/upload/b.jpg",
        faces=[],
        telemetry=TelemetryData(),
        moderation=ModerationResult(status="approved"),
        review_status="approved",
        incident_type="general",
        urgency="standard",
        headline="Test Story B",
        syndication_urls={},
        processing_status="pending",
        created_at="2026-10-06T00:00:01Z"
    )

    WIRE_STORE[asset_a.public_id] = asset_a
    WIRE_STORE[asset_b.public_id] = asset_b

    # 1. Start priority processing for asset A
    res_a = await ProcessingManager.start_priority_processing(asset_a.public_id)
    assert res_a["success"] is True
    assert res_a["processing_status"] == "processing"
    assert WIRE_STORE[asset_a.public_id].processing_status == "processing"

    # 2. Immediately start priority processing for asset B (preempting A)
    res_b = await ProcessingManager.start_priority_processing(asset_b.public_id)
    assert res_b["success"] is True
    assert res_b["processing_status"] == "processing"

    # Give event loop a cycle to register cancellation
    await asyncio.sleep(0.1)

    # Asset A should have been reset to 'pending' due to preemption
    assert WIRE_STORE[asset_a.public_id].processing_status == "pending"
    # Asset B should now be the active priority asset
    assert ProcessingManager._active_public_id == asset_b.public_id

    # Clean up
    await ProcessingManager.cancel_processing(asset_b.public_id)
    del WIRE_STORE[asset_a.public_id]
    del WIRE_STORE[asset_b.public_id]
