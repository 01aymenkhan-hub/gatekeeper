"""
OCR Engine — PaddleOCR wrapper

Initializes PaddleOCR once and exposes a clean `run_ocr()` function
that accepts either an image file path (str) or an in-memory numpy array.

Optimizations:
- Disables slow doc unwarping and doc orientation classify (cuts CPU latency dramatically).
- Supports PaddleOCR 3.x and 2.x return schemas.
"""

from __future__ import annotations

import logging
from typing import Any, Union
import numpy as np
from paddleocr import PaddleOCR

logger = logging.getLogger("cnic-ocr.engine")

# ---------------------------------------------------------------------------
# Initialise PaddleOCR (singleton — created once at import time)
# ---------------------------------------------------------------------------
_ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en",
    device="cpu",
)


def run_ocr(image_input: Union[str, np.ndarray]) -> dict[str, Any]:
    """
    Run PaddleOCR on the given image path or numpy ndarray.

    Parameters
    ----------
    image_input : str or np.ndarray
        Absolute path to an image file or a BGR numpy array.

    Returns
    -------
    dict with keys:
        success : bool
        text    : list[str]          – plain detected text lines
        results : list[dict]         – text + confidence + bounding box
        details : list[dict]         – alias of results
    """
    result = _ocr.ocr(image_input)

    text_lines: list[str] = []
    details: list[dict[str, Any]] = []

    if not result:
        return {"success": True, "text": [], "results": [], "details": []}

    item = result[0]

    # ── PaddleOCR 3.x structure (dict with rec_texts, rec_scores, rec_polys) ──
    if isinstance(item, dict):
        rec_texts = item.get("rec_texts", [])
        rec_scores = item.get("rec_scores", [])
        rec_polys = item.get("rec_polys", item.get("dt_polys", []))

        for i, text in enumerate(rec_texts):
            score = float(rec_scores[i]) if i < len(rec_scores) else 1.0
            bbox = rec_polys[i] if i < len(rec_polys) else []
            if hasattr(bbox, "tolist"):
                bbox = bbox.tolist()

            text_lines.append(text)
            details.append({
                "text": text,
                "confidence": round(float(score), 4),
                "bbox": bbox,
            })

    # ── PaddleOCR 2.x structure (list of [[bbox], (text, score)]) ──
    elif isinstance(item, list):
        for detection in item:
            bbox = detection[0]
            if hasattr(bbox, "tolist"):
                bbox = bbox.tolist()
            text = str(detection[1][0])
            confidence = float(detection[1][1])

            text_lines.append(text)
            details.append({
                "text": text,
                "confidence": round(confidence, 4),
                "bbox": bbox,
            })

    return {
        "success": True,
        "text": text_lines,
        "results": details,
        "details": details,
    }
