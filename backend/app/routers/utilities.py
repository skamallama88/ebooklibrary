from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from ..models import Book, User
from .auth import get_current_user
from ..services.utilities import count_words_in_book
import os

router = APIRouter(
    prefix="/utilities",
    tags=["utilities"],
    responses={404: {"description": "Not found"}},
)

@router.post("/word-count", response_model=Dict[str, Any])
def calculate_word_count(
    book_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate and update word count for specified books.
    Returns the updated books info.
    """
    updated_count = 0
    errors = []
    
    books = db.query(Book).filter(Book.id.in_(book_ids)).all()
    
    if not books:
        raise HTTPException(status_code=404, detail="No books found with provided IDs")
    
    for book in books:
        if not book.file_path or not os.path.exists(book.file_path):
            errors.append(f"File not found for book ID {book.id}: {book.title}")
            continue
            
        try:
            count = count_words_in_book(book.file_path)
            if count is not None:
                book.word_count = count
                updated_count += 1
            else:
                errors.append(f"Failed to count words for book ID {book.id}: {book.title}")
        except Exception as e:
            errors.append(f"Error processing book ID {book.id}: {str(e)}")
            
    db.commit()
    
    return {
        "message": f"Updated word count for {updated_count} books",
        "updated_count": updated_count,
        "errors": errors
    }
