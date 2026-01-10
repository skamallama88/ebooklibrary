import os
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine
from .config import settings

DATABASE_URL = settings.database_url

# Create engine with connection pooling configuration
engine = create_engine(
    DATABASE_URL,
    pool_size=10,              # Number of connections to maintain in the pool
    max_overflow=20,           # Maximum number of connections that can be created beyond pool_size
    pool_pre_ping=True,        # Verify connection health before using
    pool_recycle=3600,         # Recycle connections after 1 hour
    echo=False                 # Set to True for SQL query logging (debug only)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
