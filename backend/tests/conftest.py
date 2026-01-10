"""
Shared test fixtures and configuration for pytest.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from faker import Faker

from app.database import Base, get_db
from app.main import app
from app import models
from app.services.auth import get_password_hash, create_access_token


# Initialize faker
fake = Faker()


@pytest.fixture(scope="function")
def test_db():
    """
    Create a fresh in-memory SQLite database for each test.
    Fast and isolated.
    """
    # Create in-memory database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """
    FastAPI test client with database dependency overridden.
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db):
    """
    Create a regular test user.
    """
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        is_active=True,
        is_admin=False
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_admin(test_db):
    """
    Create an admin test user.
    """
    admin = models.User(
        username="testadmin",
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass123"),
        is_active=True,
        is_admin=True
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)
    return admin


@pytest.fixture
def auth_headers(test_user):
    """
    Get authentication headers for regular user.
    """
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(test_admin):
    """
    Get authentication headers for admin user.
    """
    token = create_access_token(data={"sub": test_admin.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_book(test_db, test_user):
    """
    Create a test book.
    """
    book = models.Book(
        title="Test Book",
        author="Test Author",
        file_path="/test/path/book.epub",
        file_size=1024000,
        format="epub",
        uploaded_by=test_user.id
    )
    test_db.add(book)
    test_db.commit()
    test_db.refresh(book)
    return book


@pytest.fixture
def test_tag(test_db):
    """
    Create a test tag.
    """
    tag = models.Tag(
        name="test_tag",
        tag_type="genre"
    )
    test_db.add(tag)
    test_db.commit()
    test_db.refresh(tag)
    return tag
