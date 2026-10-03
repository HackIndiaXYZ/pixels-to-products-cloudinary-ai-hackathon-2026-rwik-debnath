import pytest
import asyncio
from app.db.session import init_db, async_session_factory
from app.db.persistence import PersistentAssetStore, PersistentPackageStore
from app.models.schemas import (
    MediaAssetResponse,
    StoryPackageResponse,
    FaceCoordinate,
    TelemetryData,
    ModerationResult
)
from app.repositories.asset_repository import AssetRepository
from app.repositories.package_repository import PackageRepository

@pytest.mark.asyncio
async def test_sqlite_persistence_lifecycle():
    """Verifies that assets and packages persist to SQLite and survive store re-instantiation."""
    await init_db()

    asset_store = PersistentAssetStore()
    package_store = PersistentPackageStore()

    test_pid = "presswire/test_persistence_asset_99"
    test_evt = "evt_test_persistence_event_99"

    # 1. Create asset with rich nested fields (manual redaction mask, EXIF telemetry)
    test_asset = MediaAssetResponse(
        public_id=test_pid,
        format="jpg",
        resource_type="image",
        width=1920,
        height=1080,
        bytes=102400,
        secure_url=f"https://res.cloudinary.com/presswire/{test_pid}.jpg",
        faces=[
            FaceCoordinate(
                id="manual_101",
                x=50,
                y=100,
                w=200,
                h=150,
                is_redacted=True,
                label="Redaction #1",
                kind="manual"
            )
        ],
        telemetry=TelemetryData(
            make="Sony",
            model="A7R5",
            has_gps=True,
            gps_latitude=37.7749,
            gps_longitude=-122.4194
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="approved",
        incident_type="Public Safety",
        urgency="breaking",
        headline="Persistence Verification Breaking Wire",
        created_at="2026-10-03T05:00:00Z"
    )

    test_pkg = StoryPackageResponse(
        event_id=test_evt,
        event_title="Persistence Verification Package",
        incident_type="Public Safety",
        cluster_radius_km=2.5,
        package_status="active",
        lat=37.7749,
        lng=-122.4194,
        created_at="2026-10-03T05:00:00Z"
    )

    # 2. Store via standard dictionary syntax
    asset_store[test_pid] = test_asset
    package_store[test_evt] = test_pkg

    assert test_pid in asset_store
    assert test_evt in package_store

    # 3. Simulate Server Process Restart by creating new unpopulated store instances
    fresh_asset_store = PersistentAssetStore()
    fresh_pkg_store = PersistentPackageStore()

    # Before load_from_db, fresh stores are empty
    assert test_pid not in fresh_asset_store
    assert test_evt not in fresh_pkg_store

    # Load from SQLite database
    await fresh_asset_store.load_from_db()
    await fresh_pkg_store.load_from_db()

    # 4. Verify persisted state resurrected completely
    assert test_pid in fresh_asset_store
    resurrected_asset = fresh_asset_store[test_pid]
    assert resurrected_asset.headline == "Persistence Verification Breaking Wire"
    assert len(resurrected_asset.faces) == 1
    assert resurrected_asset.faces[0].kind == "manual"
    assert resurrected_asset.faces[0].label == "Redaction #1"
    assert resurrected_asset.telemetry.make == "Sony"
    assert resurrected_asset.telemetry.gps_latitude == 37.7749

    assert test_evt in fresh_pkg_store
    resurrected_pkg = fresh_pkg_store[test_evt]
    assert resurrected_pkg.event_title == "Persistence Verification Package"
    assert resurrected_pkg.cluster_radius_km == 2.5

    # 5. Clean up
    del asset_store[test_pid]
    del package_store[test_evt]

    assert test_pid not in asset_store
    assert test_evt not in package_store

    verify_clean_store = PersistentAssetStore()
    await verify_clean_store.load_from_db()
    assert test_pid not in verify_clean_store
