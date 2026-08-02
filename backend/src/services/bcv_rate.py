import re
import urllib.request
from typing import Optional
from urllib.parse import urlparse

from fastapi import HTTPException
from pydantic import BaseModel

BCV_SPREADSHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x"
    "/pub?output=csv"
)


class BcvRateResponse(BaseModel):
    rate: float
    fecha: Optional[str] = None
    source: str = "bcv_spreadsheet"


def fetch_bcv_rate() -> BcvRateResponse:
    """
    Server-side fetch of the official Bs/USD rate from the published spreadsheet.
    Avoids browser CORS/adblock issues on the public payment page.
    """
    req = urllib.request.Request(
        BCV_SPREADSHEET_CSV_URL,
        headers={"User-Agent": "FiameCreditApp/1.0 (bcv-rate)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            text = resp.read().decode("utf-8", "replace")
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo obtener la tasa BCV: {e}",
        ) from e

    lines = [l for l in text.strip().splitlines() if l.strip()]
    if not lines:
        raise HTTPException(status_code=502, detail="CSV de tasa BCV vacío")

    last_line = lines[-1]
    match = re.search(r'"([\d.,]+)\s*Bs\."', last_line)
    if not match:
        match = re.search(r"([\d.,]+)\s*Bs\.?", last_line)
    if not match:
        raise HTTPException(
            status_code=502,
            detail="No se pudo interpretar la tasa BCV del CSV",
        )

    raw = match.group(1).replace(".", "").replace(",", ".")
    try:
        rate = float(raw)
    except ValueError as e:
        raise HTTPException(status_code=502, detail="Tasa BCV inválida") from e

    if rate <= 0:
        raise HTTPException(status_code=502, detail="Tasa BCV inválida")

    date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", last_line)
    fecha = date_match.group(1) if date_match else None

    return BcvRateResponse(rate=rate, fecha=fecha)


def origin_from_url(url: str) -> str:
    """Extract scheme://host[:port] from a full URL (e.g. PUBLIC_PAGE_URL)."""
    if not url:
        return ""
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"
