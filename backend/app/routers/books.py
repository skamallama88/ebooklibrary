from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
import shutil
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from .. import models, schemas, database
from ..services.library import scan_library, import_book

router = APIRouter(prefix="/books", tags=["books"])

@router.get("/", response_model=schemas.PaginatedBookList)
def get_books(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    author: Optional[str] = None,
    publisher: Optional[str] = None,
    collection_id: Optional[int] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Book)
    
    if search:
        # Search Title, Authors, and Tags
        search_filter = models.Book.title.ilike(f"%{search}%")
        
        # Add Author search
        query = query.outerjoin(models.Book.authors)
        search_filter = search_filter | models.Author.name.ilike(f"%{search}%")
        
        # Add Tag search
        query = query.outerjoin(models.Book.tags)
        search_filter = search_filter | models.Tag.name.ilike(f"%{search}%")
        
        query = query.filter(search_filter)
    
    if tag:
        query = query.join(models.Book.tags).filter(models.Tag.name == tag)
        
    if author:
        query = query.join(models.Book.authors).filter(models.Author.name == author)
        
    if publisher:
        query = query.filter(models.Book.publisher == publisher)
        
    if collection_id:
        query = query.join(models.Book.collections).filter(models.Collection.id == collection_id)
    
    total = query.distinct().count()
    
    # Sorting logic
    order_col = models.Book.title
    if sort_by == "recent" or sort_by == "created_at":
        order_col = models.Book.created_at
    elif sort_by == "rating":
        order_col = models.Book.rating
    elif sort_by == "title":
        order_col = models.Book.title
        
    if sort_order == "desc":
        query = query.order_by(order_col.desc())
    else:
        query = query.order_by(order_col.asc())
        
    books = query.distinct().offset(skip).limit(limit).all()
    
    return {
        "items": books,
        "total": total,
        "page": skip // limit,
        "limit": limit
    }

@router.delete("/bulk", status_code=204)
def bulk_delete_books(book_ids: List[int], db: Session = Depends(database.get_db)):
    books = db.query(models.Book).filter(models.Book.id.in_(book_ids)).all()
    for book in books:
        # Delete cover if exists
        if book.cover_path:
            cover_storage = os.getenv("COVER_STORAGE_PATH", "/data/covers")
            full_path = os.path.join(cover_storage, book.cover_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        
        # Delete file if exists (optional, maybe we want to keep it on disk?)
        # For now, let's keep it on disk but remove from database
        db.delete(book)
    
    db.commit()
    return None

@router.get("/tags", response_model=List[schemas.Tag])
def get_tags(db: Session = Depends(database.get_db)):
    return db.query(models.Tag).all()

@router.get("/authors", response_model=List[schemas.Author])
def get_authors(db: Session = Depends(database.get_db)):
    return db.query(models.Author).all()

@router.get("/publishers", response_model=List[str])
def get_publishers(db: Session = Depends(database.get_db)):
    publishers = db.query(models.Book.publisher).filter(models.Book.publisher != None).distinct().all()
    return [p[0] for p in publishers]

@router.post("/scan", status_code=202)
def trigger_scan(background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    background_tasks.add_task(scan_library, db)
    return {"message": "Scan started in background"}

@router.get("/{book_id}", response_model=schemas.Book)
def get_book(book_id: int, db: Session = Depends(database.get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.patch("/{book_id}", response_model=schemas.Book)
def update_book(book_id: int, book_update: schemas.BookUpdate, db: Session = Depends(database.get_db)):
    db_book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    update_data = book_update.model_dump(exclude_unset=True)
    
    # Handle authors separately
    if "authors" in update_data:
        authors = []
        for author_name in update_data.pop("authors"):
            author = db.query(models.Author).filter(models.Author.name == author_name).first()
            if not author:
                author = models.Author(name=author_name)
                db.add(author)
                db.flush()
            authors.append(author)
        db_book.authors = authors

    # Handle tags separately
    if "tags" in update_data:
        tags = []
        for tag_name in update_data.pop("tags"):
            tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
            if not tag:
                tag = models.Tag(name=tag_name)
                db.add(tag)
                db.flush()
            tags.append(tag)
        db_book.tags = tags

    # Update other fields
    for key, value in update_data.items():
        setattr(db_book, key, value)
    
    db.commit()
    db.refresh(db_book)
    return db_book

@router.get("/{book_id}/file")
def get_book_file(book_id: int, db: Session = Depends(database.get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        book.file_path, 
        media_type="application/epub+zip" if book.format == "EPUB" else "application/pdf",
        filename=os.path.basename(book.file_path)
    )

@router.get("/{book_id}/cover")
def get_book_cover(book_id: int, db: Session = Depends(database.get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.cover_path:
        raise HTTPException(status_code=404, detail="Cover not found")
    
    cover_storage = os.getenv("COVER_STORAGE_PATH", "/data/covers")
    full_path = os.path.join(cover_storage, book.cover_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Cover file not found on disk")
        
    return FileResponse(full_path, media_type="image/jpeg")

@router.post("/upload", response_model=schemas.Book)
async def upload_book(file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    if not file.filename.lower().endswith(('.epub', '.pdf')):
        raise HTTPException(status_code=400, detail="Only EPUB and PDF files are supported")
    
    storage_path = os.getenv("BOOK_STORAGE_PATH", "/data/books")
    os.makedirs(storage_path, exist_ok=True)
    
    file_path = os.path.join(storage_path, file.filename)
    
    # Check if file already exists on disk
    if os.path.exists(file_path):
        # Could append a suffix, but for MVP we might just want to check if it's already in DB
        pass
        
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    book = import_book(db, file_path)
    return book
