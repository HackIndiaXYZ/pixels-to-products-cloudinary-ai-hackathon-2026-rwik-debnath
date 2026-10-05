import asyncio
import logging
import os
import re
from typing import Optional, Dict, Any, List
import httpx
import cloudinary.uploader
import cloudinary.api

from app.models.schemas import MediaAssetResponse, FaceCoordinate, ModerationResult
from app.services.broadcaster import broadcaster
from app.services.packaging_service import PackagingService
from app.services.ocr_service import OCRService
from app.services.redaction_service import RedactionService
from app.services.intake_service import WIRE_STORE

logger = logging.getLogger("presswire.processing")

CACHE_DIR = "data/uploads_cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def _safe_cache_filename(public_id: str) -> str:
    safe = re.sub(r"[^\w\-_\.]", "_", public_id)
    return os.path.join(CACHE_DIR, f"{safe}.bin")


def save_upload_bytes_cache(public_id: str, file_bytes: bytes) -> None:
    """Caches raw image bytes to disk for instant local OCR access."""
    try:
        path = _safe_cache_filename(public_id)
        with open(path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.warning(f"[Cache] Failed to cache bytes for {public_id}: {e}")


async def get_asset_bytes(asset: MediaAssetResponse) -> Optional[bytes]:
    """Retrieves image bytes from local disk cache or falls back to CDN secure_url."""
    path = _safe_cache_filename(asset.public_id)
    if os.path.exists(path):
        try:
            with open(path, "rb") as f:
                content = f.read()
                if content:
                    return content
        except Exception as e:
            logger.warning(f"[Cache] Read error on {path}: {e}")

    # Fallback: fetch from Cloudinary CDN
    if asset.secure_url:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(asset.secure_url)
                if res.status_code == 200:
                    save_upload_bytes_cache(asset.public_id, res.content)
                    return res.content
        except Exception as e:
            logger.error(f"[Processing] Failed to download {asset.secure_url}: {e}")

    return None


class ProcessingManager:
    """
    Single-worker priority preemption engine.
    Ensures bounded CPU/memory usage by processing at most 1 asset at a time.
    When a new asset is selected, any active in-flight analysis is preempted and halted.
    """
    _active_task: Optional[asyncio.Task] = None
    _active_public_id: Optional[str] = None
    _lock = asyncio.Lock()

    @classmethod
    async def start_priority_processing(cls, public_id: str) -> Dict[str, Any]:
        """
        Requests priority deep forensic processing for public_id.
        Preempts any currently running asset.
        """
        async with cls._lock:
            if public_id not in WIRE_STORE:
                return {
                    "success": False,
                    "public_id": public_id,
                    "processing_status": "failed",
                    "message": "Asset not found in wire store"
                }

            asset = WIRE_STORE[public_id]
            if asset.processing_status == "completed":
                return {
                    "success": True,
                    "public_id": public_id,
                    "processing_status": "completed",
                    "asset": asset
                }

            if cls._active_public_id == public_id and cls._active_task and not cls._active_task.done():
                return {
                    "success": True,
                    "public_id": public_id,
                    "processing_status": "processing",
                    "message": "Already processing with priority"
                }

            # Preempt previous active task if running
            if cls._active_task and not cls._active_task.done():
                prev_id = cls._active_public_id
                logger.info(f"[ProcessingManager] Preempting in-flight analysis for {prev_id} to prioritize {public_id}")
                cls._active_task.cancel()
                if prev_id and prev_id in WIRE_STORE:
                    prev_asset = WIRE_STORE[prev_id]
                    if prev_asset.processing_status != "completed":
                        prev_asset.processing_status = "pending"
                        WIRE_STORE[prev_id] = prev_asset
                        broadcaster.broadcast("asset:updated", prev_asset.model_dump())

            # Mark new asset as processing
            asset.processing_status = "processing"
            WIRE_STORE[public_id] = asset
            broadcaster.broadcast("asset:updated", asset.model_dump())

            cls._active_public_id = public_id
            cls._active_task = asyncio.create_task(cls._worker(public_id))

            return {
                "success": True,
                "public_id": public_id,
                "processing_status": "processing",
                "message": "Priority forensic scan launched"
            }

    @classmethod
    async def cancel_processing(cls, public_id: str) -> bool:
        """Explicitly cancels processing for public_id if active."""
        async with cls._lock:
            if cls._active_public_id == public_id and cls._active_task and not cls._active_task.done():
                logger.info(f"[ProcessingManager] Halting processing for {public_id}")
                cls._active_task.cancel()
                if public_id in WIRE_STORE:
                    asset = WIRE_STORE[public_id]
                    asset.processing_status = "pending"
                    WIRE_STORE[public_id] = asset
                    broadcaster.broadcast("asset:updated", asset.model_dump())
                cls._active_public_id = None
                cls._active_task = None
                return True
        return False

    @classmethod
    async def _worker(cls, public_id: str) -> None:
        """Background worker that performs the deep forensic OCR & moderation checks."""
        logger.info(f"[ProcessingManager] Beginning deep forensic worker for {public_id}")
        try:
            if public_id not in WIRE_STORE:
                return

            asset = WIRE_STORE[public_id]
            file_bytes = await get_asset_bytes(asset)

            # Yield to event loop to allow preemption check
            await asyncio.sleep(0.05)

            # 1. OCR Scene Scanning (License plates, PAN/Aadhaar/Phone)
            has_ocr_boxes = False
            if file_bytes and asset.resource_type != "video" and asset.incident_type != "severe_weather":
                try:
                    ocr_regions = await asyncio.to_thread(OCRService.scan_for_sensitive_regions, file_bytes)
                    if ocr_regions:
                        # Yield to event loop
                        await asyncio.sleep(0.05)

                        # Filter out duplicate boxes
                        if asset.faces is None:
                            asset.faces = []
                        existing_ids = {f.id for f in asset.faces}
                        for ocr_idx, reg in enumerate(ocr_regions):
                            box_id = f"ocr_{ocr_idx}"
                            if box_id not in existing_ids:
                                asset.faces.append(FaceCoordinate(
                                    id=box_id,
                                    x=reg["x"],
                                    y=reg["y"],
                                    w=reg["w"],
                                    h=reg["h"],
                                    is_redacted=True,
                                    label=reg["label"],
                                    kind=reg["kind"],
                                    detected_text=reg.get("detected_text")
                                ))
                        has_ocr_boxes = True
                except asyncio.CancelledError:
                    raise
                except Exception as ocr_err:
                    logger.warning(f"[ProcessingManager] OCR scan bypassed for {public_id}: {ocr_err}")

            # Yield to event loop
            await asyncio.sleep(0.05)

            # 2. Rekognition Moderation Check (if not already quarantined)
            from app.services.intake_service import IntakeService
            if not getattr(IntakeService, "_rekognition_exhausted", False) and asset.review_status != "quarantined":
                try:
                    mod_exp = await asyncio.to_thread(
                        cloudinary.uploader.explicit,
                        asset.public_id,
                        type="upload",
                        moderation="aws_rek"
                    )
                    if "moderation" in mod_exp:
                        mod_raw = mod_exp.get("moderation", [])
                        categories: List[str] = []
                        max_confidence: Optional[float] = None
                        mod_status = "approved"

                        for entry in mod_raw:
                            if not isinstance(entry, dict):
                                continue
                            status_val = entry.get("status", "approved")
                            response_data = entry.get("response", {})
                            if isinstance(response_data, dict):
                                for label_item in response_data.get("moderation_labels", []):
                                    name = label_item.get("name")
                                    conf = label_item.get("confidence")
                                    if name and name not in categories:
                                        categories.append(name)
                                    if conf is not None:
                                        conf_val = float(conf) / 100.0 if float(conf) > 1.0 else float(conf)
                                        if max_confidence is None or conf_val > max_confidence:
                                            max_confidence = round(conf_val, 2)
                            if status_val == "rejected":
                                mod_status = "quarantined"
                            elif status_val == "pending" and mod_status != "quarantined":
                                mod_status = "action_required"

                        asset.moderation = ModerationResult(
                            status=mod_status,
                            confidence=max_confidence,
                            categories=categories
                        )
                        if mod_status == "quarantined":
                            asset.review_status = "quarantined"
                            # Cloudinary CDN by default returns HTTP 404 for assets rejected by moderation.
                            # We approve the asset delivery access mode in Cloudinary so that newsroom editors can
                            # audit/inspect it behind PressWire's frosted quarantine shield without encountering a 404 broken image.
                            try:
                                await asyncio.to_thread(cloudinary.api.update, asset.public_id, moderation_status="approved")
                            except Exception as unblock_err:
                                logger.warning(f"[ProcessingManager] Could not update moderation_status to approved: {unblock_err}")
                except asyncio.CancelledError:
                    raise
                except Exception as mod_err:
                    err_msg = str(mod_err)
                    if "Rate Limit Exceeded" in err_msg or "Limit of 50" in err_msg:
                        IntakeService._rekognition_exhausted = True
                    logger.warning(f"[ProcessingManager] Explicit moderation check skipped: {mod_err}")

            # Yield to event loop
            await asyncio.sleep(0.05)

            # 3. Explicit Coordinate Registration for OCR / Redactions
            if has_ocr_boxes:
                try:
                    red_coords = [[f.x, f.y, f.w, f.h] for f in asset.faces if f.is_redacted]
                    if red_coords:
                        await asyncio.to_thread(RedactionService.update_selective_faces, asset.public_id, red_coords)
                except asyncio.CancelledError:
                    raise
                except Exception as red_err:
                    logger.warning(f"[ProcessingManager] Explicit OCR coordinates registration bypassed: {red_err}")

            # 4. Review Status determination
            if asset.moderation.status == "quarantined":
                asset.review_status = "quarantined"
            elif asset.faces:
                asset.review_status = "action_required"
            else:
                asset.review_status = "approved"

            # 5. Dynamic Syndication URLs update
            asset.syndication_urls = PackagingService.generate_broadcast_urls(
                public_id=asset.public_id,
                headline=asset.headline or "Breaking News",
                pixelate_bystanders=bool(asset.faces),
                resource_type=asset.resource_type,
                version=int(asyncio.get_event_loop().time() * 1000)
            )

            # 6. Mark Completed
            asset.processing_status = "completed"
            WIRE_STORE[public_id] = asset
            broadcaster.broadcast("asset:updated", asset.model_dump())
            logger.info(f"[ProcessingManager] Deep forensic analysis successfully completed for {public_id}")

        except asyncio.CancelledError:
            logger.info(f"[ProcessingManager] Task for {public_id} was preempted/cancelled.")
            if public_id in WIRE_STORE:
                asset = WIRE_STORE[public_id]
                if asset.processing_status != "completed":
                    asset.processing_status = "pending"
                    WIRE_STORE[public_id] = asset
                    broadcaster.broadcast("asset:updated", asset.model_dump())
            raise
        except Exception as e:
            logger.error(f"[ProcessingManager] Error processing {public_id}: {e}", exc_info=True)
            if public_id in WIRE_STORE:
                asset = WIRE_STORE[public_id]
                asset.processing_status = "failed"
                WIRE_STORE[public_id] = asset
                broadcaster.broadcast("asset:updated", asset.model_dump())
        finally:
            async with cls._lock:
                if cls._active_public_id == public_id:
                    cls._active_public_id = None
                    cls._active_task = None
