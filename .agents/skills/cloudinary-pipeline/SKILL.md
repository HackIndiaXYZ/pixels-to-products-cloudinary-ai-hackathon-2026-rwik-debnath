---
name: cloudinary-pipeline
description: Reference guide and helper patterns for Cloudinary SDK, face coordinate overrides, dynamic lower-thirds, video previews, and Search API.
---

# Cloudinary Pipeline Skill

This skill provides reference patterns for implementing PressWire's core primitives in Python and TypeScript.

## 1. Upload with Faces and Metadata Extraction
```python
import cloudinary.uploader

response = cloudinary.uploader.upload(
    file_bytes_or_path,
    folder="presswire/intake",
    faces=True,
    image_metadata=True,
    moderation="webpurify",  # or aws_rek, perception_point, etc.
    context={
        "urgency": "breaking",
        "incident_type": "breaking_news",
        "review_status": "action_required"
    }
)
# response["faces"] -> [[x, y, w, h], ...]
# response["image_metadata"] -> EXIF and GPS tags
```

## 2. Selective Privacy Redaction (Coordinate Override)
```python
# To pixelate ONLY bystanders:
# 1. Update face_coordinates via explicit API:
bystander_coords = [[120, 80, 50, 50], [450, 90, 48, 48]]
cloudinary.uploader.explicit(
    public_id,
    type="upload",
    face_coordinates=bystander_coords
)

# 2. Delivery URL applies e_pixelate_faces:
# https://res.cloudinary.com/<cloud_name>/image/upload/e_pixelate_faces:10/<public_id>
# Only bystander_coords will be pixelated! Public figures remain crisp.
```

## 3. Dynamic Packaging URL Patterns
- **16:9 Linear Broadcast + Lower-Third Banner**:
  `c_fill,ar_16:9,g_auto:subject/l_text:Arial_32_bold:BREAKING%20NEWS,g_south_west,x_30,y_80,co_rgb:ffffff,b_rgb:e63946/l_text:Arial_22:Eyewitness%20Report,g_south_west,x_30,y_40,co_rgb:ffffff,b_rgb:1d3557/<public_id>`
- **9:16 Social Story with Predominant Blur Padding**:
  `c_fill,ar_9:16,g_auto:subject,b_auto:predominant,e_pixelate_faces:10/<public_id>`
- **1:1 Thumbnail with Auto Quality & Format**:
  `c_fill,ar_1:1,g_auto:subject,f_auto,q_auto,e_pixelate_faces:10/<public_id>`
- **6-Second Video Highlight Reel**:
  `e_preview:duration_6:max_seg_3/<public_id>.mp4`

## 4. Search API Real-Time Queries
```python
import cloudinary.Search

results = cloudinary.Search() \
    .expression('folder:presswire/* AND tags:breaking AND -status:rejected') \
    .sort_by('created_at', 'desc') \
    .max_results(30) \
    .execute()
```

## 5. Temporal Video Face Tracking
```python
# Video delivery URL applies e_pixelate_faces across all frames:
# https://res.cloudinary.com/<cloud_name>/video/upload/e_pixelate_faces:12/<public_id>.mp4
```

## 6. One-Click Master Packaging & Attachment Download
```python
# Force browser download attachment to preserve station bandwidth:
# Replace /upload/ with /upload/fl_attachment/
download_url = delivery_url.replace('/upload/', '/upload/fl_attachment/')
```

