# PressWire: Autonomous Newsroom Ingestion & Broadcast Packaging Pipeline

PressWire is an automated intake, audit, and broadcast syndication engine engineered for breaking news organizations. It addresses the critical operational bottleneck newsrooms face during breaking events: ingesting hundreds of chaotic, uncurated citizen media uploads and converting them into policy-compliant, privacy-protected, multi-platform broadcast packages in seconds using Cloudinary's native processing primitives.

---

## 🌟 Key Architecture & Workflows

1. **Public Citizen & Field Intake (`/submit`)**:
   - Zero-friction upload stream for mobile devices.
   - Extracts device hardware metadata (Camera Make/Model, Software).
   - Ingestion moderation gate (`moderation: "webpurify"`) quarantining explicit or graphic content.
   - Captures GPS coordinates and calculates delta between capture time and upload time.

2. **Editorial Desk & Provenance Inspector (`/desk`)**:
   - Edge-to-edge full-bleed broadcast cockpit adapting to ultrawide and multi-monitor setups.
   - Live triage queue categorized into `Action Required`, `Quarantined`, and `Approved`.
   - Asset provenance card showing camera hardware, GPS telemetry pin, and capture-upload time discrepancies.
   - Fixed 7-desk taxonomy aligned with IPTC standards (`Breaking News`, `Public Safety`, `Severe Weather`, `Politics & Civic`, `Transit & Infrastructure`, `Metro & Local`, `General Wire`).
   - Silent auto-save persistence and high-contrast urgency toggle (`Breaking` vs `Standard`).

3. **Selective Privacy Redaction Canvas (Coordinate Override Engine)**:
   - Visualizes detected facial bounding boxes (`faces: true`) on an interactive canvas.
   - Editors toggle subjects: **Bystanders (Redacted - Red)** vs. **Public Figures (Exempt - Green)**.
   - Fires `cloudinary.uploader.explicit(public_id, type="upload", face_coordinates=[...])` with only bystander coordinates.
   - Delivery URLs apply `e_pixelate_faces` to selectively pixelate bystanders while preserving public figures.
   - Native video face tracking (`e_pixelate_faces` / `e_blur_faces`) across dynamic video streams.

4. **Dynamic Multi-Platform Packaging (Zero Storage Duplication)**:
   - **16:9 Linear Broadcast**: Subject-aware crop (`c_fill,ar_16:9,g_auto:subject`) + live lower-third TV breaking banner (`l_text`).
   - **9:16 Vertical Mobile Story / Social Reel**: Context-aware blur padding (`c_fill,ar_9:16,g_auto:subject,b_auto:predominant`).
   - **1:1 Wire Micro-Thumbnail**: Instant compression (`c_fill,ar_1:1,g_auto:subject,f_auto,q_auto`).
   - **6-Second Video Highlight Reel**: Autonomous highlight extraction (`e_preview:duration_6:max_seg_3`).
   - **1-Click Master Downloads**: Direct high-bitrate MP4/JPG packaging to protect SaaS origin accounts from viral cloud bandwidth bills.

5. **Wire Lucene Search Terminal**:
   - Direct querying of Cloudinary Search API across tags, approval status, and urgency levels.

6. **Cloudinary Hackathon Judging Rubric & API Checklist**:

| Cloudinary API / Primitive | Exact Transformation / Parameter | Purpose in PressWire | Code Location |
| :--- | :--- | :--- | :--- |
| **Upload API** | `faces: true`, `image_metadata: true` | Auto-detect faces & extract raw hardware EXIF payload at intake. | `intake_service.py` |
| **Explicit API** | `face_coordinates=[[x, y, w, h], ...]` | Override coordinate matrix with only bystander faces (excluding public figures). | `redaction_service.py` |
| **Privacy Redaction** | `e_pixelate_faces:10` / `e_blur_faces` | Edge-level pixelation without re-encoding original high-res masters. | `packaging_service.py` |
| **16:9 Linear Broadcast** | `c_fill,ar_16:9,g_auto:subject` + `l_text:...` | Smart subject crop with dynamic lower-third breaking news chyron overlay. | `packaging_service.py` |
| **9:16 Social Story** | `c_pad,ar_9:16,b_auto:predominant,g_auto:subject` | Vertical frame preserving full context with predominant color background blur. | `packaging_service.py` |
| **1:1 Wire Micro-Card** | `c_fill,ar_1:1,g_auto:faces,f_auto,q_auto` | Responsive square newsfeed thumbnail with WebP/AVIF auto-format delivery. | `packaging_service.py` |
| **Autonomous Video Reel** | `c_fill,ar_16:9,so_0,du_6` | Instant dynamic 6-second highlight clip without local video editing tools. | `packaging_service.py` |
| **Search API** | `expression="tags:presswire AND status:approved"` | Sub-second Lucene filtering across beats and urgency levels. | `search_service.py` |

7. **Production Readiness & B2B Station Architecture**:
   - See [docs/production-readiness-audit.md](docs/production-readiness-audit.md) for full analysis comparing Model A (B2B SaaS for Broadcasters) vs Model B (Tier-1 Enterprise Conglomerates).

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

