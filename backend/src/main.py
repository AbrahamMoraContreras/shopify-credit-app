from fastapi import FastAPI
from api.routes import customer, credits, payments, dashboard, merchant, public
from core.dependencies import get_db
from core.config import settings
from crud.payment import create_payment
from fastapi.middleware.cors import CORSMiddleware
from models.audit_log import AuditLog
import db.events  # Register SQLAlchemy events


app = FastAPI(
    title="Credit System API",
    version="1.0.0"
)

# Registrar routers
app.include_router(credits.router, prefix="/api")
app.include_router(customer.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(merchant.router, prefix="/api")
app.include_router(public.router, prefix="/api")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
    ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API running correctly, routers loaded!"}
