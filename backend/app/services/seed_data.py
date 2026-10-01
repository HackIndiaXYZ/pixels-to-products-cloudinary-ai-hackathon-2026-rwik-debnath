import asyncio
import datetime
from app.services.intake_service import WIRE_STORE
from app.models.schemas import MediaAssetResponse, FaceCoordinate, TelemetryData, ModerationResult
from app.services.packaging_service import PackagingService

async def seed_initial_assets():
    """Seeds realistic breaking news demo assets into WIRE_STORE if empty."""
    if WIRE_STORE:
        return

    now = datetime.datetime.utcnow()

    # Asset 1: Mayoral Press Briefing (Photo of Obama with officials and bystanders)
    # Calibrated coordinates on 1200x800 resolution:
    # Obama (Main figure smiling with telephone): x: 620, y: 370, w: 180, h: 220
    # Official in foreground left (glasses, smiling): x: 400, y: 480, w: 150, h: 180
    # Official in foreground middle (glasses, mustache): x: 500, y: 430, w: 140, h: 170
    # Bystander standing behind left: x: 670, y: 325, w: 110, h: 140
    # Bystander standing behind right (female): x: 740, y: 320, w: 110, h: 140
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
        secure_url="https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
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
        secure_url="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
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
        secure_url="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
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
        secure_url="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
        faces=[],
        telemetry=TelemetryData(
            make="Samsung",
            model="Galaxy S24 Ultra",
            software="Android 14",
            capture_time=(now - datetime.timedelta(hours=3, minutes=15)).strftime("%Y:%m:%d %H:%M:%S"),
            upload_time=now.isoformat(),
            time_delta_seconds=11700, # 3h 15m > 2h threshold
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
        created_at=(now - datetime.timedelta(minutes=1)).isoformat()
    )

    # Asset 5: Breaking Video Ingest (Mobile Footage with Video Highlight & Tracking)
    asset_5_id = "presswire/sample_transit_video"
    urls_5 = PackagingService.generate_broadcast_urls(
        public_id=asset_5_id,
        headline="Transit Alert: Multi-Vehicle Collision on I-80",
        subheadline="Traffic Bureau Live Feed",
        pixelate_bystanders=True,
        resource_type="video"
    )
    asset_5 = MediaAssetResponse(
        public_id=asset_5_id,
        asset_id="asset_demo_05",
        format="mp4",
        resource_type="video",
        width=1920,
        height=1080,
        bytes=4850200,
        secure_url="https://res.cloudinary.com/demo/video/upload/dog.mp4",
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
        created_at=(now - datetime.timedelta(minutes=4)).isoformat()
    )

    WIRE_STORE[asset_1.public_id] = asset_1
    WIRE_STORE[asset_2.public_id] = asset_2
    WIRE_STORE[asset_3.public_id] = asset_3
    WIRE_STORE[asset_4.public_id] = asset_4
    WIRE_STORE[asset_5.public_id] = asset_5
