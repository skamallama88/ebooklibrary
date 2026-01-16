import pytest
from sqlalchemy.orm import Session
from app import models
from app.services.tag_import import TagImportService

def test_process_metadata_to_tags(test_db: Session):
    # Setup: create a book
    book = models.Book(
        title="Test Book",
        file_path="/data/books/test.epub",
        format="EPUB"
    )
    test_db.add(book)
    test_db.commit()
    test_db.refresh(book)

    metadata = {
        "authors": ["Stephen King", "Peter Straub"],
        "tags": ["Horror", "Dark Fantasy"],
        "series": "The Talisman",
        "language": "en",
        "format": "EPUB",
        "publisher": "Viking"
    }

    tag_service = TagImportService(test_db)
    tags = tag_service.process_metadata_to_tags(book.id, metadata)

    assert len(tags) == 8  # 2 authors + 2 genres + 1 series + 1 language + 1 format + 1 publisher
    
    # Check specific tags
    tag_names = [t.name for t in tags]
    assert "stephen_king" in tag_names
    assert "peter_straub" in tag_names
    assert "horror" in tag_names
    assert "dark_fantasy" in tag_names
    assert "the_talisman" in tag_names
    assert "en" in tag_names
    assert "epub" in tag_names
    assert "viking" in tag_names

    # Check types
    tag_map = {t.name: t.type for t in tags}
    assert tag_map["stephen_king"] == "author"
    assert tag_map["horror"] == "genre"
    assert tag_map["the_talisman"] == "series"
    assert tag_map["en"] == "language"
    assert tag_map["epub"] == "format"
    assert tag_map["viking"] == "meta"

    # Verify association with book
    assert len(book.tags) == 8
    assert all(t in book.tags for t in tags)

def test_duplicate_tag_import(test_db: Session):
    # Setup: create a book
    book = models.Book(
        title="Test Book 2",
        file_path="/data/books/test2.epub",
        format="EPUB"
    )
    test_db.add(book)
    test_db.commit()
    
    metadata = {
        "authors": ["Stephen King"],
        "tags": ["Horror"]
    }

    tag_service = TagImportService(test_db)
    
    # First import
    tag_service.process_metadata_to_tags(book.id, metadata)
    assert len(book.tags) == 2
    
    # Second import (should not duplicate)
    tag_service.process_metadata_to_tags(book.id, metadata)
    test_db.refresh(book)
    assert len(book.tags) == 2
