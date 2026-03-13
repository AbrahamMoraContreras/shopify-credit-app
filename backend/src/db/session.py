from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings   # <-- CORRECTO

# ---------------------------
# Engine
# ---------------------------
engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
    future=True
)

# ---------------------------
# Session Local
# ---------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
