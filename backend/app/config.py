"""
Application configuration using Pydantic settings.
Validates environment variables at startup and provides type-safe access.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Database Configuration
    database_url: str = "postgresql+psycopg2://ebookuser:ebookpass@localhost:5432/ebooklibrary"
    postgres_user: str = "ebookuser"
    postgres_password: str = "ebookpass"
    postgres_db: str = "ebooklibrary"
    
    # Security Configuration (REQUIRED in production)
    jwt_secret: str = "your-secret-key-for-dev-only-change-this"
    secret_key: Optional[str] = None
    
    # CORS Configuration
    frontend_url: str = "http://localhost:3000"
    allow_all_origins: bool = False
    
    # Storage Paths
    book_storage_path: str = "/data/books"
    cover_storage_path: str = "/data/covers"
    
    # Logging
    log_level: str = "INFO"
    
    # Admin Reset
    reset_admin_password: bool = False
    
    @property
    def effective_jwt_secret(self) -> str:
        """Get the effective JWT secret, preferring JWT_SECRET over SECRET_KEY."""
        if self.jwt_secret and self.jwt_secret != "your-secret-key-for-dev-only-change-this":
            return self.jwt_secret
        if self.secret_key:
            return self.secret_key
        return self.jwt_secret  # Return default (will trigger warning)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.effective_jwt_secret != "your-secret-key-for-dev-only-change-this"


# Global settings instance
settings = Settings()
