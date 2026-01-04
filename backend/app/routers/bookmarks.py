from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from ..services import auth

router = APIRouter(
    prefix="/bookmarks",
    tags=["bookmarks"]
)

@router.get("/{book_id}", response_model=List[schemas.Bookmark])
def get_bookmarks(
    book_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    bookmarks = db.query(models.Bookmark).filter(
        models.Bookmark.book_id == book_id,
        models.Bookmark.user_id == current_user.id
    ).order_by(models.Bookmark.created_at.desc()).all()
    return bookmarks

@router.post("/{book_id}", response_model=schemas.Bookmark)
def create_bookmark(
    book_id: int,
    bookmark: schemas.BookmarkCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Verify book exists
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    db_bookmark = models.Bookmark(
        **bookmark.model_dump(),
        user_id=current_user.id,
        book_id=book_id
    )
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.id == bookmark_id,
        models.Bookmark.user_id == current_user.id
    ).first()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
        
    db.delete(bookmark)
    db.commit()
    return None
