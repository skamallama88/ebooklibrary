import os
from sqlalchemy.orm import Session
from .. import models, schemas
from .metadata import extract_metadata
from .text_extractor import TextExtractor
from .tag_import import TagImportService
from datetime import datetime

BOOK_STORAGE_PATH = os.getenv("BOOK_STORAGE_PATH", "/data/books")

def scan_library(db: Session):
    for root, dirs, files in os.walk(BOOK_STORAGE_PATH):
        for file in files:
            if file.lower().endswith(('.epub', '.pdf', '.mobi', '.txt', '.rtf')):
                file_path = os.path.join(root, file)
                import_book(db, file_path)

def import_book(db: Session, file_path: str):
    # Check if book already exists
    db_book = db.query(models.Book).filter(models.Book.file_path == file_path).first()
    if db_book:
        return db_book

    # Extract metadata
    metadata = extract_metadata(file_path)
    title = metadata.get("title", os.path.basename(file_path))
    
    # Calculate word count
    word_count = 0
    try:
        extractor = TextExtractor()
        content = extractor.extract_text(file_path)
        word_count = content.word_count
    except Exception as e:
        print(f"Error extracting word count for {file_path}: {e}")

    # Check if book with same title exists (duplicate detection)
    is_duplicate = False
    duplicate_of_id = None
    existing_book = db.query(models.Book).filter(models.Book.title == title).first()
    if existing_book:
        is_duplicate = True
        duplicate_of_id = existing_book.id

    # Create or get authors
    authors = []
    for author_name in metadata.get("authors", []):
        author = db.query(models.Author).filter(models.Author.name == author_name).first()
        if not author:
            author = models.Author(name=author_name)
            db.add(author)
            db.flush()
        authors.append(author)

    # Create book record
    new_book = models.Book(
        title=title,
        file_path=file_path,
        cover_path=metadata.get("cover_path"),
        format=metadata.get("format"),
        file_size=metadata.get("file_size"),
        published_date=metadata.get("published_date"),
        description=metadata.get("description"),
        publisher=metadata.get("publisher"),
        language=metadata.get("language"),
        word_count=word_count,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        authors=authors
    )
    
    db.add(new_book)
    db.flush() # Flush to get book ID
    
    # Process metadata into tags using TagImportService
    tag_service = TagImportService(db)
    tag_service.process_metadata_to_tags(new_book.id, metadata)
    
    db.commit()
    db.refresh(new_book)
    return new_book
