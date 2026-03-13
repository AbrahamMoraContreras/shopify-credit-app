from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import APIRouter, Depends
from core.dependencies import get_db
from services.morosity import process_morosity


router = APIRouter(prefix="/morosity", tags=["Morosity"])

@router.post("/morosity/run")
def run_morosity(
    db: Session = Depends(get_db)
):
    count = process_morosity(db)
    return {
        "processed_installments": count,
        "status": "ok"
    }
