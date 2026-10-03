import asyncio
import datetime
import logging
import cloudinary
from app.core.config import settings
from app.core.cloudinary_client import init_cloudinary
from app.services.intake_service import WIRE_STORE, PACKAGE_STORE
from app.models.schemas import MediaAssetResponse, FaceCoordinate, TelemetryData, ModerationResult
from app.services.packaging_service import PackagingService

init_cloudinary()

CANONICAL_DEMO_SEEDS = [
    (
        "presswire/sample_press_conference",
        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
        [[400, 480, 150, 180], [500, 430, 140, 170], [670, 325, 110, 140], [740, 320, 110, 140]]
    ),
    (
        "presswire/sample_protest_rally",
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
        [[340, 220, 160, 170], [720, 240, 150, 160]]
    ),
    (
        "presswire/sample_wildfire",
        "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
        []
    ),
    (
        "presswire/sample_citizen_tip",
        "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
        []
    ),
    (
        "presswire/sample_transit_incident",
        "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
        []
    ),
    (
        "presswire/sample_protest_rally_alt",
        "https://images.unsplash.com/photo-1526976668912-1a811878dd37?auto=format&fit=crop&w=1200&q=80",
        [[480, 260, 170, 180]]
    ),
]

async def ensure_demo_assets_uploaded():
    """Uploads the canonical demo assets to Cloudinary if they don't exist yet."""
    if not (settings.CLOUDINARY_API_KEY or settings.CLOUDINARY_URL):
        return
    import cloudinary.uploader
    from app.services.redaction_service import RedactionService

    for pid, remote_url, faces in CANONICAL_DEMO_SEEDS:
        try:
            cloudinary.uploader.upload(remote_url, public_id=pid, overwrite=False)
            if faces:
                RedactionService.update_selective_faces(pid, faces)
        except Exception as e:
            logging.warning(f"[SeedData] Cloudinary upload check for {pid}: {e}")

