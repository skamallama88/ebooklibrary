from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from . import models, database
from .services import auth as auth_service
from .routers import books, auth, collections, tags, progress, bookmarks, utilities, users, ai, ai_templates
from .middleware import limiter, rate_limit_exceeded_handler
from .logging_config import setup_logging, get_logger
from .config import settings
from .exceptions import BookLibraryException
from sqlalchemy.orm import Session
import os
import uuid

# Setup logging
setup_logging(settings.log_level)
logger = get_logger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ebook Library API", version="0.1.0")

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add request ID middleware
@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    """Add unique request ID to each request for tracking"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Global exception handler for custom exceptions
@app.exception_handler(BookLibraryException)
async def custom_exception_handler(request: Request, exc: BookLibraryException):
    """Handle all custom application exceptions with consistent format"""
    logger.error(
        f"Request {getattr(request.state, 'request_id', 'unknown')} failed: {exc.message}",
        exc_info=True
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.on_event("startup")
async def seed_data():
    db = database.SessionLocal()
    try:
        # Check if we should force-reset the admin password
        reset_admin = settings.reset_admin_password
        
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
allow_all = settings.allow_all_origins

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://localhost:5174",  # Vite dev server
    "http://localhost:7300",  # Production frontend port
    settings.frontend_url,
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
