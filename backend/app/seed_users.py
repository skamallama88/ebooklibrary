"""
Seed script for creating test users in the ebook library.

This script creates:
- An admin user
- A regular test user

Run with: python -m app.seed_users
"""

import sys
import os
from sqlalchemy.orm import Session

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models, database
from app.services import auth as auth_service


def seed_users(db: Session):
    """Create test users if they don't exist"""
    
    # Create admin user
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        hashed_password = auth_service.get_password_hash("admin123")
        admin_user = models.User(
            username="admin",
            email="admin@example.com",
            hashed_password=hashed_password,
            is_active=True,
            is_admin=True,
            theme_preference="dark",
            font_size=16,
            font_family="serif",
            page_layout="paginated",
            notifications_enabled=True
        )
        db.add(admin_user)
        print("✓ Created admin user: username='admin', password='admin123'")
    else:
        print("ℹ Admin user already exists")
    
    # Create test user
    test_user = db.query(models.User).filter(models.User.username == "testuser").first()
    if not test_user:
        hashed_password = auth_service.get_password_hash("testpass123")
        test_user = models.User(
            username="testuser",
            email="test@example.com",
            hashed_password=hashed_password,
            is_active=True,
            is_admin=False,
            theme_preference="auto",
            font_size=14,
            font_family="sans-serif",
            page_layout="scrolled",
            notifications_enabled=True
        )
        db.add(test_user)
        print("✓ Created test user: username='testuser', password='testpass123'")
    else:
        print("ℹ Test user already exists")
    
    db.commit()
    print("\n✓ User seeding completed successfully!")


if __name__ == "__main__":
    # Create database tables if they don't exist
    models.Base.metadata.create_all(bind=database.engine)
    
    # Create a database session
    db = database.SessionLocal()
    try:
        seed_users(db)
    finally:
        db.close()