async def seed_initial_assets():
    """Seeds realistic breaking news demo assets into WIRE_STORE."""
    await ensure_demo_assets_uploaded()

    now = datetime.datetime.utcnow()
    cloud_name = cloudinary.config().cloud_name or settings.CLOUDINARY_CLOUD_NAME

    # Asset 1: Mayoral Press Briefing (Photo of Obama with officials and bystanders)
    asset_1_id = "presswire/sample_press_conference"
    urls_1 = PackagingService.generate_broadcast_urls(
        public_id=asset_1_id,
        headline="Press Briefing: Mayor Announces Transit Plan",
        subheadline="City Hall Rotunda",
        pixelate_bystanders=True
    )
    asset_1 = MediaAssetResponse(
        public_id=asset_1_id,
        asset_id="asset_demo_01",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=1420500,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_1_id}.jpg",
        faces=[
            FaceCoordinate(id="face_0", x=620, y=370, w=180, h=220, is_redacted=False, label="Elected Official (Mayor)"),
            FaceCoordinate(id="face_1", x=400, y=480, w=150, h=180, is_redacted=True, label="Civilian Bystander"),
            FaceCoordinate(id="face_2", x=500, y=430, w=140, h=170, is_redacted=True, label="Civilian Bystander"),
            FaceCoordinate(id="face_3", x=670, y=325, w=110, h=140, is_redacted=True, label="Civilian Bystander"),
            FaceCoordinate(id="face_4", x=740, y=320, w=110, h=140, is_redacted=True, label="Civilian Bystander")
        ],
        telemetry=TelemetryData(
            make="Sony",
            model="ILCE-7RM5",
            software="v1.20",
            capture_time=(now - datetime.timedelta(minutes=8)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=480,
            gps_latitude=37.7793,
            gps_longitude=-122.4192,
            gps_altitude=28.5,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=8)).isoformat(),
            submitter_ip="192.168.1.104"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="approved",
        incident_type="politics_civic",
        urgency="breaking",
        headline="Press Briefing: Mayor Announces Transit Plan",
        syndication_urls=urls_1,
        event_id="evt_city_hall_briefing",
        event_title="Mayor Announces Transit Plan",
        created_at=now.isoformat()
    )

    # Asset 2: Downtown Protest March (Requires Face Triage)
    asset_2_id = "presswire/sample_protest_rally"
    urls_2 = PackagingService.generate_broadcast_urls(
        public_id=asset_2_id,
        headline="Breaking: Crowds Gather for Climate Rally",
        subheadline="Market St Plaza",
        pixelate_bystanders=True
    )
    asset_2 = MediaAssetResponse(
        public_id=asset_2_id,
        asset_id="asset_demo_02",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=1840200,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_2_id}.jpg",
        faces=[
            FaceCoordinate(id="face_0", x=340, y=220, w=160, h=170, is_redacted=True, label="Civilian Demonstrator"),
            FaceCoordinate(id="face_1", x=720, y=240, w=150, h=160, is_redacted=True, label="Civilian Demonstrator")
        ],
        telemetry=TelemetryData(
            make="Apple",
            model="iPhone 15 Pro Max",
            software="iOS 17.5",
            capture_time=(now - datetime.timedelta(minutes=3)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=180,
            gps_latitude=37.7891,
            gps_longitude=-122.4014,
            gps_altitude=15.0,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=3)).isoformat(),
            submitter_ip="192.168.1.108"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="action_required",
        incident_type="protest",
        urgency="breaking",
        headline="Breaking: Crowds Gather for Climate Rally",
        syndication_urls=urls_2,
        event_id="evt_market_st_rally",
        event_title="Downtown Climate Demonstration",
        created_at=(now - datetime.timedelta(minutes=2)).isoformat()
    )

    # Asset 3: Wildfire Smoke Haze (No faces, landscape telemetry)
    asset_3_id = "presswire/sample_wildfire"
    urls_3 = PackagingService.generate_broadcast_urls(
        public_id=asset_3_id,
        headline="Urgent: Smoke Haze Reported over Ridgeway",
        subheadline="County Emergency Services",
        pixelate_bystanders=False
    )
    asset_3 = MediaAssetResponse(
        public_id=asset_3_id,
        asset_id="asset_demo_03",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=2104000,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_3_id}.jpg",
        faces=[],
        telemetry=TelemetryData(
            make="Canon",
            model="EOS R6",
            software="1.4.1",
            capture_time=(now - datetime.timedelta(minutes=22)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=1320,
            gps_latitude=37.8715,
            gps_longitude=-122.2730,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=22)).isoformat(),
            submitter_ip="192.168.1.112"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="approved",
        incident_type="wildfire",
        urgency="breaking",
        headline="Urgent: Smoke Haze Reported over Ridgeway",
        syndication_urls=urls_3,
        event_id="evt_ridgeway_wildfire",
        event_title="Ridgeway Smoke Haze Incident",
        created_at=(now - datetime.timedelta(minutes=5)).isoformat()
    )

    # Asset 4: Uncategorized Citizen Submission (Stale Footage Warning >2h test)
    asset_4_id = "presswire/sample_citizen_tip"
    urls_4 = PackagingService.generate_broadcast_urls(
        public_id=asset_4_id,
        headline="Citizen Tip: Commuter Congestion Near Bay Bridge",
        subheadline="Eyewitness Mobile Ingest",
        pixelate_bystanders=False
    )
    asset_4 = MediaAssetResponse(
        public_id=asset_4_id,
        asset_id="asset_demo_04",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=1650300,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_4_id}.jpg",
        faces=[],
        telemetry=TelemetryData(
            make="Samsung",
            model="Galaxy S24 Ultra",
            software="Android 14",
            capture_time=(now - datetime.timedelta(hours=3, minutes=15)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=11700,
            gps_latitude=37.7983,
            gps_longitude=-122.3778,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=15)).isoformat(),
            submitter_ip="192.168.1.115"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="action_required",
        incident_type="uncategorized",
        urgency="standard",
        headline="Citizen Tip: Commuter Congestion Near Bay Bridge",
        syndication_urls=urls_4,
        event_id="evt_bay_bridge_traffic",
        event_title="Bay Bridge Traffic Congestion",
        created_at=(now - datetime.timedelta(minutes=1)).isoformat()
    )

    # Asset 5: Breaking Transit Incident (High-Resolution Scene Photo)
    asset_5_id = "presswire/sample_transit_incident"
    urls_5 = PackagingService.generate_broadcast_urls(
        public_id=asset_5_id,
        headline="Transit Alert: Multi-Vehicle Collision on I-80",
        subheadline="Traffic Bureau Live Dispatch",
        pixelate_bystanders=False,
        resource_type="image"
    )
    asset_5 = MediaAssetResponse(
        public_id=asset_5_id,
        asset_id="asset_demo_05",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=2850200,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_5_id}.jpg",
        faces=[],
        telemetry=TelemetryData(
            make="Apple",
            model="iPhone 15 Pro",
            software="iOS 17.5",
            capture_time=(now - datetime.timedelta(minutes=4)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=240,
            gps_latitude=37.8270,
            gps_longitude=-122.2913,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=4)).isoformat(),
            submitter_ip="192.168.1.120"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="approved",
        incident_type="transit",
        urgency="breaking",
        headline="Transit Alert: Multi-Vehicle Collision on I-80",
        syndication_urls=urls_5,
        pixelate_bystanders=False,
        event_id="evt_i80_collision",
        event_title="I-80 Multi-Vehicle Collision",
        created_at=(now - datetime.timedelta(minutes=4)).isoformat()
    )

    # Asset 6: Downtown Protest March (Angle 2 from Citizen Eyewitness)
    asset_6_id = "presswire/sample_protest_rally_alt"
    urls_6 = PackagingService.generate_broadcast_urls(
        public_id=asset_6_id,
        headline="Eyewitness Take: Demonstrators Marching West on Market",
        subheadline="Market & 4th St",
        pixelate_bystanders=True
    )
    asset_6 = MediaAssetResponse(
        public_id=asset_6_id,
        asset_id="asset_demo_06",
        format="jpg",
        resource_type="image",
        width=1200,
        height=800,
        bytes=1620400,
        secure_url=f"https://res.cloudinary.com/{cloud_name}/image/upload/{asset_6_id}.jpg",
        faces=[
            FaceCoordinate(id="face_0", x=480, y=260, w=170, h=180, is_redacted=True, label="Civilian Demonstrator")
        ],
        telemetry=TelemetryData(
            make="Google",
            model="Pixel 8 Pro",
            software="Android 14",
            capture_time=(now - datetime.timedelta(minutes=5)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=300,
            gps_latitude=37.7893,
            gps_longitude=-122.4018,
            gps_altitude=16.0,
            has_gps=True,
            waiver_signed=True,
            waiver_timestamp=(now - datetime.timedelta(minutes=5)).isoformat(),
            submitter_ip="192.168.1.135"
        ),
        moderation=ModerationResult(status="approved", categories=[]),
        review_status="action_required",
        incident_type="protest",
        urgency="breaking",
        headline="Eyewitness Take: Demonstrators Marching West on Market",
        syndication_urls=urls_6,
        event_id="evt_market_st_rally",
        event_title="Downtown Climate Demonstration",
        created_at=(now - datetime.timedelta(minutes=3)).isoformat()
    )

    WIRE_STORE[asset_1.public_id] = asset_1
    WIRE_STORE[asset_2.public_id] = asset_2
    WIRE_STORE[asset_3.public_id] = asset_3
    WIRE_STORE[asset_4.public_id] = asset_4
    WIRE_STORE[asset_5.public_id] = asset_5
    WIRE_STORE[asset_6.public_id] = asset_6

async def check_and_refresh_seed_assets():
    """Refreshes seed assets in WIRE_STORE if their URLs point to outdated hosts."""
    cloud_name = cloudinary.config().cloud_name or settings.CLOUDINARY_CLOUD_NAME
    sample_ids = [
        "presswire/sample_press_conference",
        "presswire/sample_protest_rally",
        "presswire/sample_wildfire",
        "presswire/sample_citizen_tip",
        "presswire/sample_transit_incident",
        "presswire/sample_protest_rally_alt"
    ]
    needs_reseed = False
    for sid in sample_ids:
        if sid in WIRE_STORE:
            asset = WIRE_STORE[sid]
            # If secure_url is Unsplash or old cloud name, trigger refresh
            if "unsplash.com" in (asset.secure_url or "") or cloud_name not in (asset.secure_url or ""):
                needs_reseed = True
                break
    if needs_reseed:
        WIRE_STORE.clear()
        PACKAGE_STORE.clear()
        await seed_initial_assets()
