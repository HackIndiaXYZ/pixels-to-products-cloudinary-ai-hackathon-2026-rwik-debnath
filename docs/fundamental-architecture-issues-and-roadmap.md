# PressWire: Fundamental Architecture Issues & Engineering Roadmap

This document outlines the core architectural bottlenecks, data durability liabilities, and operational scaling hurdles identified in PressWire, along with concrete technical resolution paths.

---

## 📊 Core Issues Summary & Severity Matrix

| Issue ID | Architectural Area | Problem Description | Severity | Target Resolution |
| :--- | :--- | :--- | :---: | :--- |
| **PW-01** | **Data Durability & Sync** | Ephemeral In-Memory `WIRE_STORE` causes total data loss on restart and desync across multiple ASGI workers. | 🚨 **Critical** | State-of-the-art async persistence layer (SQLAlchemy 2.0 + SQLite WAL / PostgreSQL + JSONB). |
| **PW-02** | **Graphics & Syndication** | Generic burned-in lower-thirds are rejected by broadcast TV control rooms; clean feed vs. packaged social feeds are conflated. | ⚠️ **High** | Dual-Delivery Architecture: Clean Broadcast Master (with sidecar IPTC/JSON) + Branded Social/Digital Derivatives via Cloudinary template overlays. |
| **PW-03** | **Real-Time Latency** | 10-second polling cycle (`setInterval`) causes ingest lag, missed breaking footage, and state overwrite jitter. | ⚠️ **High** | Server-Sent Events (SSE) / WebSocket pub-sub stream for instant zero-latency wire updates. |
| **PW-04** | **Multi-Editor Concurrency** | Zero conflict resolution or optimistic locking; simultaneous editor saves cause silent overwrites. | ⚠️ **High** | Optimistic concurrency control via `version_id` / `ETag` headers and field-level patch updates. |
| **PW-05** | **Cloud Bandwidth Egress** | Direct Cloudinary origin links shared in syndication expose platform accounts to runaway bandwidth billing. | ⚠️ **High** | 1-Click Master Downloads, expiring signed URLs, and CDN Origin Shielding. |
| **PW-06** | **Spatial Clustering Edge Cases**| Fixed Haversine radius from anchor 0 fails on moving incidents (wildfires, chases) and adjacent distinct events. | 🟡 **Medium** | Moving centroid / convex hull spatiotemporal clustering with manual cluster perimeter isolation. |
| **PW-07** | **Video Redaction UX** | Canvas lacks frame-by-frame temporal scrub preview for dynamic video face tracking (`e_pixelate_faces`). | 🟡 **Medium** | Interactive video timeline scrubber with synchronized Cloudinary keyframe preview markers. |

---

## 🔍 Detailed Analysis of Fundamental Issues

---

### Issue PW-01: Ephemeral In-Memory State (`WIRE_STORE`)

#### 1. The Root Cause
Currently, the live queue, editorial metadata, spatiotemporal package assignments, cluster radiuses, manual geotags, copyright waiver logs, and archive states reside exclusively in a single Python in-memory dictionary:
```python
# backend/app/services/intake_service.py
WIRE_STORE: Dict[str, MediaAssetResponse] = {}
```

#### 2. The Failure Modes
1. **Zero Data Durability**: Any server reload (`uvicorn --reload`), process crash, or container redeployment wipes all custom headlines, face exemption matrices, and active story clusters, resetting the state back to hardcoded mock data.
2. **Multi-Worker Desynchronization**: In any production deployment running multiple worker processes (e.g. `uvicorn --workers 4` or Gunicorn behind NGINX), each worker maintains an isolated `WIRE_STORE`. A request assigning an asset to a package on Worker 1 is invisible when the client polls Worker 2.
3. **Legal Compliance Liability**: Under Title 17 U.S.C. § 504, broadcasting user media requires proof of rights grant. Erasing the audit log (`waiver_signed`, `submitter_ip`, `waiver_timestamp`) on server restart forfeits statutory legal protection.

#### 3. Resolution Plan
- Replace `WIRE_STORE` with an enterprise-grade async persistence layer:
  - **Local / Agile**: Embedded **SQLite** in **WAL (Write-Ahead Logging)** mode via `aiosqlite` + **SQLAlchemy 2.0 (async)** or **SQLModel**.
  - **Production / Enterprise**: **PostgreSQL** with native `JSONB` (for dynamic EXIF telemetry, waiver logs, and face coordinate matrices) and spatial indexing (`PostGIS`).
  - Seamless migration path: Repository pattern abstracting queries so SQLite is zero-setup locally, and PostgreSQL is 1-click on cloud.

---

