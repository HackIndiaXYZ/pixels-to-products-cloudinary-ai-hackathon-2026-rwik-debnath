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

6. **Production Readiness & Deployment Audit**:
   - See [docs/production-readiness-audit.md](file:///home/rwik05/Projects/cloudinary/docs/production-readiness-audit.md) for full analysis comparing Model A (Mid-Market / Agile Web Newsrooms) vs Model B (Tier-1 Enterprise Conglomerates).

---

## 🚀 Running PressWire

### 1. Backend Setup (FastAPI & Cloudinary)
```bash
# Activate virtual environment
source backend/venv/bin/activate

# Set your Cloudinary credentials in .env (or environment)
cp .env.example .env
# Edit .env with your Cloudinary credentials

# Run FastAPI backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```
Interactive API docs available at `http://localhost:8000/docs`.

### 2. Frontend Setup (React & Tailwind)
```bash
cd frontend
npm install
npm run dev
```
Newsroom portal available at `http://localhost:5173`.
