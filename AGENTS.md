# AGENTS.md - PressWire Autonomous Agent Instructions

Welcome to the **PressWire** workspace. This repository implements an autonomous newsroom media intake, provenance audit, selective privacy redaction, and broadcast syndication engine powered by Cloudinary.

## Agent System Overview & Personas

When working on this repository, agents must adhere to the following roles and responsibilities:

1. **Pipeline & Cloudinary Architect**
   - Expert in Cloudinary APIs: Upload API, Explicit API (`face_coordinates` manipulation), Search API, Moderation hooks, and dynamic URL transformation syntax.
   - Enforces **zero-duplicate storage**: every broadcast variation (16:9 linear TV, 9:16 vertical reel, 1:1 card, 6-second video highlight) must be generated on-the-fly via deterministic URL transformations from a single origin asset.
   - Guarantees proper coordinate formatting: `face_coordinates` expects `[[x, y, width, height], ...]`.

2. **Full-Stack & Newsroom UI Engineer**
   - Builds responsive, low-latency interfaces for both the public mobile intake portal (`/submit`) and editorial control console (`/desk`).
   - Ensures the **Interactive Face Triage Canvas** seamlessly maps image natural dimensions to viewport coordinates, allowing editors to toggle bounding boxes between Redacted (Civilian) and Exempt (Public Figure).
   - Manages live broadcast preview panels with copyable syndication URLs and direct CDN streaming.

3. **Provenance & Safety Auditor**
   - Audits incoming media metadata: EXIF capture timestamps, device/sensor models, GPS coordinates, and moderation scores.
   - Ensures any content failing automated safety checks is quarantined immediately without exposing sensitive media to editors unreviewed.

---

## Technical Directives & Best Practices

- **Zero-Storage Dynamic Packaging**:
  - Never upload duplicate derivative images or save processed crops locally.
  - 16:9 Broadcast: `c_fill,ar_16:9,g_auto:subject` + dynamic `l_text` lower-third overlay.
  - 9:16 Social Story: `c_fill,ar_9:16,g_auto:subject,b_auto:predominant` (preserves visual context for horizontal submissions).
  - 1:1 Thumbnail: `c_fill,ar_1:1,g_auto:subject,f_auto,q_auto`.
  - Video Reel: `e_preview:duration_6:max_seg_3`.
- **Selective Privacy Redaction Workflow**:
  1. Asset uploaded with `faces: true` and `image_metadata: true`.
  2. Detected faces returned as bounding boxes.
  3. Newsroom editor inspects bounding boxes in `/desk`.
  4. Backend calls `cloudinary.uploader.explicit(public_id, type="upload", face_coordinates=[...])` with only bystander coordinates.
  5. Syndication URLs apply `e_pixelate_faces` to blur strictly the selected bystanders.
- **Newsroom Layout & Taxonomy Standards**:
  - The editorial desk (`/desk`) is a full-bleed workspace application (`w-full` edge-to-edge). Never clamp containers with arbitrary `max-w-[1720px]` caps that create empty side gutters on ultrawide viewports.
  - News classification strictly adheres to **7 fixed news desks** (`Breaking News`, `Public Safety`, `Severe Weather`, `Politics & Civic`, `Transit & Infrastructure`, `Metro & Local`, `General Wire`). Never re-introduce ad-hoc user-created categories or color pickers.
- **Spatiotemporal Clustering & Geo-Anchor Engine**:
  - Packages support dynamic spatiotemporal clustering based on an editable geo-anchor (`lat`, `lng`) and perimeter radius (`cluster_radius_km`).
  - Google Maps links (including shortened `maps.app.goo.gl` and query parameters) are automatically resolved to coordinates via `/api/v1/editorial/resolve-map`.
  - When no geo-anchor is set on a package, perimeter sliders remain locked (disabled, unmovable, and greyed out).
- **Direct OS File Drop Ingestion**:
  - Dropping media files from the desktop/file explorer directly onto empty or existing story packages in `/desk` automatically ingests them to Cloudinary and clusters them into that package.
  - Drag-and-drop overlays must unconditionally reset on drop/dragend via container and window-level listeners to prevent stuck overlay screens.
- **Minimalist UI & Triage Standards**:
  - Strictly avoid tick marks (`✓`, `Check` icons) on action buttons and status badges; use clean typography or subtle active highlights.
  - Avoid bulky dark pill containers, heavy borders, or opaque overlays; face bounding boxes and canvas overlays must remain transparent so the underlying imagery is visible.
  - Triage canvas displays transient autosave feedback in the lower-left corner that cleanly fades away.
- **Production Audit & Legal Mandates**:
  - See `docs/production-readiness-audit.md` for production operational standards.
  - Enforce video face tracking (`e_pixelate_faces`) across dynamic video uploads.
  - Field intake (`/submit`) requires a mandatory 1-click irrevocable broadcast copyright release.
  - Protect against viral cloud bandwidth bills by prioritizing 1-click master downloads over raw public CDN origin streaming.
- **Environment & Secrets**:
  - Never hardcode Cloudinary credentials (`CLOUDINARY_URL`, `API_KEY`, `API_SECRET`) in source code.
  - Always read from `.env` or system environment variables.
- **Code Standards**:
  - Backend: Python 3.14+, FastAPI, Pydantic v2, clear type hints, clean dependency injection.
  - Frontend: React 19 / TypeScript / Vite / Tailwind CSS, accessible UI, Lucide icons.
