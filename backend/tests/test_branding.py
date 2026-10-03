import pytest
from app.services.packaging_service import PackagingService
from fastapi.testclient import TestClient
from app.main import app
from app.services.intake_service import WIRE_STORE
from app.models.schemas import MediaAssetResponse, TelemetryData, ModerationResult

def test_dual_delivery_clean_vs_branded_urls():
    """Verifies that clean feed has zero text while branded feed carries station styling."""
    urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_dual_asset",
        headline="BREAKING: HIGH SPEED PURSUIT",
        pixelate_bystanders=True,
        brand_theme="global_wire"
    )

    assert "broadcast_16_9_clean" in urls
    assert "broadcast_16_9_branded" in urls

    clean_url = urls["broadcast_16_9_clean"]
    branded_url = urls["broadcast_16_9_branded"]

    # Clean feed: must have face blur and 16:9 crop, but ZERO text overlays
    assert "e_pixelate_faces:10" in clean_url
    assert "ar_16:9" in clean_url
    assert "l_text" not in clean_url
    assert "b_rgb" not in clean_url

    # Branded feed: maintains clean broadcast master framing, zero burned text
    assert "ar_16:9" in branded_url
    assert "l_text" not in branded_url

def test_custom_transparent_strap_overlay():
    """Verifies that custom station bug watermark is placed in corner and constrained via Cloudinary syntax."""
    custom_urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_asset",
        headline="LIVE REPORT FROM HARBOR",
        custom_strap_id="presswire/branding/cbs_newyork_bug"
    )
    branded = custom_urls["broadcast_16_9_branded"]
    # Cloudinary corner watermark bug syntax
    assert "l_presswire:branding:cbs_newyork_bug" in branded
    assert "w_180" in branded
    assert "h_70" in branded
    assert "c_fit" in branded
    assert "g_north_east" in branded

def test_sidecar_metadata_endpoint():
    """Verifies that the /sidecar endpoint returns structured automation JSON for television control rooms."""
    test_pid = "presswire/sidecar_test_asset"
    WIRE_STORE[test_pid] = MediaAssetResponse(
        public_id=test_pid,
        format="jpg",
        width=1920,
        height=1080,
        bytes=50000,
        secure_url=f"https://res.cloudinary.com/test/{test_pid}.jpg",
        telemetry=TelemetryData(make="Nikon", model="Z9", gps_latitude=40.7128, gps_longitude=-74.0060),
        moderation=ModerationResult(status="approved"),
        headline="Breaking Harbor Fire",
        incident_type="Public Safety",
        urgency="breaking",
        created_at="2026-10-03T06:00:00Z",
        syndication_urls=PackagingService.generate_broadcast_urls(public_id=test_pid, headline="Breaking Harbor Fire")
    )

    client = TestClient(app)
    resp = client.get(f"/api/v1/editorial/sidecar/{test_pid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["public_id"] == test_pid
    assert data["headline"] == "Breaking Harbor Fire"
    assert data["gps_latitude"] == 40.7128
    assert "clean_master_url" in data
    assert "broadcast_16_9_clean_url" in data
    assert "broadcast_16_9_branded_url" in data
