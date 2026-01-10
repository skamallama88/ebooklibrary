from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from . import models, database
from .services import auth as auth_service
from .routers import books, auth, collections, tags, progress, bookmarks, utilities, users, ai, ai_templates
from .middleware import limiter, rate_limit_exceeded_handler
from .logging_config import setup_logging, get_logger
from sqlalchemy.orm import Session
import os

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level)
logger = get_logger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ebook Library API", version="0.1.0")

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

@app.on_event("startup")
async def seed_data():
    db = database.SessionLocal()
    try:
        # Check if we should force-reset the admin password
        reset_admin = os.getenv("RESET_ADMIN_PASSWORD", "false").lower() == "true"
        
        # Create or update default admin user
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            hashed_password = auth_service.get_password_hash("admin")
            new_admin = models.User(
                username="admin",
                email="admin@example.com",
                hashed_password=hashed_password,
                is_active=True,
                is_admin=True
            )
            db.add(new_admin)
            db.commit()
            logger.info("Default admin user created successfully (username: admin, password: admin)")
        elif reset_admin:
            admin_user.hashed_password = auth_service.get_password_hash("admin")
            db.commit()
            logger.info("Admin password reset to default 'admin'")
        else:
            logger.info("Admin user already exists. Set RESET_ADMIN_PASSWORD=true to reset credentials.")
    except Exception as e:
        logger.error(f"Error during startup seeding: {e}", exc_info=True)
    finally:
        db.close()

# CORS configuration with environment-based origins
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allow_all = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true"

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://localhost:5174",  # Vite dev server
    "http://localhost:7300",  # Production frontend port
    frontend_url,
]

logger.debug(f"CORS configuration - Allow all origins: {allow_all}")
logger.debug(f"CORS configuration - Allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(tags.router)
app.include_router(collections.router)
app.include_router(progress.router)
app.include_router(users.router)
app.include_router(utilities.router)
app.include_router(ai.router)
app.include_router(ai_templates.router)

@app.get("/")
async def root():
    return {"message": "Ebook Library API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
