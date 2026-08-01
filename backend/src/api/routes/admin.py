from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from core.config import settings
from core.dependencies import get_db
from services.morosity import process_morosity


router = APIRouter(prefix="/morosity", tags=["Morosity"])


@router.post("/run", summary="Procesar cuotas vencidas y marcar créditos MOROSO")
def run_morosity(
    db: Session = Depends(get_db),
    x_internal_secret: str | None = Header(None),
):
    """
    Endpoint interno (cron / ops). Protegido con X-Internal-Secret.
    Marca cuotas PENDIENTE con due_date < hoy como VENCIDA y sus créditos como MOROSO.
    """
    if x_internal_secret != settings.INTERNAL_AUTH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal secret",
        )

    count = process_morosity(db)
    return {
        "processed_installments": count,
        "status": "ok",
    }
