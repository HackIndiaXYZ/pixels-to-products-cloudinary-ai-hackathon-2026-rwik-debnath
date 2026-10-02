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
    
    # Check that broadcast 16:9 delivers clean unburned footage without lower-third overlay
    assert "c_fill" in urls["broadcast_16_9"]
    assert "ar_16:9" in urls["broadcast_16_9"]
    assert "l_text" not in urls["broadcast_16_9"]
    assert "e_blur_faces:400" in urls["broadcast_16_9"]

def test_video_upload_rejected():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    fake_video = b"\x00\x00\x00 ftypisom"
    response = client.post(
        "/api/v1/intake/upload",
        files={"file": ("breaking_scene.mp4", fake_video, "video/mp4")},
        data={"headline": "Breaking Video Report"}
    )
    assert response.status_code == 400
    assert "Video uploads are not supported" in response.json()["detail"]

def test_focal_point_packaging_urls():
    # Test default image 9:16 social reel uses clean c_fill with g_auto:subject
    default_urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_focal_default",
        resource_type="image"
    )
    assert "c_fill" in default_urls["social_9_16"]
    assert "g_auto:subject" in default_urls["social_9_16"]

    # Test custom focal coordinates generate xy_center gravity with exact coordinates
    custom_urls = PackagingService.generate_broadcast_urls(
        public_id="presswire/test_focal_custom",
        resource_type="image",
        focal_x=620,
        focal_y=370
    )
    assert "g_xy_center" in custom_urls["social_9_16"]
    assert "x_620" in custom_urls["social_9_16"]
    assert "y_370" in custom_urls["social_9_16"]
    assert "c_fill" in custom_urls["social_9_16"]

    assert "g_xy_center" in custom_urls["broadcast_16_9"]
    assert "x_620" in custom_urls["broadcast_16_9"]
    assert "y_370" in custom_urls["broadcast_16_9"]

    assert "g_xy_center" in custom_urls["feed_1_1"]
    assert "x_620" in custom_urls["feed_1_1"]
    assert "y_370" in custom_urls["feed_1_1"]



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
    assert test_id not in WIRE_STORE


