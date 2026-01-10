from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import models, schemas, database

from ..services.auth import get_current_user

router = APIRouter(prefix="/collections", tags=["collections"])

@router.get("/", response_model=List[schemas.Collection])
def get_collections(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Collection).options(joinedload(models.Collection.books)).filter(models.Collection.owner_id == current_user.id).all()

@router.post("/", response_model=schemas.Collection)
def create_collection(
    collection: schemas.CollectionCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_collection = models.Collection(
        name=collection.name,
        description=collection.description,
        owner_id=current_user.id
    )
    
    if collection.book_ids:
        books = db.query(models.Book).filter(models.Book.id.in_(collection.book_ids)).all()
        db_collection.books = books
        
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection

@router.get("/{collection_id}", response_model=schemas.Collection)
def get_collection(collection_id: int, db: Session = Depends(database.get_db)):
    collection = db.query(models.Collection).options(joinedload(models.Collection.books)).filter(models.Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection

@router.patch("/{collection_id}", response_model=schemas.Collection)
def update_collection(collection_id: int, collection_update: schemas.CollectionUpdate, db: Session = Depends(database.get_db)):
    db_collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not db_collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    update_data = collection_update.model_dump(exclude_unset=True)
    
    if "book_ids" in update_data:
        book_ids = update_data.pop("book_ids")
        books = db.query(models.Book).filter(models.Book.id.in_(book_ids)).all()
        db_collection.books = books
        
    for key, value in update_data.items():
        setattr(db_collection, key, value)
        
    db.commit()
    db.refresh(db_collection)
    return db_collection

@router.delete("/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(database.get_db)):
    db_collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not db_collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    db.delete(db_collection)
    db.commit()
    return {"message": "Collection deleted"}