### Issue PW-02: Broadcast Graphics Branding vs. Clean Master Dual-Delivery

#### 1. The Root Cause
Linear television networks and local affiliates operate multi-million dollar graphics engines (Vizrt, Chyron, Ross Xpression). They strictly reject burned-in generic lower-third banners with standard Arial fonts because they violate brand guidelines and collide with live control room graphics.

#### 2. The Resolution Architecture
Implement **Dual-Delivery Packaging**:
1. **Clean Broadcast Master (`broadcast_16_9_clean`)**:
   - `c_fill,ar_16:9,g_auto:subject` + selective face redaction.
   - **Zero burned-in text or graphics.**
   - Companion sidecar JSON metadata (`headline`, `byline`, `location`, `timestamp`) ready for the station's Character Generator.
2. **Packaged Digital Deliverable (`social_9_16` / `web_16_9`)**:
   - For web CMS, YouTube, Instagram Reels, and TikTok where immediate burned-in context is essential.
   - Cloudinary custom transparent template overlays (`l_templates:<station_id>_strap,g_south,y_0`) and custom corporate font uploads (`l_text:<font_name>:<headline>`).

---

### Issue PW-03: Polling Latency vs. Real-Time Push (SSE / WebSockets)

#### 1. The Root Cause
The editorial console (`/desk`) currently relies on a 10-second `setInterval` HTTP polling loop:
```tsx
const interval = setInterval(() => fetchQueue(), 10000);
```

#### 2. The Failure Modes
- **Breaking News Delay**: Field reporters uploading urgent footage remain unseen by desk editors for up to 10 seconds.
- **State Overwrite & Canvas Jitter**: Periodic poll cycles replace the entire asset array, risking UI desync or interrupted drag interactions while editors are active.

#### 3. Resolution Plan
- Add a lightweight **Server-Sent Events (SSE)** endpoint (`GET /api/v1/editorial/events/stream`) in FastAPI.
- Broadcast atomic events:
  - `asset:ingested`
  - `asset:updated` (headline, redaction, geotag)
  - `package:clustered` / `package:reassigned`
  - `asset:archived` / `asset:deleted`
- Update the frontend to consume the SSE stream with automatic reconnection and fallback polling.

---

### Issue PW-04: Multi-Editor Concurrency & Overwrite Collisions

#### 1. The Root Cause
There is no locking or conflict detection. If Editor A edits the headline of an asset while Editor B exempts a bystander face on the same asset, whichever editor clicks save last overwrites the other editor's changes.

#### 2. Resolution Plan
- **Optimistic Concurrency Control**: Add an integer `version` or ISO timestamp `updated_at` to each asset.
- Update requests pass `If-Match: "<version>"` or `version: int`.
- If the incoming version is stale, the backend returns `409 Conflict` with the latest asset state, prompting the editor to merge.

---

### Issue PW-05: Cloud Bandwidth Egress Risk & Public CDN Origin Shielding

#### 1. The Root Cause
Copying raw `res.cloudinary.com` URLs directly into syndication feeds exposes the platform owner to viral bandwidth spikes if embedded on high-traffic public news sites.

#### 2. Resolution Plan
- Prioritize **1-Click Master Downloads** (`.mp4` / `.jpg` master bundles) so stations host files on their own infrastructure.
- For direct delivery, generate **signed expiring Cloudinary URLs** (`sign_url: True`, with configurable expiration TTL).

---

### Issue PW-06: Spatiotemporal Proximity & Trajectory Drift

#### 1. The Root Cause
Clustering uses a fixed Haversine distance from the initial asset's GPS coordinates:
```python
dist_km = cls._haversine_km(lat, lon, a_lat, a_lon)
```
If an incident moves (e.g., severe weather front, highway pursuit), subsequent legitimate media beyond the initial perimeter is rejected. Conversely, distinct events within 500 meters are erroneously clustered together.

#### 2. Resolution Plan
- Dynamic centroid calculation: update the package's spatial center as new verified assets are added.
- Allow editors to manually bind and lock perimeters directly in the `PackageInspector`.

---

### Issue PW-07: Video Face Tracking Scrubber & Timeline Preview

#### 1. The Root Cause
Cloudinary performs temporal face tracking across the video duration using `e_pixelate_faces`, but the editorial canvas currently shows only a static poster image and a global toggle.

#### 2. Resolution Plan
- Embed a native HTML5 video player with an interactive timeline scrubber.
- Display visual keyframe markers indicating where faces are detected and redacted throughout the video.

---

## 🛠️ Execution Strategy: Phase 1 Deep-Dive

**Phase 1 Goal**: Eliminate **PW-01 (Ephemeral In-Memory State)** with a state-of-the-art async persistence engine.
