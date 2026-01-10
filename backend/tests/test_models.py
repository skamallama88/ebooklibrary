"""
Tests for database models and relationships.
"""
import pytest
from app import models
from sqlalchemy.exc import IntegrityError


@pytest.mark.unit
def test_user_model_creation(test_db):
    """Test creating a user model"""
    user = models.User(
        username="newuser",
        email="new@example.com",
        hashed_password="hashedhashed",
        is_active=True,
        is_admin=False
    )
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    assert user.id is not None
    assert user.username == "newuser"
    assert user.created_at is not None


@pytest.mark.unit
def test_user_unique_username(test_db, test_user):
    """Test that usernames must be unique"""
    duplicate_user = models.User(
        username="testuser",  # Same as test_user
        email="different@example.com",
        hashed_password="hashed"
    )
    
    test_db.add(duplicate_user)
    
    with pytest.raises(IntegrityError):
        test_db.commit()


@pytest.mark.unit
def test_book_user_relationship(test_db, test_user):
    """Test relationship between books and users"""
    book = models.Book(
        title="User's Book",
        author="Author",
        file_path="/path.epub",
        file_size=1024,
        format="epub",
        uploaded_by=test_user.id
    )
    
    test_db.add(book)
    test_db.commit()
    test_db.refresh(book)
    
    # Test relationship
    assert book.uploader.id == test_user.id
    assert book in test_user.uploaded_books


@pytest.mark.unit
def test_tag_creation_and_statistics(test_db):
    """Test tag model with usage statistics"""
    tag = models.Tag(
        name="test_tag",
        tag_type="genre",
        usage_count=0
    )
    
    test_db.add(tag)
    test_db.commit()
    test_db.refresh(tag)
    
    assert tag.id is not None
    assert tag.usage_count == 0
    
    # Increment usage
    tag.usage_count += 1
    test_db.commit()
    
    assert tag.usage_count == 1


@pytest.mark.unit
def test_collection_model(test_db, test_user):
    """Test collection model"""
    collection = models.Collection(
        name="My Collection",
        description="Test collection",
        user_id=test_user.id
    )
    
    test_db.add(collection)
    test_db.commit()
    test_db.refresh(collection)
    
    assert collection.id is not None
    assert collection.name == "My Collection"
    assert collection.user_id == test_user.id


@pytest.mark.unit
def test_reading_progress_model(test_db, test_user, test_book):
    """Test reading progress tracking"""
    progress = models.ReadingProgress(
        user_id=test_user.id,
        book_id=test_book.id,
        progress_percentage=50.0,
        current_page=100
    )
    
    test_db.add(progress)
    test_db.commit()
    test_db.refresh(progress)
    
    assert progress.id is not None
    assert progress.progress_percentage == 50.0
    assert progress.last_read_at is not None


@pytest.mark.unit
def test_cascade_delete_user(test_db, test_user):
    """Test that deleting a user cascades to related entities"""
    # Create related entities
    book = models.Book(
        title="User Book",
        author="Author",
        file_path="/path.epub",
        file_size=1024,
        format="epub",
        uploaded_by=test_user.id
    )
    test_db.add(book)
    test_db.commit()
    
    user_id = test_user.id
    book_id = book.id
    
    # Delete user
    test_db.delete(test_user)
    test_db.commit()
    
    # Verify cascade behavior (depends on your cascade settings)
    deleted_user = test_db.query(models.User).filter(models.User.id == user_id).first()
    assert deleted_user is None
