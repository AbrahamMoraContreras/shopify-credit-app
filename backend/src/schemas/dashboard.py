# app/schemas/dashboard.py
from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

# -------------------------------
# Créditos
# -------------------------------
class DashboardCredits(BaseModel):
    total: int
    active: int
    morose: int


# -------------------------------
# Montos financieros
# -------------------------------
class DashboardAmounts(BaseModel):
    total_emitted: Decimal
    total_pending: Decimal
    total_collected: Decimal
    overdue: Decimal


# -------------------------------
# Clientes
# -------------------------------
class DashboardCustomers(BaseModel):
    total_customers: int
    with_morosity: int


# -------------------------------
# Riesgo y desempeño
# -------------------------------
class DashboardRisk(BaseModel):
    collection_ratio: float
    morosity_ratio: float
    avg_days_late: Optional[float] = None


# -------------------------------
# Pagos
# -------------------------------
class DashboardPayments(BaseModel):
    pending_review: int
    approved_today: int


# -------------------------------
# Dashboard completo
# -------------------------------
class DashboardResponse(BaseModel):
    credits: DashboardCredits
    amounts: DashboardAmounts
    customers: DashboardCustomers
    risk: DashboardRisk
    payments: DashboardPayments
    generated_at: date
