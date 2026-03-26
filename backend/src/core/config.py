from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine the project root as being two levels up from this file (src/core/config.py)
# src/core/config.py -> core -> src -> backend
PROJECT_ROOT = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    # Entorno
    ENV: str = Field("dev")

    # Base de datos (individual fields - only needed for local dev fallback)
    POSTGRES_USER: str = Field(default="")
    POSTGRES_PASSWORD: str = Field(default="")
    POSTGRES_DB: str = Field(default="")
    POSTGRES_HOST: str = Field(default="")
    POSTGRES_PORT: int = Field(default=5432)

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Shopify
    SHOPIFY_API_KEY: str = Field(default="")
    SHOPIFY_API_SECRET: str = Field(default="")

    # JWT Authentication
    INTERNAL_AUTH_SECRET: str = Field(default="my-internal-secret-change-in-prod")
    JWT_ACCESS_TOKEN_SECRET: str = Field(default="this-is-a-super-secret-key-change-it")
    JWT_REFRESH_TOKEN_SECRET: str = Field(default="this-is-a-super-secret-refresh-key-change-it")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # Resend
    RESEND_API_KEY: str = Field(default="")
    RESEND_FROM_EMAIL: str = Field(default="onboarding@resend.dev")

    # URL Pública para recordatorios
    PUBLIC_PAGE_URL: str = Field(default="http://localhost:5173/pago")

    # URL del Frontend (para CORS)
    FRONTEND_URL: str = Field(default="http://localhost:5173")

    # URL de base de datos (Render proporciona DATABASE_URL)
    DATABASE_URL: str = Field(default="")

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Returns the SQLAlchemy connection string."""
        if self.DATABASE_URL:
            # Render provides 'postgres://', but SQLAlchemy requires 'postgresql://'
            # Also ensure we use the psycopg2 driver for consistency
            if self.DATABASE_URL.startswith("postgres://"):
                return self.DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
            return self.DATABASE_URL
        
        # Local fallback using individual components
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
