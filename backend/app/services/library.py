import os
from sqlalchemy.orm import Session
from .. import models, schemas
from .metadata import extract_metadata
from datetime import datetime

BOOK_STORAGE_PATH = os.getenv("BOOK_STORAGE_PATH", "/data/books")

def scan_library(db: Session):
    for root, dirs, files in os.walk(BOOK_STORAGE_PATH):
        for file in files:
            if file.lower().endswith(('.epub', '.pdf')):
                file_path = os.path.join(root, file)
                import_book(db, file_path)

def import_book(db: Session, file_path: str):
    # Check if book already exists
    db_book = db.query(models.Book).filter(models.Book.file_path == file_path).first()
    if db_book:
        return db_book

    # Extract metadata
    metadata = extract_metadata(file_path)
    
    # Create or get authors
    authors = []
    for author_name in metadata.get("authors", []):
        author = db.query(models.Author).filter(models.Author.name == author_name).first()
        if not author:
            author = models.Author(name=author_name)
            db.add(author)
            db.flush()
        authors.append(author)
    
    # Create or get tags
    tags = []
    for tag_name in metadata.get("tags", []):
        tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
        if not tag:
            tag = models.Tag(name=tag_name)
            db.add(tag)
            db.flush()
        tags.append(tag)
        
    # Create book record
    new_book = models.Book(
        title=metadata.get("title", os.path.basename(file_path)),
        file_path=file_path,
        cover_path=metadata.get("cover_path"),
        format=metadata.get("format"),
        file_size=metadata.get("file_size"),
        description=metadata.get("description"),
        publisher=metadata.get("publisher"),
        language=metadata.get("language"),
        authors=authors,
        tags=tags
    )
    
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    return new_book