def test_focal_point_endpoint():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    test_id = "presswire/test_focal_asset"
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

    res = client.post("/api/v1/editorial/focal-point", json={
        "public_id": test_id,
        "focal_x": 550,
        "focal_y": 320,
        "focal_gravity": "xy_center"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["focal_x"] == 550
    assert data["focal_y"] == 320
    assert "x_550" in data["syndication_urls"]["social_9_16"]
    assert "y_320" in data["syndication_urls"]["social_9_16"]
    assert "x_550" in data["syndication_urls"]["feed_1_1"]
    assert "y_320" in data["syndication_urls"]["feed_1_1"]



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

    # Verify repackaged broadcast 16:9 delivers clean unburned feed
    broadcast_url = data["syndication_urls"]["broadcast_16_9"]
    assert "ar_16:9" in broadcast_url
    assert "l_text" not in broadcast_url
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


def test_spatiotemporal_clustering():
    from app.services.intake_service import IntakeService, WIRE_STORE
    from app.models.schemas import MediaAssetResponse, TelemetryData, ModerationResult

    now = datetime.datetime.utcnow()
    id_a = "presswire/test_cluster_a"
    WIRE_STORE[id_a] = MediaAssetResponse(
        public_id=id_a,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(
            has_gps=True,
            gps_latitude=37.7842,
            gps_longitude=-122.4071
        ),
        moderation=ModerationResult(),
        headline="FIRE ALARM ON 4TH ST",
        event_id="evt_cluster_test_101",
        event_title="4th Street Commercial Fire",
        review_status="approved",
        created_at=now.isoformat()
    )

    cluster_id, cluster_title = IntakeService._find_spatiotemporal_cluster(
        lat=37.7850,
        lon=-122.4080,
        upload_time=now + datetime.timedelta(minutes=10),
        default_headline="Smoke visible near subway"
    )

    assert cluster_id == "evt_cluster_test_101"
    assert cluster_title == "4th Street Commercial Fire"


def test_cluster_radius_adjustment():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, TelemetryData, ModerationResult
    from fastapi.testclient import TestClient
    from app.main import app
    import datetime

    client = TestClient(app)
    now = datetime.datetime.now(datetime.timezone.utc)
    id_anchor = "presswire/test_radius_anchor"
    id_near = "presswire/test_radius_near"

    WIRE_STORE[id_anchor] = MediaAssetResponse(
        public_id=id_anchor,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(
            has_gps=True,
            gps_latitude=37.7840,
            gps_longitude=-122.4070
        ),
        moderation=ModerationResult(),
        headline="ANCHOR PROTEST EVENT",
        event_id="evt_radius_test",
        event_title="Downtown Protest",
        cluster_radius_km=1.5,
        review_status="approved",
        created_at=now.isoformat()
    )

    WIRE_STORE[id_near] = MediaAssetResponse(
        public_id=id_near,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample2.jpg",
        telemetry=TelemetryData(
            has_gps=True,
            gps_latitude=37.7845,
            gps_longitude=-122.4075
        ),
        moderation=ModerationResult(),
        headline="NEARBY RALLY ANGLE",
        event_id="evt_radius_test",
        event_title="Downtown Protest",
        cluster_radius_km=1.5,
        review_status="approved",
        created_at=now.isoformat()
    )

    # Adjust cluster radius via metadata endpoint
    res = client.post("/api/v1/editorial/metadata", json={
        "public_id": id_anchor,
        "cluster_radius_km": 3.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["cluster_radius_km"] == 3.0
    assert WIRE_STORE[id_near].cluster_radius_km == 3.0


def test_manual_geotagging_clustering():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    WIRE_STORE.clear()
    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC)

    # 1. Anchor asset already has GPS and an event ID
    anchor_id = "presswire/test_geo_anchor"
    WIRE_STORE[anchor_id] = MediaAssetResponse(
        public_id=anchor_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        telemetry=TelemetryData(
            has_gps=True,
            gps_latitude=37.7749,
            gps_longitude=-122.4194
        ),
        moderation=ModerationResult(),
        headline="Civic Center Protest",
        event_id="evt_civic_protest",
        event_title="Civic Center Protest",
        cluster_radius_km=1.5,
        created_at=now.isoformat()
    )

    # 2. Uploaded screenshot has NO GPS and no event_id
    nogps_id = "presswire/test_nogps_photo"
    WIRE_STORE[nogps_id] = MediaAssetResponse(
        public_id=nogps_id,
        format="png",
        resource_type="image",
        width=1200,
        height=800,
        bytes=40000,
        secure_url="https://res.cloudinary.com/demo/image/upload/sample2.jpg",
        telemetry=TelemetryData(has_gps=False),
        moderation=ModerationResult(),
        headline="Screenshot 1",
        event_id=None,
        event_title=None,
        created_at=now.isoformat()
    )

    # 3. Manually geotag the screenshot near the anchor (0.3 km away)
    res = client.post("/api/v1/editorial/geotag", json={
        "public_id": nogps_id,
        "lat": 37.7770,
        "lng": -122.4180,
        "location_name": "City Hall Plaza"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["telemetry"]["has_gps"] is True
    assert data["telemetry"]["gps_latitude"] == 37.7770
    # Confirms it joined the anchor's event cluster automatically
    assert data["event_id"] == "evt_civic_protest"
    assert data["event_title"] == "Civic Center Protest"


def test_package_radius_endpoint():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    event_id = "evt_package_test"

    WIRE_STORE["presswire/item_1"] = MediaAssetResponse(
        public_id="presswire/item_1",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/s1.jpg",
        telemetry=TelemetryData(has_gps=True, gps_latitude=37.7749, gps_longitude=-122.4194),
        moderation=ModerationResult(),
        headline="Item 1",
        event_id=event_id,
        event_title="Event Package 1",
        cluster_radius_km=1.5,
        created_at=datetime.datetime.now(datetime.UTC).isoformat()
    )

    res = client.post("/api/v1/editorial/package-radius", json={
        "event_id": event_id,
        "cluster_radius_km": 0.8
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["cluster_radius_km"] == 0.8
    assert WIRE_STORE["presswire/item_1"].cluster_radius_km == 0.8


def test_package_assign_and_detach():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC).isoformat()

    # Create target package anchor asset
    anchor_id = "presswire/anchor_asset"
    WIRE_STORE[anchor_id] = MediaAssetResponse(
        public_id=anchor_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/anchor.jpg",
        telemetry=TelemetryData(has_gps=True, gps_latitude=40.7128, gps_longitude=-74.0060),
        moderation=ModerationResult(),
        headline="Wall Street March",
        incident_type="Public Safety",
        event_id="evt_wall_street_march",
        event_title="Wall Street March Package",
        created_at=now
    )

    # Create a separate asset with its own GPS
    moving_id = "presswire/moving_asset"
    WIRE_STORE[moving_id] = MediaAssetResponse(
        public_id=moving_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=45000,
        secure_url="https://res.cloudinary.com/demo/image/upload/moving.jpg",
        telemetry=TelemetryData(has_gps=True, gps_latitude=40.7580, gps_longitude=-73.9855),
        moderation=ModerationResult(),
        headline="Times Square View",
        incident_type="General Wire",
        event_id=None,
        event_title=None,
        created_at=now
    )

    # 1. Assign moving_asset to Wall Street March package
    res = client.post("/api/v1/editorial/package/assign", json={
        "public_id": moving_id,
        "event_id": "evt_wall_street_march",
        "event_title": "Wall Street March Package"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == "evt_wall_street_march"
    assert data["event_title"] == "Wall Street March Package"
    assert data["incident_type"] == "Public Safety"
    # Ground truth hardware GPS must be preserved!
    assert data["telemetry"]["gps_latitude"] == 40.7580
    assert data["telemetry"]["gps_longitude"] == -73.9855

    # 2. Detach asset back to standalone
    res = client.post("/api/v1/editorial/package/assign", json={
        "public_id": moving_id,
        "event_id": None
    })
    assert res.status_code == 200
    detached_data = res.json()
    assert detached_data["event_id"] is None
    assert detached_data["event_title"] is None
    # GPS still preserved
    assert detached_data["telemetry"]["gps_latitude"] == 40.7580


def test_package_manual_create_with_geocluster():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC).isoformat()

    # Pre-populate asset near Golden Gate Bridge (37.8199, -122.4783)
    gg_id = "presswire/gg_bridge_shot"
    WIRE_STORE[gg_id] = MediaAssetResponse(
        public_id=gg_id,
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=50000,
        secure_url="https://res.cloudinary.com/demo/image/upload/gg.jpg",
        telemetry=TelemetryData(has_gps=True, gps_latitude=37.8200, gps_longitude=-122.4780),
        moderation=ModerationResult(),
        headline="Bridge Toll Plaza",
        incident_type="General Wire",
        event_id=None,
        event_title=None,
        created_at=now
    )

    # Create new package anchored at Golden Gate Bridge
    res = client.post("/api/v1/editorial/package/create", json={
        "event_title": "Golden Gate Traffic Closure",
        "incident_type": "Transit & Infrastructure",
        "lat": 37.8199,
        "lng": -122.4783,
        "cluster_radius_km": 1.0
    })
    assert res.status_code == 200
    pkg_data = res.json()
    assert pkg_data["success"] is True
    assert pkg_data["event_id"] == "evt_golden_gate_traffic_closure"
    assert pkg_data["clustered_assets"] >= 1
    # Check that gg_id got clustered into it
    assert WIRE_STORE[gg_id].event_id == "evt_golden_gate_traffic_closure"
    assert WIRE_STORE[gg_id].incident_type == "Transit & Infrastructure"


def test_package_update_and_disband():
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC).isoformat()
    evt_id = "evt_marina_fire"

    a1 = "presswire/marina_1"
    a2 = "presswire/marina_2"
    for aid in (a1, a2):
        WIRE_STORE[aid] = MediaAssetResponse(
            public_id=aid,
            format="jpg",
            resource_type="image",
            width=1200,
            height=800,
            bytes=50000,
            secure_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            telemetry=TelemetryData(),
            moderation=ModerationResult(),
            headline="Marina Fire Incident",
            incident_type="Public Safety",
            event_id=evt_id,
            event_title="Marina Fire Incident",
            cluster_radius_km=1.5,
            package_window_hours=1.0,
            package_status="active",
            created_at=now
        )

    # 1. Update package properties (title, beat, radius, window, status)
    res = client.post("/api/v1/editorial/package/update", json={
        "event_id": evt_id,
        "event_title": "3-Alarm Marina Harbor Fire",
        "incident_type": "Breaking News",
        "cluster_radius_km": 2.5,
        "package_window_hours": 3.0,
        "package_status": "locked"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["event_title"] == "3-Alarm Marina Harbor Fire"
    assert data["incident_type"] == "Breaking News"
    assert data["cluster_radius_km"] == 2.5
    assert data["package_window_hours"] == 3.0
    assert data["package_status"] == "locked"
    assert WIRE_STORE[a1].event_title == "3-Alarm Marina Harbor Fire"
    assert WIRE_STORE[a2].package_status == "locked"

    # 2. Disband package
    res2 = client.post("/api/v1/editorial/package/disband", json={
        "event_id": evt_id
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert WIRE_STORE[a1].event_id is None
    assert WIRE_STORE[a2].event_id is None

def test_package_batch_assign():
    """Verifies mass-assigning multiple assets to a package and mass-detaching them."""
    import datetime
    from app.services.intake_service import WIRE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    WIRE_STORE.clear()
    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC).isoformat()

    pids = ["presswire/batch_item_1", "presswire/batch_item_2", "presswire/batch_item_3"]
    for pid in pids:
        WIRE_STORE[pid] = MediaAssetResponse(
            public_id=pid,
            format="jpg",
            resource_type="image",
            width=1920,
            height=1080,
            bytes=50000,
            secure_url=f"https://res.cloudinary.com/demo/image/upload/{pid}.jpg",
            telemetry=TelemetryData(has_gps=False),
            moderation=ModerationResult(),
            headline="Field Wire Take",
            event_id=None,
            event_title=None,
            created_at=now
        )

    # 1. Mass assign all 3 items to a package
    res = client.post("/api/v1/editorial/package/batch-assign", json={
        "public_ids": pids,
        "event_id": "evt_downtown_parade",
        "event_title": "Downtown Festival Parade"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] == 3
    for pid in pids:
        assert WIRE_STORE[pid].event_id == "evt_downtown_parade"
        assert WIRE_STORE[pid].event_title == "Downtown Festival Parade"

    # 2. Mass detach items 1 and 2 to standalone
    res2 = client.post("/api/v1/editorial/package/batch-assign", json={
        "public_ids": ["presswire/batch_item_1", "presswire/batch_item_2"],
        "event_id": None
    })
    assert res2.status_code == 200
    assert WIRE_STORE["presswire/batch_item_1"].event_id is None
    assert WIRE_STORE["presswire/batch_item_2"].event_id is None
    assert WIRE_STORE["presswire/batch_item_3"].event_id == "evt_downtown_parade"


def test_packages_store_persistence_and_list():
    """Verifies empty package creation, listing via GET /packages, updating, and disbanding."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.services.intake_service import PACKAGE_STORE

    client = TestClient(app)

    # 1. Create an empty package (no assets in area)
    res = client.post("/api/v1/editorial/package/create", json={
        "event_title": "Empty Test Package",
        "incident_type": "Breaking News",
        "lat": 10.0,
        "lng": 20.0,
        "cluster_radius_km": 1.0
    })
    assert res.status_code == 200
    created = res.json()
    evt_id = created["event_id"]
    assert created["success"] is True
    assert created["clustered_assets"] == 0

    # 2. Verify it is listed in GET /api/v1/editorial/packages
    res_list = client.get("/api/v1/editorial/packages")
    assert res_list.status_code == 200
    packages = res_list.json()
    matched = next((p for p in packages if p["event_id"] == evt_id), None)
    assert matched is not None
    assert matched["event_title"] == "Empty Test Package"
    assert matched["asset_count"] == 0

    # 3. Update the package
    res_update = client.post("/api/v1/editorial/package/update", json={
        "event_id": evt_id,
        "event_title": "Renamed Test Package",
        "package_status": "locked"
    })
    assert res_update.status_code == 200
    assert PACKAGE_STORE[evt_id].event_title == "Renamed Test Package"
    assert PACKAGE_STORE[evt_id].package_status == "locked"

    # 4. Disband package
    res_disband = client.post("/api/v1/editorial/package/disband", json={
        "event_id": evt_id
    })
    assert res_disband.status_code == 200
    assert evt_id not in PACKAGE_STORE

    # 5. Verify it is no longer returned in GET /api/v1/editorial/packages
    res_list_after = client.get("/api/v1/editorial/packages")
    assert res_list_after.status_code == 200
    packages_after = res_list_after.json()
    assert not any(p["event_id"] == evt_id for p in packages_after)


def test_package_name_and_id_conflict_prevention():
    """Verifies that packages cannot share conflicting names, and that event_ids are strictly unique."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.services.intake_service import PACKAGE_STORE

    client = TestClient(app)

    # 1. Create first package
    res1 = client.post("/api/v1/editorial/package/create", json={
        "event_title": "City Hall Press Briefing",
        "incident_type": "Politics & Civic"
    })
    assert res1.status_code == 200
    pkg1 = res1.json()
    assert pkg1["event_title"] == "City Hall Press Briefing"
    evt1_id = pkg1["event_id"]

    # 2. Duplicate name creation must be rejected with 400
    res_dup = client.post("/api/v1/editorial/package/create", json={
        "event_title": "  city hall press briefing  ",
        "incident_type": "General Wire"
    })
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"]

    # 3. Create second distinct package
    res2 = client.post("/api/v1/editorial/package/create", json={
        "event_title": "City Hall Press Briefing - Take 2",
        "incident_type": "Politics & Civic"
    })
    assert res2.status_code == 200
    pkg2 = res2.json()
    evt2_id = pkg2["event_id"]
    assert evt2_id != evt1_id

    # 4. Attempting to rename Package 2 to Package 1's title must be rejected with 400
    res_rename_conflict = client.post("/api/v1/editorial/package/update", json={
        "event_id": evt2_id,
        "event_title": "City Hall Press Briefing"
    })
    assert res_rename_conflict.status_code == 400
    assert "already titled" in res_rename_conflict.json()["detail"]

    # Clean up test packages from PACKAGE_STORE
    PACKAGE_STORE.pop(evt1_id, None)
    PACKAGE_STORE.pop(evt2_id, None)


def test_package_assign_inherits_package_beat():
    """
    Verifies that when a media file with General Wire or any news beat is assigned
    or batch-assigned to a package (e.g. Transit & Infrastructure), its news beat
    is properly overridden and synchronized to match the target package's beat.
    """
    from app.services.intake_service import WIRE_STORE, PACKAGE_STORE
    from app.models.schemas import MediaAssetResponse, ModerationResult, TelemetryData
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    now = datetime.datetime.now(datetime.UTC).isoformat()

    # 1. Create a Transit package with no assets in it
    res_pkg = client.post("/api/v1/editorial/package/create", json={
        "event_title": "Subway Derailment",
        "incident_type": "transit"
    })
    assert res_pkg.status_code == 200
    pkg_data = res_pkg.json()
    evt_id = pkg_data["event_id"]
    assert pkg_data["incident_type"] == "transit"

    # 2. Create a media file with General Wire / uncategorized beat
    subway_shot_id = "presswire/subway_shot_1"
    WIRE_STORE[subway_shot_id] = MediaAssetResponse(
        public_id=subway_shot_id,
        format="png",
        resource_type="image",
        width=1920,
        height=1080,
        bytes=100000,
        secure_url="https://res.cloudinary.com/demo/image/upload/subway.png",
        telemetry=TelemetryData(has_gps=False),
        moderation=ModerationResult(),
        headline="Screenshot (1)",
        incident_type="uncategorized",
        event_id=None,
        event_title=None,
        created_at=now
    )

    # 3. Assign the General Wire asset to the Transit package
    res_assign = client.post("/api/v1/editorial/package/assign", json={
        "public_id": subway_shot_id,
        "event_id": evt_id,
        "event_title": "Subway Derailment"
    })
    assert res_assign.status_code == 200
    assigned_data = res_assign.json()
    assert assigned_data["event_id"] == evt_id
    assert assigned_data["event_title"] == "Subway Derailment"
    # Beat must be overridden to the target package's beat ('transit')!
    assert assigned_data["incident_type"] == "transit"
    assert WIRE_STORE[subway_shot_id].incident_type == "transit"

    # 4. Create another asset and test batch assignment
    batch_shot_id = "presswire/subway_shot_2"
    WIRE_STORE[batch_shot_id] = MediaAssetResponse(
        public_id=batch_shot_id,
        format="png",
        resource_type="image",
        width=1920,
        height=1080,
        bytes=100000,
        secure_url="https://res.cloudinary.com/demo/image/upload/subway2.png",
        telemetry=TelemetryData(has_gps=False),
        moderation=ModerationResult(),
        headline="Subway Platform Video",
        incident_type="general_wire",
        event_id=None,
        event_title=None,
        created_at=now
    )

    res_batch = client.post("/api/v1/editorial/package/batch-assign", json={
        "public_ids": [batch_shot_id],
        "event_id": evt_id,
        "event_title": "Subway Derailment"
    })
    assert res_batch.status_code == 200
    assert WIRE_STORE[batch_shot_id].incident_type == "transit"
    assert WIRE_STORE[batch_shot_id].event_id == evt_id

    # Clean up test data
    PACKAGE_STORE.pop(evt_id, None)
    WIRE_STORE.pop(subway_shot_id, None)
    WIRE_STORE.pop(batch_shot_id, None)


def test_resolve_map_url():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    # 1. Test fast-path @lat,lng in URL
    res = client.post("/api/v1/editorial/resolve-map", json={
        "url": "https://www.google.com/maps/place/City+Hall/@37.7792,-122.4191,17z"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert abs(data["lat"] - 37.7792) < 0.0001
    assert abs(data["lng"] - (-122.4191)) < 0.0001

    # 2. Test query parameter ?q=lat,lng
    res2 = client.post("/api/v1/editorial/resolve-map", json={
        "url": "https://maps.google.com/?q=40.7128,-74.0060"
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert abs(data2["lat"] - 40.7128) < 0.0001
    assert abs(data2["lng"] - (-74.0060)) < 0.0001

    # 3. Test raw coordinates
    res3 = client.post("/api/v1/editorial/resolve-map", json={
        "url": "34.0522, -118.2437"
    })
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["success"] is True
    assert abs(data3["lat"] - 34.0522) < 0.0001

    # 4. Test invalid input
    res4 = client.post("/api/v1/editorial/resolve-map", json={
        "url": "invalid_string_not_a_url"
    })
    assert res4.status_code == 200
    assert res4.json()["success"] is False



