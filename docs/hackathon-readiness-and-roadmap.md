# PressWire: Hackathon Readiness, Missing Items & Engineering Roadmap

This document serves as the comprehensive tactical checklist, gap analysis, and strategic roadmap for winning the **Cloudinary Hackathon** and scaling PressWire from a winning prototype to an enterprise-grade broadcast media ingestion platform.

---

## 🏆 Part 1: Win Strategy & Gap Analysis (The Missing Items)

PressWire’s core engineering, UI architecture, and Cloudinary primitive depth are in the **top 1%** of submissions. It is not another generic AI wrapper; it solves a concrete, multi-million dollar operational dilemma for breaking news broadcasters.

However, judges review dozens of projects in high-speed triage sessions. They do not run `npm install` or configure local Python virtualenvs. **The difference between a participant and a winner is friction.**

Below are the 5 critical items required before submission:

---

### Item 1: Live Public Deployment (Priority 0 — Critical Blocker)
* **The Problem**: 90% of judges evaluate projects purely via browser links and screen recordings. A localhost-only project is penalized heavily or skipped.
* **Architecture Strategy**:
  - **Frontend (Vercel / Cloudflare Pages)**:
    - Deploy `frontend/` as a Vite Single Page Application.
    - Set `VITE_API_URL` to point to the backend domain.
    - Automatic SSL, global edge CDN caching for static assets.
  - **Backend (Render / Railway / Fly.io)**:
    - Deploy `backend/` using Docker or native Python runtime (`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
    - Configure production environment variables: `CLOUDINARY_URL`, `SQLITE_DB_PATH=/data/presswire.db`, and CORS origins allowing the Vercel frontend.
    - Attach a persistent disk volume to `/data` so SQLite database and seed state persist across container sleep/restart cycles.
  - **Verification Checklist**:
    - [ ] Public HTTPS URL for desk: `https://<your-app>.vercel.app/desk`
    - [ ] Public HTTPS URL for citizen submit: `https://<your-app>.vercel.app/submit`
    - [ ] Live SSE stream (`/api/v1/editorial/stream`) works over HTTPS without proxy buffering.
    - [ ] SQLite database maintains state across server sleep cycles.

---

### Item 2: 1-Click Judge Demo Media Pack on `/submit` (Priority 0)
* **The Problem**: If a judge visits `/submit` to test the intake flow, they will not have a breaking news photo with EXIF metadata, GPS coordinates, and multiple human faces on their phone or laptop.
* **The Solution**:
  - Add a **"Load Sample Breaking Incident Media"** button directly on `/submit`.
  - Clicking this button auto-loads a pre-calibrated test photo (e.g., a press briefing with public officials and bystanders) with embedded EXIF telemetry and GPS coordinates.
  - The judge simply signs the copyright waiver, clicks submit, and watches it hit `/desk` in real time via Server-Sent Events.
  - Provide a `/demo_assets` directory in the repository containing 3 downloadable test files:
    1. `sample_press_briefing.jpg` (Multiple faces, EXIF timestamp, GPS tagged).
    2. `sample_traffic_incident.jpg` (Bystanders, unverified hardware).
    3. `sample_quarantine_graphic.jpg` (Triggers Cloudinary moderation gate to showcase safety quarantine).

---

### Item 3: Documentation & Devpost Submission Copy Sync (Priority 1)
* **The Problem**: Earlier documentation and comments referenced burned-in lower-third banner overlays (`l_text`), which have been intentionally upgraded to a broadcast-grade **Clean MCR Master + Corner Station Bug + IPTC Sidecar JSON**. Any contradiction in the submission text confuses technical judges.
* **Action Required**:
  - Update `README.md` and Devpost project description to highlight:
    1. **Clean Control Room Master (`broadcast_16_9_clean`)**: Zero burned-in text for television master control rooms and Vizrt/Chyron automation.
    2. **Station Bug Overlay (`broadcast_16_9_branded`)**: Dynamic logo watermark placement via Cloudinary relative overlay primitives (`l_<public_id>,g_north_east...`).
    3. **Machine-Readable Sidecar JSON (`/sidecar`)**: IPTC-compliant metadata payload for automated character generation.
    4. **Zero-Duplicate Storage Packaging**: How 16:9 linear TV, 9:16 vertical reels, 1:1 index cards, and pristine masters originate from a single Cloudinary origin asset.

---

### Item 4: The 3-Minute Demo Video (Priority 0 — The Deciding Factor)
Judges score projects largely based on the video demonstration. The video must not be a wandering feature tour; it must follow a tight, authoritative broadcast news narrative:

| Timestamp | Segment | Visual & Script Narrative |
| :--- | :--- | :--- |
| **0:00 - 0:30** | **The Hook & High-Dollar Problem** | *"When breaking news happens, hundreds of citizen uploads hit newsrooms. Broadcasters face a 20-minute manual delay: legal privacy redactions, unverified provenance, and rendering different aspect ratios across linear TV and social reels. Cloud egress bills and privacy lawsuits cost millions."* |
| **0:30 - 0:55** | **The Cloudinary Autonomous Engine** | *"PressWire eliminates this bottleneck using Cloudinary's native processing primitives. Zero local re-encoding, zero duplicate storage, instant edge transformations."* |
| **0:55 - 1:30** | **Live Citizen Intake (`/submit`)** | 1. Open mobile intake portal.<br>2. Sign mandatory 1-click irrevocable broadcast copyright waiver.<br>3. Submit breaking footage.<br>4. Highlight automated Cloudinary Upload API extracting hardware EXIF, GPS telemetry, and AI safety moderation in under 2 seconds. |
| **1:30 - 2:15** | **The Editorial Desk (`/desk`) & Selective Face Triage** | 1. Asset arrives instantly on `/desk` via Server-Sent Events.<br>2. Inspect EXIF forensics ($\Delta t$ capture vs upload delta).<br>3. Open **Selective Face Redaction Canvas**: click to redact bystanders (red) while keeping elected officials exempt (green).<br>4. Open raw Cloudinary CDN URL in a new browser tab to prove the **Explicit API** (`face_coordinates`) and `e_pixelate_faces` run dynamically on the edge without saving copies. |
| **2:15 - 2:45** | **Broadcast Playout & Syndication** | 1. 1-Click **Download Clean Master** with `fl_attachment` header (protecting platform origin bandwidth).<br>2. Show corner station watermark logo bug injection.<br>3. Copy IPTC Broadcast Sidecar JSON.<br>4. Show multi-platform 9:16 vertical reel (`b_auto:predominant`) and 1:1 index card. |
| **2:45 - 3:00** | **The Pitch Closer** | *"From citizen smartphone to live broadcast playout in 15 seconds. PressWire: Autonomous Newsroom Ingestion, Powered by Cloudinary."* |

---

### Item 5: Cloudinary Account Credit Pre-Flight
* Ensure your Cloudinary account has adequate transformation credits active so multiple judges testing concurrent transformations do not trigger HTTP 420 rate limits or broken image place-holders.

---

## 🗺️ Part 2: Product & Engineering Roadmap

### Phase 1: Hackathon Polish & Final Release (Current Sprint)
- [x] **Zero-Duplicate Storage Packaging**: Deterministic URL chaining for 16:9, 9:16, 1:1, and clean master.
- [x] **Selective Privacy Triage Canvas**: Interactive facial bounding box coordinate toggle with Cloudinary Explicit API override.
- [x] **Real-Time Desk Synchronization**: Sub-200ms Server-Sent Events (`WireBroadcaster` / `/stream`) replacing polling loops.
- [x] **Data Durability & SQLite WAL**: Persistent SQLite store surviving process restarts.
- [x] **Station Logo Bug & Clean Master Playout**: Unified single playout feed, custom bug entry/upload, and IPTC sidecar JSON.
- [x] **Minimalist Visual Polish**: Neutral grey callout badge dots (`w-1 h-1`), transparent bounding boxes, zero tick-mark icons.
- [ ] **Live Hosted Deployment**: Frontend deployed on Vercel; Backend deployed on Railway/Render.
- [ ] **1-Click Demo Media Pack**: Integrated sample photo loader on `/submit` for judges.
- [ ] **Demo Video Recording**: 3-minute pitch video following the storyboard above.
- [ ] **Brand Landing Page Final Assets**: Polished hero screenshots and feature diagrams.

---

### Phase 2: Post-Hackathon Enterprise Hardening (Q2)
1. **Cloudinary BYOC (Bring Your Own Cloud) Architecture**:
   - Broadcasters configure their own Cloudinary sub-accounts and AWS S3/Google Cloud Storage buckets.
   - Media assets remain within the enterprise customer’s sovereign cloud boundary.
2. **PostgreSQL + PostGIS Migration**:
   - Transition embedded SQLite WAL store to high-concurrency PostgreSQL.
   - Utilize PostGIS for spatial queries across multi-point emergency incidents (wildfires, hurricane paths, active police perimeters).
3. **Enterprise MOS Protocol Bridge**:
   - Integrate native Media Object Server (MOS) protocol support, allowing PressWire packages to ingest directly into newsroom computer systems (NRCS) like **Avid iNEWS**, **AP ENPS**, and **Dalet Galaxy**.
4. **C2PA Cryptographic Provenance Verification**:
   - Cryptographically verify Content Authenticity Initiative (C2PA) hardware manifests embedded by Leica, Nikon, and Sony mirrorless cameras to guarantee unmanipulated chain of custody.

---

### Phase 3: AI-Driven Broadcast Automation (Q3 - Q4)
1. **Cloudinary AI Video Highlights**:
   - Autonomous 6-second broadcast teaser clips using dynamic `e_preview:duration_6:max_seg_3`.
   - Automatic scene-change detection for live field feeds.
2. **Automated Bystander Blur for Moving Video**:
   - Edge tracking and dynamic pixelation across moving citizen video streams (`e_pixelate_faces` video model).
3. **Multi-Station Syndication Hub**:
   - National network syndication desk allowing a central network desk to push cleared footage down to local regional broadcast affiliates with localized affiliate station bugs.

---

## 🎯 Part 3: Cloudinary Hackathon Rubric Score Matrix

| Rubric Criterion | Weight | How PressWire Maximizes Points |
| :--- | :---: | :--- |
| **API Depth & Variety** | **30%** | Leverages 6+ distinct Cloudinary primitives: Upload API (`faces`, `image_metadata`), Explicit API (`face_coordinates` override), Dynamic Transformations (`c_fill,ar_16:9,g_auto:subject`, `b_auto:predominant`, `f_auto,q_auto`), Edge Privacy (`e_pixelate_faces`), Attachment Header (`fl_attachment`), and Lucene Search API. |
| **Technical Innovation** | **25%** | Replaces destructive server-side image processing with deterministic URL metadata manipulation. Solves selective privacy (redacting bystanders while leaving public officials unblurred) using zero local storage. |
| **Real-World Business Impact** | **25%** | Addresses the $20M+ broadcast problem: 20-minute manual blurring bottlenecks, legal copyright exposure, and cloud bandwidth bills on breaking news. |
| **Design, UX & Polish** | **20%** | Full-bleed edge-to-edge broadcast workspace (`w-full`), sub-200ms real-time SSE updates, keyboard shortcuts, clean typographic hierarchy, and zero visual clutter. |
