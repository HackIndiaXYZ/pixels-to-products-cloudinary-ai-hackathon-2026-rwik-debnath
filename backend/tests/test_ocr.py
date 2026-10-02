import pytest
from app.services.ocr_service import (
    OCRService,
    PLATE_STANDARD_REGEX,
    PLATE_BHARAT_REGEX,
    PAN_REGEX,
    AADHAAR_REGEX,
    PHONE_REGEX
)

def test_indian_plate_regex():
    # Valid plates across Indian states
    valid_plates = [
        "DL01AB1234",
        "MH12CD5678",
        "KA05M1234",
        "HR26DQ9999",
        "UP16Z0001",
        "GJ01AA0001",
        "TN09B1111",
        "WB02AB9876",
        "22BH1234AA"
    ]
    for plate in valid_plates:
        norm = OCRService.normalize_plate_text(plate)
        assert PLATE_STANDARD_REGEX.match(norm) or PLATE_BHARAT_REGEX.match(norm), f"Failed on: {plate}"

def test_pii_regex():
    # PAN Card
    assert PAN_REGEX.match("ABCDE1234F")
    assert not PAN_REGEX.match("12345ABCDE")

    # Aadhaar Card
    assert AADHAAR_REGEX.match("234567890123")
    assert not AADHAAR_REGEX.match("123456789012")  # Aadhaar never starts with 0 or 1

    # Phone number
    assert PHONE_REGEX.match("9876543210")
    assert PHONE_REGEX.match("+91 9876543210")

def test_ocr_service_empty_input():
    result = OCRService.scan_for_sensitive_regions(b"")
    assert result == []
