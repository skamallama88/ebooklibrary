from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas, database
from datetime import datetime

from .auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/{book_id}", response_model=schemas.Progress)
def get_progress(
    book_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    progress = db.query(models.ReadingProgress).filter(
        models.ReadingProgress.book_id == book_id,
        models.ReadingProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        # Return a default progress object if none exists
        return {
            "id": 0,
            "user_id": 1,
            "book_id": book_id,
            "cfi": None,
            "percentage": 0.0,
            "is_finished": 0,
            "last_read": datetime.now()
        }
    return progress

@router.post("/{book_id}", response_model=schemas.Progress)
def update_progress(
    book_id: int, 
    progress_update: schemas.ProgressUpdate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_progress = db.query(models.ReadingProgress).filter(
        models.ReadingProgress.book_id == book_id,
        models.ReadingProgress.user_id == current_user.id
    ).first()
    
    if not db_progress:
        db_progress = models.ReadingProgress(
            book_id=book_id,
            user_id=current_user.id,
            **progress_update.model_dump()
        )
        db.add(db_progress)
    else:
        update_data = progress_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_progress, key, value)
            
    db.commit()
    db.refresh(db_progress)
    return db_progress
