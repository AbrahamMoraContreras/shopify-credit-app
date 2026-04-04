# backend/app/api/routes/customer.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from sqlalchemy.orm import Session

from core.dependencies import get_db, get_merchant_id
from schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from crud.customer import (
    create_customer,
    get_customer,
    update_customer,
    delete_customer,
    list_customers,
    get_customer_by_shopify_id
)

# Función temporal para obtener el merchant autenticado
def get_current_merchant():
    """
    Esta función será reemplazada por el sistema de autenticación real de Shopify.
    Por ahora retornamos un merchant falso para desarrollo.
    """
    class MerchantMock:
        id = "11111111-1111-1111-1111-111111111111"
    return MerchantMock()

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED
)
def api_create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    try:
        # Asignamos merchant_id automáticamente
        payload.merchant_id = merchant_id

        obj = create_customer(db=db, payload=payload)
        return obj

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get(
    "",
    response_model=List[CustomerResponse],
    status_code=status.HTTP_200_OK
)
def api_list_customers(
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    search: Optional[str] = Query(None, description="Nombre, email o documento"),
    shopify_customer_id: Optional[int] = Query(None, description="Filtrar por ID de Shopify")
):
    items, total = list_customers(
        db=db,
        merchant_id=merchant_id,
        skip=skip,
        limit=limit,
        search=search,
        shopify_customer_id=shopify_customer_id
    )
    return items

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def api_get_customer(
    customer_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    obj = get_customer(db=db, customer_id=customer_id)

    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Aislamiento: solo puedes ver clientes de tu propio merchant
    if str(obj.merchant_id) != str(merchant_id):
        raise HTTPException(status_code=403, detail="Forbidden: customer does not belong to your store")

    return obj

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def api_update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    obj = get_customer(db=db, customer_id=customer_id)

    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    if str(obj.merchant_id) != str(merchant_id):
        raise HTTPException(status_code=403, detail="Forbidden: customer does not belong to your store")

    try:
        updated = update_customer(db=db, db_obj=obj, updates=payload)
        return updated

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def api_delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    obj = get_customer(db=db, customer_id=customer_id)

    if not obj:
        raise HTTPException(status_code=404, detail="Customer not found")

    if str(obj.merchant_id) != str(merchant_id):
        raise HTTPException(status_code=403, detail="Forbidden: customer does not belong to your store")

    delete_customer(db=db, db_obj=obj)
    return None

@router.post(
    "/sync/shopify/{shopify_customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def api_sync_from_shopify(
    shopify_customer_id: int,
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    #Buscar si ya existe
    existing = get_customer_by_shopify_id(db=db, shopify_customer_id=shopify_customer_id, merchant_id=merchant_id)

    if existing:
        return existing

    placeholder = CustomerCreate(
        full_name=f"Shopify Customer {shopify_customer_id}",
        shopify_customer_id=shopify_customer_id,
        email=None,
        merchant_id=merchant_id
    )

    try:
        obj = create_customer(db, payload=placeholder)
        return obj

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.patch(
    "/shopify/{shopify_customer_id}/reset-balance",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def api_reset_favorable_balance(
    shopify_customer_id: int,
    db: Session = Depends(get_db),
    merchant_id: str = Depends(get_merchant_id)
):
    existing = get_customer_by_shopify_id(db=db, shopify_customer_id=shopify_customer_id, merchant_id=merchant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found in local database")
    
    existing.favorable_balance = 0
    db.commit()
    db.refresh(existing)
    
    return existing
