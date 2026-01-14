from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os
from .. import models, schemas, database
from ..services.auth import get_current_active_user
from ..logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/duplicates",
    tags=["duplicates"]
)

@router.get("/", response_model=List[schemas.Book])
def get_duplicates(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """List all books flagged as duplicates"""
    return db.query(models.Book).filter(models.Book.is_duplicate == True).all()

@router.post("/{book_id}/resolve")
def resolve_duplicate(
    book_id: int,
    request: schemas.DuplicateResolutionRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Resolve a duplicate book"""
    duplicate_book = db.query(models.Book).filter(models.Book.id == book_id, models.Book.is_duplicate == True).first()
    if not duplicate_book:
        raise HTTPException(status_code=404, detail="Duplicate book not found")
    
    original_book = db.query(models.Book).filter(models.Book.id == duplicate_book.duplicate_of_id).first()
    
    logger.info(f"Resolving duplicate {book_id} with action {request.action}")

    if request.action == "keep_original":
        # Keep original, delete duplicate file and record
        if duplicate_book.file_path and os.path.exists(duplicate_book.file_path):
            try:
                os.remove(duplicate_book.file_path)
                logger.info(f"Deleted duplicate file: {duplicate_book.file_path}")
            except Exception as e:
                logger.error(f"Error deleting file {duplicate_book.file_path}: {e}")
        
        db.delete(duplicate_book)
        db.commit()
        return {"message": "Duplicate removed, original kept"}
        
    elif request.action == "keep_new":
        # Keep duplicate (new one), delete original file and record
        if original_book:
            # 1. Migrate reading progress and bookmarks to the new book record
            db.query(models.ReadingProgress).filter(models.ReadingProgress.book_id == original_book.id).update({"book_id": duplicate_book.id})
            db.query(models.Bookmark).filter(models.Bookmark.book_id == original_book.id).update({"book_id": duplicate_book.id})
            
            # 2. Migrate collection membership
            # For each collection the original was in, add the duplicate
            for collection in original_book.collections:
                if duplicate_book not in collection.books:
                    collection.books.append(duplicate_book)

            # 3. Delete original file
            if original_book.file_path and os.path.exists(original_book.file_path):
                try:
                    # Only delete if it's a different path
                    if original_book.file_path != duplicate_book.file_path:
                        os.remove(original_book.file_path)
                        logger.info(f"Deleted original file: {original_book.file_path}")
                except Exception as e:
                    logger.error(f"Error deleting file {original_book.file_path}: {e}")
            
            # 4. Mark duplicate as no longer duplicate
            duplicate_book.is_duplicate = False
            duplicate_book.duplicate_of_id = None
            
            # 5. Delete original record
            db.delete(original_book)
            db.commit()
            return {"message": "Original removed, new version kept (progress/collections migrated)"}
        else:
            # If original gone, just unflag
            duplicate_book.is_duplicate = False
            duplicate_book.duplicate_of_id = None
            db.commit()
            return {"message": "Duplicate unflagged (original missing)"}

    elif request.action == "keep_both":
        # Keep both, just unflag the duplicate
        duplicate_book.is_duplicate = False
        duplicate_book.duplicate_of_id = None
        db.commit()
        return {"message": "Both versions kept, duplicate flag removed"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid resolution action")
