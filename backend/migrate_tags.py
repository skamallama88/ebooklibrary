import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the current directory to sys.path to allow imports from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import models
from app.services.tag_import import TagImportService
from app.services.metadata import extract_metadata

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://ebookuser:ebookpass@localhost:5433/ebooklibrary")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_tags():
    db = SessionLocal()
    try:
        tag_service = TagImportService(db)
        books = db.query(models.Book).all()
        
        print(f"Found {len(books)} books to migrate.")
        
        for i, book in enumerate(books):
            print(f"[{i+1}/{len(books)}] Processing: {book.title}")
            
            # Use current metadata from book record if possible, 
            # or re-extract from file for better accuracy if file exists
            if os.path.exists(book.file_path):
                try:
                    metadata = extract_metadata(book.file_path)
                except Exception as e:
                    print(f"  Error extracting from file: {e}. Using DB metadata.")
                    metadata = {
                        "authors": [a.name for a in book.authors],
                        "tags": [t.name for t in book.tags if t.type == "meta"], # Assume old tags were meta
                        "series": book.series,
                        "language": book.language,
                        "format": book.format,
                        "publisher": book.publisher
                    }
            else:
                print(f"  File not found: {book.file_path}. Using DB metadata.")
                metadata = {
                    "authors": [a.name for a in book.authors],
                    "tags": [t.name for t in book.tags if t.type == "meta"],
                    "series": book.series,
                    "language": book.language,
                    "format": book.format,
                    "publisher": book.publisher
                }
            
            # Process to tags
            tag_service.process_metadata_to_tags(book.id, metadata)
            
            if (i + 1) % 10 == 0:
                db.commit()
                print(f"  Committed 10 books.")
        
        db.commit()
        print("Migration complete!")
        
    except Exception as e:
        print(f"An error occurred during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_tags()
