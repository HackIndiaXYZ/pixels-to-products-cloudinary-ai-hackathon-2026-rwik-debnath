import pytest
from app.services.packaging_service import PackagingService
from app.models.schemas import FaceCoordinate, TelemetryData
import datetime

def test_packaging_url_generation():
    urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_asset",
        headline="BREAKING: PROTEST GATHERING",
        pixelate_bystanders=True,
        resource_type="image"
    )
    assert "broadcast_16_9" in urls
    assert "broadcast_16_9_clean" in urls
    assert "social_9_16" in urls
    assert "feed_1_1" in urls
    assert "clean_master" in urls
    
    # Check that packaged 16:9 includes lower third overlay parameters
    assert "c_fill" in urls["broadcast_16_9"]
    assert "ar_16:9" in urls["broadcast_16_9"]
    assert "l_text" in urls["broadcast_16_9"]
    assert "e_pixelate_faces:10" in urls["broadcast_16_9"]

    # Check that clean 16:9 broadcast has redactions but NO burned-in lower-third text
    assert "c_fill" in urls["broadcast_16_9_clean"]
    assert "ar_16:9" in urls["broadcast_16_9_clean"]
    assert "l_text" not in urls["broadcast_16_9_clean"]
    assert "e_pixelate_faces:10" in urls["broadcast_16_9_clean"]

def test_video_packaging_urls():
    urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_video",
        headline="STORM INCOMING",
        pixelate_bystanders=True,
        resource_type="video"
    )
    assert "video_highlight_6s" in urls
    assert "e_preview:duration_6:max_seg_3" in urls["video_highlight_6s"]
    assert "e_pixelate_faces:10" in urls["video_highlight_6s"]
    assert "/video/upload/" in urls["broadcast_16_9"]
    assert "/video/upload/" in urls["social_9_16"]
    assert "/video/upload/" in urls["clean_master"]


def test_delete_asset():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    test_id = "presswire/test_delete_me"
    WIRE_STORE[test_id] = MediaAssetResponse(
        public_id=test_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(),
        moderation=ModerationResult(),
        review_status="action_required",
        created_at=datetime.datetime.now().isoformat()
    )
    
    assert test_id in WIRE_STORE
    res = client.delete(f"/api/v1/editorial/asset/{test_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert test_id in data["deleted_ids"]
    assert test_id not in WIRE_STORE


def test_batch_delete_assets():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    id1 = "presswire/test_batch_1"
    id2 = "presswire/test_batch_2"
    for tid in [id1, id2]:
        WIRE_STORE[tid] = MediaAssetResponse(
            public_id=tid,
            format="jpg",
            resource_type="image",
            width=1200,
            height=800,
            bytes=50000,
            secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            telemetry=TelemetryData(),
            moderation=ModerationResult(),
            review_status="action_required",
            created_at=datetime.datetime.now().isoformat()
        )
    
    res = client.post("/api/v1/editorial/batch-delete", json={"public_ids": [id1, id2]})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] == 2
    assert id1 not in WIRE_STORE
    assert id2 not in WIRE_STORE


def test_update_metadata_and_repackaging():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    test_id = "presswire/test_meta_edit"
    WIRE_STORE[test_id] = MediaAssetResponse(
        public_id=test_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(),
        moderation=ModerationResult(),
        review_status="action_required",
        incident_type="uncategorized",
        urgency="standard",
        headline="Old Draft Headline",
        created_at=datetime.datetime.now().isoformat()
    )

    payload = {
        "public_id": test_id,
        "face_coordinates": [],
        "headline": "NEW BROADCAST: TRANSIT SYSTEM RESTORED",
        "incident_type": "transit",
        "urgency": "breaking",
        "review_status": "approved"
    }

    res = client.post("/api/v1/editorial/redact", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["headline"] == "NEW BROADCAST: TRANSIT SYSTEM RESTORED"
    assert data["incident_type"] == "transit"
    assert data["urgency"] == "breaking"
    assert data["review_status"] == "approved"

    # Verify repackaged broadcast 16:9 lower-third URL contains updated headline
    broadcast_url = data["syndication_urls"]["broadcast_16_9"]
    assert "TRANSIT" in broadcast_url
    assert "RESTORED" in broadcast_url
    assert test_id in WIRE_STORE
    assert WIRE_STORE[test_id].incident_type == "transit"


def test_archive_toggle():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    test_id = "presswire/test_archive_toggle"
    WIRE_STORE[test_id] = MediaAssetResponse(
        public_id=test_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(),
        moderation=ModerationResult(),
        review_status="approved",
        is_archived=False,
        created_at=datetime.datetime.now().isoformat()
    )

    # Archive single
    res = client.post("/api/v1/editorial/archive", json={"public_id": test_id, "is_archived": True})
    assert res.status_code == 200
    assert res.json()["is_archived"] is True
    assert WIRE_STORE[test_id].is_archived is True

    # Restore single
    res = client.post("/api/v1/editorial/archive", json={"public_id": test_id, "is_archived": False})
    assert res.status_code == 200
    assert res.json()["is_archived"] is False
    assert WIRE_STORE[test_id].is_archived is False


def test_batch_archive_and_sweep():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    id1 = "presswire/test_batch_arc_1"
    id2 = "presswire/test_batch_arc_2"
    for tid in [id1, id2]:
        WIRE_STORE[tid] = MediaAssetResponse(
            public_id=tid,
            format="jpg",
            resource_type="image",
            width=1200,
            height=800,
            bytes=50000,
            secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            telemetry=TelemetryData(),
            moderation=ModerationResult(),
            review_status="approved",
            is_archived=False,
            created_at=datetime.datetime.now().isoformat()
        )

    # Batch archive
    res = client.post("/api/v1/editorial/batch-archive", json={"public_ids": [id1, id2], "is_archived": True})
    assert res.status_code == 200
    assert res.json()["count"] == 2
    assert WIRE_STORE[id1].is_archived is True
    assert WIRE_STORE[id2].is_archived is True

    # Restore both
    client.post("/api/v1/editorial/batch-archive", json={"public_ids": [id1, id2], "is_archived": False})
    assert WIRE_STORE[id1].is_archived is False
    assert WIRE_STORE[id2].is_archived is False

    # Test sweep-approved
    sweep_res = client.post("/api/v1/editorial/sweep-approved")
    assert sweep_res.status_code == 200
    sweep_data = sweep_res.json()
    assert sweep_data["success"] is True
    assert id1 in sweep_data["swept_ids"]
    assert id2 in sweep_data["swept_ids"]
    assert WIRE_STORE[id1].is_archived is True
    assert WIRE_STORE[id2].is_archived is True


def test_search_query_with_archived():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    tid = "presswire/test_search_deep"
    WIRE_STORE[tid] = MediaAssetResponse(
        public_id=tid,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(),
        moderation=ModerationResult(),
        headline="HELICOPTER RESCUE OVER BAY",
        review_status="approved",
        is_archived=True,
        created_at=datetime.datetime.now().isoformat()
    )

    # Query with is_archived=true
    res = client.get(f"/api/v1/search/query?q=HELICOPTER&is_archived=true")
    assert res.status_code == 200
    data = res.json()
    assert any(a["public_id"] == tid for a in data)

    # Query with is_archived=false should not return tid
    res_false = client.get(f"/api/v1/search/query?q=HELICOPTER&is_archived=false")
    assert res_false.status_code == 200
    assert not any(a["public_id"] == tid for a in res_false.json())


