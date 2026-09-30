# Cloudinary Primitives & Transformation Rules

These rules apply whenever code generates, modifies, or consumes Cloudinary assets and URLs:

1. **Explicit API Coordinate Format**:
   - `face_coordinates` parameter in `cloudinary.uploader.explicit` must be a list of 4-tuples or 4-element lists: `[[x, y, width, height], ...]`.
   - Never supply float coordinates or normalized percentages to `face_coordinates`; they must be integer pixel values matching the original image resolution.

2. **Zero Storage Duplication**:
   - Do NOT save derivative images (crops, blurred variants, thumbnails) to Cloudinary or disk.
   - Use URL transformations on the single canonical `public_id`.

3. **URL Transformation Sanitization**:
   - Any dynamic text in `l_text` (such as breaking news headlines) MUST be URL-encoded (specifically commas, slashes, and spaces must be properly encoded or replaced).
   - In Cloudinary text overlays:
     - Spaces can be encoded as `%20` or replaced by URL encoder.
     - Commas `,` must be encoded as `%2C` to prevent breaking transformation parameter separation.

4. **Moderation States**:
   - Map Cloudinary moderation response:
     - `status: "rejected"` -> `review_status: "quarantined"`
     - `status: "pending"` -> `review_status: "action_required"`
     - `status: "approved"` -> `review_status: "approved"`

5. **Video Face Tracking**:
   - In dynamic video clips where subjects move across frames, apply `e_pixelate_faces` directly within video delivery URL chains to trigger Cloudinary's temporal face tracking across the entire stream.

6. **Bandwidth & Master Download Safeguard**:
   - For linear and digital news distribution, provide 1-click download links (`/fl_attachment/`) for packaged masters (16:9 MP4, social clips), directing stations to host viral media on their own CDN rather than incurring uncapped egress bandwidth bills on origin accounts.

7. **Newsroom Taxonomy Integrity**:
   - Assets must be categorized into one of the **7 fixed news desks** (`breaking_news`, `public_safety`, `severe_weather`, `politics_civic`, `transit`, `metro_local`, `uncategorized`). Never introduce ad-hoc custom categories.
