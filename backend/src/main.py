from fastapi import FastAPI
from api.routes import customer, credits, payments, dashboard, merchant, public, audit
from core.config import settings
from fastapi.middleware.cors import CORSMiddleware
import db.events  # Register SQLAlchemy events
from services.bcv_rate import origin_from_url


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

_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    settings.FRONTEND_URL,
    "https://registre-payment-shopify-form.onrender.com",
    "https://shopify-credit-app-page.onrender.com",
]
_page_origin = origin_from_url(settings.PUBLIC_PAGE_URL)
if _page_origin and _page_origin not in _cors_origins:
    _cors_origins.append(_page_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _cors_origins if o],
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)?(admin\.shopify\.com|myshopify\.com|trycloudflare\.com|loca\.lt|ngrok\.io|ngrok-free\.app|onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API running correctly, routers loaded!"}
