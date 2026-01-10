"""
Tests for book management endpoints.
"""
import pytest
from fastapi import status
from app import models


@pytest.mark.unit
def test_create_book(test_db, test_user):
    """Test creating a book in database"""
    book = models.Book(
        title="Test Book",
        author="Test Author",
        file_path="/test/path.epub",
        file_size=1024000,
        format="epub",
        uploaded_by=test_user.id
    )
    
    test_db.add(book)
    test_db.commit()
    test_db.refresh(book)
    
    assert book.id is not None
    assert book.title == "Test Book"
    assert book.author == "Test Author"


@pytest.mark.integration
def test_get_books_list(client, auth_headers, test_book):
    """Test retrieving list of books"""
    response = client.get("/books/", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1


@pytest.mark.integration
def test_get_book_detail(client, auth_headers, test_book):
    """Test getting single book details"""
    response = client.get(f"/books/{test_book.id}", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_book.id
    assert data["title"] == test_book.title


@pytest.mark.integration
def test_get_nonexistent_book(client, auth_headers):
    """Test getting a book that doesn't exist"""
    response = client.get("/books/99999", headers=auth_headers)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
def test_update_book(client, auth_headers, test_book):
    """Test updating book metadata"""
    update_data = {
        "title": "Updated Title",
        "author": "Updated Author"
    }
    
    response = client.put(
        f"/books/{test_book.id}",
        json=update_data,
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["author"] == "Updated Author"


@pytest.mark.integration
def test_delete_book(client, auth_headers, test_book):
    """Test deleting a book"""
    book_id = test_book.id
    
    response = client.delete(f"/books/{book_id}", headers=auth_headers)
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify book is deleted
    response = client.get(f"/books/{book_id}", headers=auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.integration
def test_search_books_by_title(client, auth_headers, test_db, test_user):
    """Test searching books by title"""
    # Create multiple books
    books = [
        models.Book(
            title="Python Programming",
            author="Author 1",
            file_path=f"/test/book{i}.epub",
            file_size=1024000,
            format="epub",
            uploaded_by=test_user.id
        )
        for i in range(3)
    ]
    books.append(
        models.Book(
            title="JavaScript Guide",
            author="Author 2",
            file_path="/test/js.epub",
            file_size=1024000,
            format="epub",
            uploaded_by=test_user.id
        )
    )
    
    test_db.add_all(books)
    test_db.commit()
    
    # Search for "Python"
    response = client.get("/books/?search=Python", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] >= 3
    for item in data["items"]:
        assert "Python" in item["title"] or "python" in item["title"].lower()


@pytest.mark.unit
def test_book_tag_relationship(test_db, test_book, test_tag):
    """Test many-to-many relationship between books and tags"""
    # Add tag to book
    test_book.tags.append(test_tag)
    test_db.commit()
    
    # Verify relationship
    assert test_tag in test_book.tags
    assert test_book in test_tag.books


@pytest.mark.integration
def test_get_books_unauthorized(client):
    """Test that books endpoint requires authentication"""
    response = client.get("/books/")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
