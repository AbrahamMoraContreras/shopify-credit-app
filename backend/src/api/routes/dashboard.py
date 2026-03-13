from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends
from core.dependencies import get_db, get_merchant_id
from crud import dashboard as dashboard_crud
from core.cache import get_dashboard_cache, set_dashboard_cache

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    cached = get_dashboard_cache(merchant_id)
    if cached:
        return cached

    data = dashboard_crud.dashboard_snapshot(db, merchant_id)
    set_dashboard_cache(merchant_id, data)

    return data

