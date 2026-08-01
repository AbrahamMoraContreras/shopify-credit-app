from fastapi import FastAPI
from api.routes import customer, credits, payments, dashboard, merchant, public, audit, admin
from core.config import settings
from fastapi.middleware.cors import CORSMiddleware
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
app.include_router(audit.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
        "https://registre-payment-shopify-form.onrender.com",
    ],
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)?(admin\.shopify\.com|myshopify\.com|trycloudflare\.com|loca\.lt|ngrok\.io|ngrok-free\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API running correctly, routers loaded!"}
