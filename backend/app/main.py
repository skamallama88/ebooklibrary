from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from . import models, database
from .services import auth as auth_service
from .routers import books, auth, collections, progress, users, utilities, tags
from .middleware import limiter, rate_limit_exceeded_handler
from sqlalchemy.orm import Session
import os

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

# Handle schema migrations for existing tables
from sqlalchemy import text
with database.engine.connect() as conn:
    try:
        # Check if column exists in Postgres
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='recently_read_limit_days'"))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE users ADD COLUMN recently_read_limit_days INTEGER DEFAULT 30"))
            conn.commit()
            print("Successfully added recently_read_limit_days column to users table")
            
        # Check for word_count in books
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='books' AND column_name='word_count'"))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE books ADD COLUMN word_count INTEGER"))
            conn.commit()
            print("Successfully added word_count column to books table")
            
    except Exception as e:
        print(f"Migration error: {e}")

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
            print("🚀 Default admin user created: admin / admin")
        elif reset_admin:
            admin_user.hashed_password = auth_service.get_password_hash("admin")
            db.commit()
            print("🔄 Admin password force-reset to 'admin'")
        else:
            print("ℹ️ Admin user exists. Use RESET_ADMIN_PASSWORD=true to reset credentials on startup.")
    except Exception as e:
        print(f"❌ Error during startup seeding: {e}")
    finally:
        db.close()

# CORS configuration with environment-based origins
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allow_all = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true"

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5174",  # Vite dev server
    frontend_url,
]

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

@app.get("/")
async def root():
    return {"message": "Ebook Library API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
