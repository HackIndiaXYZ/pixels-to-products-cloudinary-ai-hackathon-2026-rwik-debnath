# PressWire: Autonomous Newsroom Ingestion & Broadcast Packaging Pipeline

> **Cloudinary Hackathon Track**: **Track 1 · AI Media Pipelines (PS-01)**  
> **Core Pipeline**: Autonomous intake, AI content moderation, facial detection & selective privacy redaction, spatiotemporal clustering, and zero-storage dynamic multi-format broadcast delivery powered by Cloudinary's AI capabilities.  
> **Live Production App**: **[https://presswire-h306.onrender.com](https://presswire-h306.onrender.com)**  
> **Public GitHub Repository**: [https://github.com/SLICKRWIK/presswire](https://github.com/SLICKRWIK/presswire)

### 🌐 Live Production Links
- 🚀 **Live Landing Page**: [presswire-h306.onrender.com/](https://presswire-h306.onrender.com/)
- 📲 **Public Citizen Intake Portal**: [presswire-h306.onrender.com/submit](https://presswire-h306.onrender.com/submit)
- 🖥️ **Live Editorial Cockpit & Triage Desk**: [presswire-h306.onrender.com/desk](https://presswire-h306.onrender.com/desk)
- 📖 **Interactive OpenAPI / Swagger Docs**: [presswire-h306.onrender.com/docs](https://presswire-h306.onrender.com/docs)

---

## 🎯 The Problem

During breaking disasters, civic unrest, and major breaking events, newsrooms are flooded with hundreds of uncurated eyewitness photos and videos. News organizations face three critical operational bottlenecks:

1. **Content Moderation & Graphic Violence Liability**: Unscreened citizen footage often contains graphic injury, hate symbols, or inappropriate content that must be quarantined before reaching editors.
2. **Privacy, Bystander & PII Liability**: Strict broadcast regulations mandate blurring civilian bystanders, vehicle license plates, and citizen ID documents while keeping elected public figures, spokespeople, and journalists unblurred.
3. **Multi-Format Storage & Rendering Bloat**: Preparing the same origin media for 16:9 linear television, 9:16 vertical mobile stories (Shorts/Reels), 1:1 wire feed cards, and 6-second video highlight clips traditionally requires duplicate local render jobs, multiplying cloud storage and CDN bandwidth costs.

**PressWire solves this** by acting as an end-to-end autonomous AI media pipeline. Media enters through a secure intake portal, is automatically analyzed, moderated, and tagged by Cloudinary's AI primitives, undergoes selective privacy redaction, and delivers instant, broadcast-ready packages across every platform format with **zero duplicate storage**.

---

## 🌟 How Cloudinary AI Powers the Pipeline

PressWire is built from the ground up on Cloudinary's AI Media Pipeline capabilities:

```
[ Eyewitness Submission (/submit) ]
                 │
                 ▼
[ Cloudinary Upload API ]
  ├── AI Face Detection (`faces: true`)
  ├── AI Content Moderation (`moderation: "aws_rek"`)
  ├── EXIF Hardware & GPS Telemetry (`image_metadata: true`)
  └── Structured Newsroom Context (`context: {headline, urgency, incident_type, waiver}`)
                 │
                 ▼
[ Automated Newsroom Triage Gate ]
  ├── Graphic / Sensitive Content ──► Automated Quarantine Shield
  ├── Bystanders Detected ──────────► Editorial Privacy Triage (/desk)
  └── Clean Breaking Wire ──────────► Approved Wire Pool
                 │
                 ▼
[ Selective Face Redaction Engine ]
  └── Cloudinary Explicit API (`face_coordinates=[...]`)
      └── Bystander / PII boxes preserved for redaction; public figures exempted
                 │
                 ▼
[ Zero-Storage Dynamic Packaging Engine ]
  ├── 16:9 Clean Linear Master ────► `c_fill,ar_16:9,g_auto:subject,e_pixelate_faces:10,f_auto,q_auto`
  ├── 9:16 Vertical Reel ─────────► `c_fill,ar_9:16,g_auto:subject,b_auto:predominant,e_pixelate_faces:10,f_auto,q_auto`
  ├── 1:1 Wire Micro-Card ────────► `c_fill,ar_1:1,g_auto:subject,e_pixelate_faces:10,f_auto,q_auto`
  └── 6-Second Autonomous Preview ─► `e_preview:duration_6:max_seg_3`
```

---

## 🚀 Key Features & Pipeline Modules

### 1. Citizen & Field Wire Intake (`/submit`)
- Zero-friction mobile-optimized upload portal for eyewitnesses and field stringers.
- Mandatory 1-click **Irrevocable Broadcast Copyright License** before ingestion, protecting broadcast syndication networks from copyright claims.
- Cloudinary Upload API processes high-resolution imagery with `image_metadata: true`, extracting camera make, model, lens, capture timestamp, and sensor GPS coordinates.
- Computes capture-to-upload timestamp latency ($\Delta t$) to flag stale or recycled archive imagery.

### 2. Autonomous AI Moderation & Quarantine Routing
- Cloudinary automated moderation evaluates incoming media against sensitive content categories.
- Assets violating safety thresholds are automatically isolated into the `quarantined` state with a frosted safety shield, protecting editorial staff from unsolicited graphic content until explicitly audited.

### 3. Editorial Cockpit & Live Wire Desk (`/desk`)
- Edge-to-edge full-bleed broadcast control workspace (`w-full`) engineered for multi-monitor newsroom cockpits.
- Real-time Server-Sent Events (SSE) stream delivering incoming wire dispatches instantly (<500ms).
- Fixed newsroom classification across **6 standardized news desks**:
  - `Public Safety`
  - `Severe Weather`
  - `Politics & Civic`
  - `Transit & Infrastructure`
  - `Metro & Local`
  - `General Wire`
- Spatiotemporal Geo-Anchor Engine clusters multi-angle takes into story packages using GPS coordinates and an editable perimeter radius (`cluster_radius_km`). Includes an automated Google Maps URL resolver.

### 4. Selective Face Triage Canvas (Cloudinary Explicit API)
- Renders detected facial bounding boxes (`faces: true`) and scene PII (license plates, identity documents) directly over high-res media.
- Newsroom editors selectively triage the bounding boxes:
  - **Preserve Bounding Box**: Target is designated a civilian bystander or sensitive PII (redacted).
  - **Remove Bounding Box**: Target is designated an elected official, spokesperson, or public figure (exempt from blurring).
  - **Add Custom Bounding Box**: Editors can draw custom bounding boxes to redact uncatalogued bystanders.
- Triggers `cloudinary.uploader.explicit(public_id, type="upload", face_coordinates=[...])` with only the civilian coordinates.
- Edge transformations apply `e_pixelate_faces:10`, blurring bystanders and PII while keeping public figures in razor-sharp focus.

### 5. Zero-Storage Dynamic Syndication Packaging
- Every broadcast deliverable is generated on-the-fly via deterministic Cloudinary URL chaining from a **single origin master asset**:
  - **16:9 Linear Broadcast Master**: Clean broadcast playout crop using AI subject focus (`c_fill,ar_16:9,g_auto:subject,f_auto,q_auto`).
  - **9:16 Vertical Mobile Story / Social Reel**: Formatted for Instagram Stories / TikTok / YouTube Shorts using content-aware background color padding (`c_fill,ar_9:16,g_auto:subject,b_auto:predominant`).
  - **1:1 Wire Micro-Card**: Compressed WebP/AVIF square feed format (`c_fill,ar_1:1,g_auto:subject,f_auto,q_auto`).
  - **6-Second Video Highlight Preview**: Autonomous clip generation using Cloudinary's AI video preview (`e_preview:duration_6:max_seg_3`).
- **1-Click Master Downloads**: Direct playout download packaging (SDI/NDI ready) protecting broadcast networks from viral CDN egress spikes.

### 6. Cloudinary Search API Wire Terminal
- Sub-second Lucene expression queries (`expression="tags:presswire AND status:approved"`) filtering across desks, urgency levels, and moderation states directly on Cloudinary's infrastructure.

---

## 🏆 Cloudinary AI Capabilities & API Rubric Checklist

| Cloudinary API / Primitive | Exact Transformation / Parameter | Purpose in PressWire Pipeline | Code Reference |
| :--- | :--- | :--- | :--- |
| **Upload API** | `faces: true`, `image_metadata: true` | Ingests media, auto-detects faces, and extracts raw hardware EXIF/GPS telemetry. | [`backend/app/services/intake_service.py`](backend/app/services/intake_service.py) |
| **Structured Metadata** | `context: { headline, urgency, incident_type, waiver_signed, submitter_ip }` | Embeds newsroom metadata directly into Cloudinary asset context. | [`backend/app/services/intake_service.py`](backend/app/services/intake_service.py) |
| **AI Content Moderation** | `moderation: "aws_rek"` | Autonomous AI safety check to isolate graphic/sensitive media into newsroom quarantine. | [`backend/app/services/intake_service.py`](backend/app/services/intake_service.py) |
| **Explicit API** | `cloudinary.uploader.explicit(..., face_coordinates=[[x, y, w, h], ...])` | Dynamically overrides the facial coordinate matrix with bystander-only coordinates. | [`backend/app/services/redaction_service.py`](backend/app/services/redaction_service.py) |
| **Privacy Redaction** | `e_pixelate_faces:10` | Real-time edge pixelation applied strictly to the active coordinate matrix. | [`backend/app/services/packaging_service.py`](backend/app/services/packaging_service.py) |
| **Content-Aware AI Cropping** | `c_fill,ar_16:9,g_auto:subject` | AI subject saliency detection for linear TV master playout. | [`backend/app/services/packaging_service.py`](backend/app/services/packaging_service.py) |
| **Generative & Smart Background** | `b_auto:predominant` | Auto-detects predominant color palette to blur-fill vertical 9:16 mobile feeds. | [`backend/app/services/packaging_service.py`](backend/app/services/packaging_service.py) |
| **Optimized Delivery** | `f_auto,q_auto` | Delivers optimal format (WebP/AVIF) and perceptual quality at minimum file size. | [`backend/app/services/packaging_service.py`](backend/app/services/packaging_service.py) |
| **Autonomous Video Previews** | `e_preview:duration_6:max_seg_3` | Generates 6-second dynamic highlight reels without local rendering. | [`backend/app/services/packaging_service.py`](backend/app/services/packaging_service.py) |
| **Search API** | `expression="tags:presswire AND incident_type:..."` | Real-time Lucene wire search across editorial desks and tags. | [`backend/app/services/search_service.py`](backend/app/services/search_service.py) |

---

## ⚡ 60-Second Judge Demo Script

1. **Brand Overview (`/`)**:
   - Explore the autonomous newsroom intake architecture, interactive AI packaging comparisons, and edge CDN URLs.
2. **Submit Wire Media (`/submit`)**:
   - Upload breaking media or click the **"5 Takes"** batch simulation button.
   - Note the legal irrevocable copyright waiver and automatic extraction of camera hardware EXIF and GPS coordinates.
3. **Triage on Editorial Desk (`/desk`)**:
   - Watch the live Server-Sent Events stream populate the wire queue in real time.
   - Inspect the **Selective Face Triage Canvas**: Cloudinary detected the faces automatically. Delete bounding boxes on public figures (leaving them exempt) while keeping boxes on bystanders.
   - Click **Save Coordinates**: Cloudinary's Explicit API updates the asset coordinates instantly with **zero duplicate files**.
4. **Inspect Live Broadcast Hub**:
   - Check the **16:9 Linear Broadcast**, **9:16 Social Reel**, **1:1 Feed Card**, and **6s Preview**.
   - Click **"Open Raw Cloudinary URL ↗"** to verify the live `e_pixelate_faces:10` and `g_auto:subject` transformations running on Cloudinary's edge CDN in a fresh tab.

---

## 🚀 Running PressWire Locally

### Quick Start Scripts

**On Windows (PowerShell):**
```powershell
.\start_dev.ps1
```

**On Linux / macOS:**
```bash
chmod +x start_dev.sh
./start_dev.sh
```

---

### Manual Setup

#### 1. Backend (FastAPI + Cloudinary SDK)
```bash
# Setup virtual environment
python -m venv backend/venv

# Activate venv:
# Windows: .\backend\venv\Scripts\Activate.ps1
# Linux/macOS: source backend/venv/bin/activate

pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
```
*Interactive Swagger docs available at `http://localhost:8000/docs`.*

#### 2. Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
*Editorial Desk available at `http://localhost:5173`.*

---

## 🛡️ License & Acknowledgements
Built for the **Cloudinary AI Media Pipelines Hackathon (PS-01 · Track 1)**.
All transformations, facial coordinate registrations, subject-aware crops, and media optimizations are performed natively on Cloudinary.
