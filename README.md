# PressWire: Autonomous Newsroom Ingestion & Broadcast Packaging Pipeline

> **Cloudinary Hackathon Track**: **Track 3 · Your Media-Savvy Startup** *(also 100% compliant with Track 1 · AI Media Pipelines)*  
> **Live Working Demo**: [https://presswire-h306.onrender.com](https://presswire-h306.onrender.com)  
> **Public GitHub Repository**: [https://github.com/SLICKRWIK/presswire](https://github.com/SLICKRWIK/presswire)

---

## 🎯 The Problem

During breaking disasters, civic unrest, and major events, newsrooms are flooded with hundreds of uncurated eyewitness photos and videos. News organizations face three critical operational bottlenecks:

1. **Legal & Copyright Exposure**: Broadcasting unverified citizen footage without an irrevocable copyright waiver exposes channels to copyright lawsuits.
2. **Privacy & PII Liability**: Strict broadcast regulations mandate blurring civilian bystanders, vehicle license plates (RTO & Bharat Series), and sensitive citizen documents (Aadhaar cards, PAN, Voter ID, driving licenses) while keeping elected officials and reporters unblurred.
3. **Multi-Format Storage Bloat**: Preparing the same origin photo for 16:9 linear TV, 9:16 vertical reels (Instagram/YouTube Shorts), 1:1 wire cards, and video previews traditionally requires local render farms and quadruples cloud storage and egress bills.

**PressWire solves this** by acting as an autonomous B2B SaaS media intake, provenance audit, selective privacy redaction, and multi-format syndication engine powered by Cloudinary's native processing primitives.

---

## 🌟 Key Architecture & Workflows

1. **Public Citizen & Field Intake (`/submit`)**:
   - Zero-friction upload stream for mobile eyewitnesses and field stringers.
   - Mandatory 1-click **Irrevocable Broadcast Copyright Waiver** before ingestion.
   - Extracts camera hardware EXIF telemetry and calculates capture-to-upload time discrepancies ($\Delta t$).
   - Automated ingestion moderation gate (`moderation: "webpurify"`) quarantining explicit or graphic content.

2. **Editorial Desk & Provenance Inspector (`/desk`)**:
   - Edge-to-edge full-bleed cockpit adapting to ultrawide and multi-monitor broadcast control rooms.
   - Real-time Server-Sent Events (SSE) live wire queue updating in under 500ms.
   - Asset provenance card showing camera hardware, GPS telemetry pin, and capture discrepancy.
   - Standardized across **6 fixed news desks** (`Public Safety`, `Severe Weather`, `Politics & Civic`, `Transit & Infrastructure`, `Metro & Local`, `General Wire`) with high-contrast urgency toggle (`Breaking Scoop` vs `Standard Wire`).
   - Spatiotemporal geo-anchor clustering engine with Google Maps link resolver.

3. **Selective Privacy Redaction Canvas (Coordinate Override Engine)**:
   - Visualizes detected facial bounding boxes (`faces: true`) and automated OCR bounding boxes for vehicle registration plates and national identity cards (Aadhaar, PAN, Voter ID, DL).
   - Editors toggle subjects: **Bystanders / PII (Redacted - Red)** vs. **Public Figures (Exempt - Green)**.
   - Fires `cloudinary.uploader.explicit(public_id, type="upload", face_coordinates=[...])` with only bystander/PII coordinates.
   - Delivery URLs apply `e_pixelate_faces:9` to selectively blur bystanders and sensitive numbers while keeping public figures crisp.
   - Video face tracking (`e_pixelate_faces`) across dynamic video uploads.

4. **Dynamic Multi-Platform Packaging (Zero Storage Duplication)**:
   - **16:9 Linear Broadcast**: Subject-aware crop (`c_fill,ar_16:9,g_auto:subject`) + dynamic lower-third breaking news headline banner (`l_text`).
   - **9:16 Vertical Mobile Story / Social Reel**: Context-aware blur padding (`c_fill,ar_9:16,g_auto:subject,b_auto:predominant`).
   - **1:1 Wire Micro-Thumbnail**: Instant compression (`c_fill,ar_1:1,g_auto:subject,f_auto,q_auto`).
   - **6-Second Video Highlight Reel**: Autonomous highlight extraction (`e_preview:duration_6:max_seg_3`).
   - **1-Click Master Downloads**: Direct high-bitrate playout packaging (SDI/NDI ready) protecting against viral public CDN bandwidth spikes.

5. **Wire Lucene Search Terminal**:
   - Sub-second Lucene filtering across Cloudinary tags, approval status, and urgency levels via the Cloudinary Search API.

6. **Cloudinary Hackathon Judging Rubric & API Checklist**:

| Cloudinary API / Primitive | Exact Transformation / Parameter | Purpose in PressWire | Code Location |
| :--- | :--- | :--- | :--- |
| **Upload API** | `faces: true`, `image_metadata: true` | Auto-detect faces & extract raw hardware EXIF payload at intake. | `intake_service.py` |
| **Explicit API** | `face_coordinates=[[x, y, w, h], ...]` | Override coordinate matrix with only bystander faces and OCR PII (excluding public figures). | `redaction_service.py` |
| **Privacy Redaction** | `e_pixelate_faces:9` / `e_blur_faces` | Edge-level pixelation without re-encoding original high-res masters. | `packaging_service.py` |
| **16:9 Linear Broadcast** | `c_fill,ar_16:9,g_auto:subject` + `l_text:...` | Smart subject crop with dynamic lower-third breaking news banner overlay. | `packaging_service.py` |
| **9:16 Social Story** | `c_pad,ar_9:16,b_auto:predominant,g_auto:subject` | Vertical frame preserving full context with predominant color background blur. | `packaging_service.py` |
| **1:1 Wire Micro-Card** | `c_fill,ar_1:1,g_auto:faces,f_auto,q_auto` | Responsive square newsfeed thumbnail with WebP/AVIF auto-format delivery. | `packaging_service.py` |
| **Autonomous Video Reel** | `e_preview:duration_6:max_seg_3` | Dynamic 6-second highlight clip without local video editing tools. | `packaging_service.py` |
| **Search API** | `expression="tags:presswire AND status:approved"` | Sub-second Lucene filtering across beats and urgency levels. | `search_service.py` |

7. **B2B Startup Commercial Packaging**:
   - Transparent pricing in INR for Indian and global broadcast newsrooms:
     - **Regional Bureau**: ₹45,000 / month (Single State Circle)
     - **Broadcast Network**: ₹1,75,000 / month (Multi-Circle / Shared Wire Pools)
     - **National Network**: Enterprise Custom SLA (Dedicated BYOC, 1-Click Playout Downloads)

---

## ⚡ 60-Second Judge Demo Script

1. **Step 1: Open Brand Home (`/`)**:
   - View the autonomous newsroom value proposition, dynamic transformation preview cards with 1-click **"Open Raw CDN URL"** links, and B2B Station Pricing.
2. **Step 2: Submit Breaking Footage (`/submit`)**:
   - Test field reporter intake: pick media, sign the mandatory **Irrevocable Broadcast Copyright Waiver**, capture GPS, and click submit.
3. **Step 3: Launch Editorial Desk (`/desk`)**:
   - See the submission arrive on the wire queue in real time.
   - Inspect hardware EXIF forensics ($\Delta t$ capture vs upload discrepancy, camera model, GPS).
   - In the **Selective Face Triage Canvas**, click a bystander bounding box to toggle between **Redacted (Civilian)** and **Exempt (Public Figure)**.
   - Notice the Cloudinary Explicit API updates coordinates live with **zero duplicate storage files created**.
4. **Step 4: Inspect Syndication Deliverables**:
   - In the Broadcast Hub, click **"Open Raw Cloudinary URL ↗"** on any format (16:9 linear TV, 9:16 reel, 1:1 card) to verify the live transformation running on Cloudinary's edge CDN in a new browser tab.

---

## 🚀 Running PressWire

### One-Click Development Start

**On Windows (PowerShell):**
```powershell
.\start_dev.ps1
```
*(Or double-click `start_dev.bat`)*

**On Linux / macOS / Git Bash:**
```bash
chmod +x start_dev.sh
./start_dev.sh
```

---

### Manual Service Setup

#### 1. Backend Setup (FastAPI & Cloudinary)
```bash
# Windows PowerShell:
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend

# Linux / macOS:
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```
Interactive API docs available at `http://localhost:8000/docs`.

#### 2. Frontend Setup (React & Tailwind)
```bash
cd frontend
npm install
npm run dev
```
Newsroom portal available at `http://localhost:5173`.

