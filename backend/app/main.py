from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models, database
from .services import auth as auth_service
from .routers import books, auth, collections, progress, bookmarks
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Ebook Library API", version="0.1.0")

@app.on_event("startup")
async def seed_data():
    db = database.SessionLocal()
    try:
        # Create default admin user if none exists
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
            print("Default admin user created: admin / admin")
    finally:
        db.close()

# ... existing middleware ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(collections.router)
app.include_router(progress.router)
app.include_router(bookmarks.router)

@app.get("/")
async def root():
    return {"message": "Ebook Library API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
