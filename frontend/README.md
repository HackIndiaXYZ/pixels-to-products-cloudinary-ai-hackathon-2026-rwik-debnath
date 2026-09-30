# PressWire Editorial Console & Field Intake Frontend

React 19 + TypeScript + Vite + Tailwind CSS frontend for the PressWire newsroom intake, verification, selective face redaction, and multi-platform packaging pipeline.

---

## 🌟 Key Views & Architecture

1. **Editorial Control Desk (`/desk`)**:
   - **Edge-to-Edge Full Bleed**: Fully responsive layout (`w-full`) adapting seamlessly across ultrawide monitors and zoomed-out browser viewports without empty side gutters.
   - **Wire Triage Stream (`WireQueue.tsx`)**: Unified buffer managing incoming citizen media categorized into `Action Required`, `Approved`, and `Quarantined`.
   - **Interactive Redaction Canvas (`RedactionCanvas.tsx`)**: Maps natural image dimensions to viewport coordinates, allowing editors to toggle bounding boxes between Redacted (Civilian - Red) and Exempt (Public Figure - Green).
   - **Provenance & Wire Inspector (`ProvenanceCard.tsx`)**: Full-height drawer showing camera sensor telemetry, EXIF timestamp delta ($\Delta t$), GPS coordinates, and Cloudinary moderation scores.
   - **Fixed Newsroom Taxonomy (`categories.ts`)**: 7 standardized industry desks (`Breaking News`, `Public Safety`, `Severe Weather`, `Politics & Civic`, `Transit & Infrastructure`, `Metro & Local`, `General Wire`) with silent auto-save persistence.

2. **Public Field Intake (`/submit` & Modal)**:
   - Zero-friction upload stream for mobile devices in low-bandwidth field environments.
   - Captures GPS coordinates, camera hardware sensors, and file headers.
   - Mandatory copyright release waiver before ingestion.

---

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build & typecheck
npm run build
```
