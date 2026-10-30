"""
CNIC OCR Backend — FastAPI Application

Implements the field-aware OCR pipeline:
1. Normalizes card boundary and perspective.
2. Applies CLAHE enhancement and unsharp masking.
3. Performs Pass 1 full-card OCR.
4. Uses relative region matching and strict field validators.
5. Performs targeted crop OCR fallback for any missing or invalid field.
6. Returns structured 8-field JSON.
"""

import os
import uuid
import logging
from pathlib import Path
import cv2
import numpy as np

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ocr_engine import run_ocr
from .preprocessor import normalize_card_image, enhance_card_image
from .parser import parse_cnic_fields
from .dls_parser import parse_dls_fields

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"}

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CNIC OCR Backend",
    description="Field-aware Pakistani CNIC OCR Service",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("cnic-ocr")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    """Health-check endpoint."""
    return {"status": "CNIC OCR backend is running", "version": "0.2.0"}


@app.post("/scan-cnic")
async def scan_cnic(file: UploadFile = File(...)):
    """
    Receive a CNIC image, normalize, preprocess, run targeted OCR,
    and return the structured 8-field result.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        raw_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if raw_img is None or raw_img.size == 0:
            raise HTTPException(status_code=400, detail="Invalid image file or format.")

        # 1. Card normalization (perspective correction + standard working resolution 1000x630)
        normalized_card = normalize_card_image(raw_img)

        # 2. Contrast enhancement (CLAHE + unsharp mask)
        enhanced_card = enhance_card_image(normalized_card)

        # 3. Pass 1: Full-card OCR on preprocessed card
        ocr_result = run_ocr(enhanced_card)

        # 4. Region-aware parser + targeted crop OCR fallback
        parsed_data = parse_cnic_fields(
            normalized_card=enhanced_card,
            pass1_ocr_results=ocr_result.get("results", []),
            ocr_runner=run_ocr,
        )

        # 5. Fallback pass on un-sharpened normalized_card if core identity fields are still missing
        # (Helps when CLAHE/unsharp masking amplifies guilloche or glare on imperfectly lit cards)
        if not parsed_data.get("cnic") or not parsed_data.get("name"):
            raw_ocr_result = run_ocr(normalized_card)
            raw_results = raw_ocr_result.get("results", [])
            if raw_results:
                fallback_parsed = parse_cnic_fields(
                    normalized_card=normalized_card,
                    pass1_ocr_results=raw_results,
                    ocr_runner=None,
                )
                for k, v in fallback_parsed.items():
                    if v and not parsed_data.get(k):
                        parsed_data[k] = v
                if not ocr_result.get("results"):
                    ocr_result = raw_ocr_result

        extracted_keys = [
            k for k in ("name", "fatherName", "cnic", "gender", "dateOfBirth", "dateOfIssue", "dateOfExpiry")
            if parsed_data.get(k)
        ]
        if extracted_keys:
            logger.info(
                "CNIC scan completed: boxes=%d, extracted_fields=%s",
                len(ocr_result.get("results", [])),
                extracted_keys,
            )
        else:
            logger.warning(
                "CNIC scan extracted zero fields: image_shape=%s, boxes=%d, raw_texts=%s",
                raw_img.shape,
                len(ocr_result.get("results", [])),
                ocr_result.get("text", [])[:10],
            )

        return {
            "success": True,
            "parsed": {
                "name": parsed_data.get("name", ""),
                "fatherName": parsed_data.get("fatherName", ""),
                "gender": parsed_data.get("gender", ""),
                "countryOfStay": parsed_data.get("countryOfStay", ""),
                "cnic": parsed_data.get("cnic", ""),
                "dateOfBirth": parsed_data.get("dateOfBirth", ""),
                "dateOfIssue": parsed_data.get("dateOfIssue", ""),
                "dateOfExpiry": parsed_data.get("dateOfExpiry", ""),
                "cnicIdentification": parsed_data.get("cnicIdentification", ""),
                # Aliases for backward compatibility
                "fullName": parsed_data.get("fullName", parsed_data.get("name", "")),
                "fatherHusbandName": parsed_data.get("fatherHusbandName", parsed_data.get("fatherName", "")),
                "cnicNumber": parsed_data.get("cnicNumber", parsed_data.get("cnic", "")),
            },
            "text": ocr_result.get("text", []),
            "results": ocr_result.get("results", []),
            "details": ocr_result.get("details", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("OCR processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/scan-dls")
async def scan_dls(file: UploadFile = File(...)):
    """
    Receive a Driving License Sindh image, normalize, preprocess,
    run OCR, parse DLS fields, and return structured 8-field result.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        raw_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if raw_img is None or raw_img.size == 0:
            raise HTTPException(status_code=400, detail="Invalid image file or format.")

        # 1. Card normalization (perspective correction + standard working resolution 1000x630)
        normalized_card = normalize_card_image(raw_img)

        # 2. Contrast enhancement (CLAHE + unsharp mask)
        enhanced_card = enhance_card_image(normalized_card)

        # 3. Full-card OCR on preprocessed DLS card
        ocr_result = run_ocr(enhanced_card)

        # 4. DLS field parser
        parsed_data = parse_dls_fields(
            normalized_card=enhanced_card,
            ocr_results=ocr_result.get("results", []),
        )

        return {
            "success": True,
            "parsed": {
                "licenseNumber": parsed_data.get("licenseNumber", ""),
                "fullName": parsed_data.get("fullName", ""),
                "fatherHusbandName": parsed_data.get("fatherHusbandName", ""),
                "dateOfBirth": parsed_data.get("dateOfBirth", ""),
                "category": parsed_data.get("category", ""),
                "issueDate": parsed_data.get("issueDate", ""),
                "validUpto": parsed_data.get("validUpto", ""),
                "licensingAuthority": parsed_data.get("licensingAuthority", ""),
            },
            "text": ocr_result.get("text", []),
            "results": ocr_result.get("results", []),
            "details": ocr_result.get("details", []),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("DLS OCR processing failed")
        raise HTTPException(status_code=500, detail=f"DLS OCR processing failed: {str(e)}")

