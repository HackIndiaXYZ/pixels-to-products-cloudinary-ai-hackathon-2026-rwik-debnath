import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Compile high-precision regex patterns for Indian identifiers
INDIAN_STATES = (
    "AN|AP|AR|AS|BR|CH|CG|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MP|MH|MN|ML|MZ|NL|OD|OR|PB|PY|RJ|SK|TN|TS|TR|UK|UA|UP|WB"
)

# Standard Indian License Plate: State (2 letters) + RTO (1-2 digits) + Series (0-3 letters) + Number (4 digits)
# Examples: DL01AB1234, MH 12 CD 5678, HR-26-DQ-9999, KA05M1234
PLATE_STANDARD_REGEX = re.compile(rf"^({INDIAN_STATES})[0-9]{{1,2}}[A-Z]{{0,3}}[0-9]{{4}}$", re.IGNORECASE)
# Bharat Series (BH) plate: Year (2 digits) + BH + 4 digits + 1-2 letters
PLATE_BHARAT_REGEX = re.compile(r"^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$", re.IGNORECASE)

# PAN Card: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$", re.IGNORECASE)

# Aadhaar: 12 digits, often formatted as 4-4-4
AADHAAR_REGEX = re.compile(r"^[2-9][0-9]{3}[0-9]{4}[0-9]{4}$")

# Indian Mobile: 10 digits starting with 6, 7, 8, 9
PHONE_REGEX = re.compile(r"^(?:(?:\+91|91|0)[ -]?)?([6-9][0-9]{9})$")

# Driving License (generic state code + 11-15 digits)
DL_REGEX = re.compile(rf"^({INDIAN_STATES})[0-9]{{11,15}}$", re.IGNORECASE)


class OCRService:
    _engine = None

    @classmethod
    def get_engine(cls):
        """Lazy-initialize RapidOCR ONNX engine."""
        if cls._engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                cls._engine = RapidOCR()
                logger.info("[OCRService] RapidOCR ONNX engine loaded successfully.")
            except Exception as e:
                logger.error(f"[OCRService] Failed to initialize RapidOCR: {e}")
                return None
        return cls._engine

    @staticmethod
    def normalize_plate_text(raw_text: str) -> str:
        """
        Cleans and normalizes common OCR character confusions on Indian license plates.
        E.g., spaces/hyphens removed, 'IND' HSRP prefix stripped, 'O' -> '0' in digits, '8' -> 'B' in letters.
        """
        cleaned = re.sub(r"[\s\.\-_/:\;]+", "", raw_text).upper()
        if cleaned.startswith("IND") and len(cleaned) > 5:
            cleaned = cleaned[3:]

        if len(cleaned) < 6:
            return cleaned

        # Fix first two characters if numbers were read instead of state letters
        chars = list(cleaned)
        if chars[0] == "0":
            chars[0] = "D"
        if len(chars) > 1 and chars[1] == "0":
            chars[1] = "L"

        return "".join(chars)

    @classmethod
    def scan_for_sensitive_regions(cls, image_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Runs RapidOCR on image bytes, checks detected text against Indian
        license plates and PII patterns (Aadhaar, PAN, Phone), and returns
        bounding boxes formatted for PressWire selective redaction.
        """
        engine = cls.get_engine()
        if engine is None or not image_bytes:
            return []

        try:
            results, _ = engine(image_bytes)
        except Exception as e:
            logger.error(f"[OCRService] OCR inference failed: {e}")
            return []

        if not results:
            return []

        detected_regions = []

        for box, text, score in results:
            try:
                num_score = float(score)
            except (ValueError, TypeError):
                num_score = 0.0

            if not text or num_score < 0.40:
                continue

            raw_str = text.strip()
            clean_str = re.sub(r"[\s\.\-_/:\;]+", "", raw_str).upper()
            plate_candidate = cls.normalize_plate_text(raw_str)

            kind = None
            label = None

            # 1. Check Indian Vehicle License Plate
            if PLATE_STANDARD_REGEX.match(plate_candidate) or PLATE_BHARAT_REGEX.match(plate_candidate):
                kind = "license_plate"
                label = f"Vehicle Plate: {raw_str.upper()}"
            # 2. Check PAN Card
            elif PAN_REGEX.match(clean_str):
                kind = "pii_document"
                label = f"PAN Card: {clean_str[:5]}****"
            # 3. Check Aadhaar Card
            elif AADHAAR_REGEX.match(clean_str):
                kind = "pii_document"
                label = f"Aadhaar: **** **** {clean_str[-4:]}"
            # 4. Check Phone Number
            elif PHONE_REGEX.match(raw_str):
                kind = "pii_document"
                label = f"Phone: {clean_str[-10:-4]}****"
            # 5. Check Driving License
            elif DL_REGEX.match(clean_str):
                kind = "pii_document"
                label = f"Driving License: {clean_str[:4]}****"

            if kind:
                # Convert 4-point polygon [[x1,y1],[x2,y2],[x3,y3],[x4,y4]] to [x, y, w, h]
                try:
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    min_x = max(0, int(min(xs)))
                    min_y = max(0, int(min(ys)))
                    max_x = int(max(xs))
                    max_y = int(max(ys))
                    box_w = max(1, max_x - min_x)
                    box_h = max(1, max_y - min_y)

                    # Add subtle 5% padding around text box for clean visual redaction
                    pad_x = int(box_w * 0.05)
                    pad_y = int(box_h * 0.08)
                    final_x = max(0, min_x - pad_x)
                    final_y = max(0, min_y - pad_y)
                    final_w = box_w + (pad_x * 2)
                    final_h = box_h + (pad_y * 2)

                    detected_regions.append({
                        "x": final_x,
                        "y": final_y,
                        "w": final_w,
                        "h": final_h,
                        "is_redacted": True,
                        "label": label,
                        "kind": kind,
                        "detected_text": raw_str,
                        "confidence": round(float(score), 3),
                    })
                except Exception as box_err:
                    logger.warning(f"[OCRService] Box conversion error: {box_err}")

        return detected_regions
