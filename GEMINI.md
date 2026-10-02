# GEMINI.md - Antigravity Workspace Guidelines

This document governs agent behavior, pair programming conventions, and engineering standards for the **PressWire** project.

## Project Vision & Context
PressWire is an autonomous breaking newsroom intake, verification, selective face redaction, and multi-platform packaging pipeline. It utilizes Cloudinary's native image/video processing primitives (`faces`, `face_coordinates`, `moderation`, `e_preview`, `g_auto:subject`, dynamic `l_text`, Search API).

## Core Engineering Principles

1. **Deterministic Cloudinary Transformations**:
   - Always leverage URL transformation chaining instead of server-side re-encoding or duplicating assets.
   - Standardize aspect ratios:
     - 16:9 Linear Broadcast / Web: `c_fill,ar_16:9,g_auto:subject` with lower-third overlay (`l_text:Arial_28_bold:<headline>,g_south_west,x_30,y_40,co_rgb:ffffff,b_rgb:d90429_cc`).
     - 9:16 Social Reel / Story: `c_fill,ar_9:16,g_auto:subject,b_auto:predominant`.
     - 1:1 Feed Card: `c_fill,ar_1:1,g_auto:subject,f_auto,q_auto`.
     - 6s Autonomous Video Highlight: `e_preview:duration_6:max_seg_3`.

2. **Selective Face Coordinate Engine**:
   - The newsroom requires fine-grained privacy control: civilians/bystanders are redacted (`e_pixelate_faces:9`), while verified public figures (officials, anchors, reporters) remain unblurred.
   - Always update the coordinate matrix via Cloudinary's `uploader.explicit(public_id, type="upload", face_coordinates=filtered_coords)`.
   - Never tamper with original media files directly.

3. **Provenance & Moderation Telemetry**:
   - Store and verify raw EXIF/IPTC data: camera model, lens aperture, GPS lat/long, capture timestamp vs upload timestamp delta.
   - Immediate triage routing:
     - `quarantined`: flagged by moderation (hate, graphic violence, NSFW).
     - `action_required`: contains detected faces requiring editorial triage or missing metadata.
     - `approved`: passed editorial audit and privacy redactions, ready for wire distribution.

4. **Fixed Newsroom Taxonomy**:
   - Editorial desks are standardized across **6 fixed news desks** (`Public Safety`, `Severe Weather`, `Politics & Civic`, `Transit & Infrastructure`, `Metro & Local`, `General Wire`).
   - Never introduce ad-hoc user-created categories or custom color pickers; breaking status is an orthogonal urgency flag (`urgency`), not a news desk category.

5. **Edge-to-Edge Cockpit Layout**:
   - The newsroom `/desk` interface is a professional workspace application. It must remain **full-bleed edge-to-edge (`w-full`)** without artificial container caps (`max-w-[1720px]`), ensuring ultrawide and zoomed-out viewports expand the inspection canvas rather than rendering empty side gutters.

6. **Code Quality, Security & Architecture**:
   - **Backend**: FastAPI with async route handlers, Pydantic v2 data models, structured logging, and robust error handling.
   - **Frontend**: Clean component architecture, TypeScript interfaces matching backend models, responsive Tailwind CSS styling with an authoritative broadcast theme.
   - **Production Readiness**: Enforce video face tracking (`e_pixelate_faces`), mandatory broadcast rights waivers on `/submit`, and 1-click master downloads to protect against public egress bandwidth spikes (see `docs/production-readiness-audit.md`).
   - **API Secrets**: Cloudinary credentials must only be consumed in the backend. The frontend must never expose the API Secret.

7. **Spatiotemporal Geo-Anchor & Direct File Ingestion**:
   - Editorial packages dynamically cluster incoming wire media based on an editable geo-anchor (`lat`, `lng`) and perimeter radius (`cluster_radius_km`).
   - Backend endpoint `/api/v1/editorial/resolve-map` resolves full and shortened Google Maps links (`maps.app.goo.gl`) into canonical coordinates.
   - When no geo-anchor is configured on a package, the spatiotemporal sliders must remain locked (disabled, unmovable, and greyed out).
   - Dropping files directly from the desktop/file explorer onto any package card immediately ingests and clusters the files, with drag overlays unconditionally reset on drop/dragend.

8. **Minimalist UX & Visual Hygiene**:
   - Never use tick marks (`✓`, `<Check />` icons) for confirmation badges or button icons; rely on clean, unobtrusive typography and subtle active states.
   - Keep overlays and bounding box canvases transparent so that underlying media remains visible.
   - Use transient, corner-docked autosave feedback that automatically fades out after persistence.
