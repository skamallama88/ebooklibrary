"""
Tag management router for booru-style tagging system.

Provides endpoints for:
- Tag autocomplete and search
- Tag detail pages
- Tag CRUD operations
- Tag alias management
- Bulk tagging operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import List, Optional
from .. import models, schemas, database
from ..routers.auth import get_current_user
from ..utils.tag_normalization import normalize_tag_name, denormalize_tag_name
from ..services.tag_parser import TagExpressionParser

router = APIRouter(prefix="/tags", tags=["tags"])


# Admin-only helper
async def require_admin(current_user: models.User = Depends(get_current_user)):
    """Dependency that requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(403, "Admin access required")
    return current_user


@router.get("/autocomplete", response_model=List[schemas.TagAutocomplete])
def autocomplete_tags(
    q: str = Query(..., min_length=1),
    tag_type: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(database.get_db)
):
    """
    Autocomplete tag names based on partial query.
    Returns tags with their type and usage count.
    """
    query = db.query(models.Tag).filter(
        models.Tag.name.ilike(f"%{q}%")
    )
    
    if tag_type:
        query = query.filter(models.Tag.type == tag_type)
    
    # Order by usage count (most popular first), then alphabetically
    tags = query.order_by(
        desc(models.Tag.usage_count),
        models.Tag.name
    ).limit(limit).all()
    
    return tags


@router.get("/types", response_model=List[str])
def get_tag_types(db: Session = Depends(database.get_db)):
    """List all available tag types."""
    types = db.query(models.Tag.type).distinct().all()
    return [t[0] for t in types]


@router.get("/popular", response_model=List[schemas.TagAutocomplete])
def get_popular_tags(
    limit: int = 50,
    tag_type: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get most popular tags by usage count."""
    query = db.query(models.Tag).filter(models.Tag.usage_count > 0)
    
    if tag_type:
        query = query.filter(models.Tag.type == tag_type)
    
    tags = query.order_by(desc(models.Tag.usage_count)).limit(limit).all()
    return tags


@router.get("/{tag_id}", response_model=schemas.TagDetail)
def get_tag_detail(tag_id: int, db: Session = Depends(database.get_db)):
    """
    Get detailed information about a tag including aliases and related tags.
    """
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Get aliases
    aliases = db.query(models.TagAlias).filter(
        models.TagAlias.canonical_tag_id == tag_id
    ).all()
    alias_names = [alias.alias for alias in aliases]
    
    # Get related tags (tags that frequently appear together with this tag)
    # This is a simplified version - in production you'd want to optimize this
    related_tag_ids = db.query(
        models.book_tags.c.tag_id
    ).join(
        models.book_tags.alias('bt2'),
        models.book_tags.c.book_id == models.book_tags.c.book_id
    ).filter(
        models.book_tags.c.tag_id == tag_id,
        models.book_tags.c.tag_id != tag_id
    ).group_by(
        models.book_tags.c.tag_id
    ).limit(10).all()
    
    related_tags = db.query(models.Tag).filter(
        models.Tag.id.in_([tid[0] for tid in related_tag_ids])
    ).all() if related_tag_ids else []
    
    # Build response
    tag_dict = schemas.Tag.model_validate(tag).model_dump()
    tag_dict['aliases'] = alias_names
    tag_dict['related_tags'] = [schemas.TagAutocomplete.model_validate(rt) for rt in related_tags]
    
    return schemas.TagDetail(**tag_dict)


@router.post("/", response_model=schemas.TagWithAliases)
def create_tag(
    tag_data: schemas.TagCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Create a new tag with optional aliases.
    Normalizes the tag name automatically.
    """
    # Normalize tag name
    normalized_name = normalize_tag_name(tag_data.name)
    
    # Check if tag already exists
    existing_tag = db.query(models.Tag).filter(
        models.Tag.name == normalized_name
    ).first()
    
    if existing_tag:
        raise HTTPException(
            status_code=400,
            detail=f"Tag '{normalized_name}' already exists"
        )
    
    # Create tag
    new_tag = models.Tag(
        name=normalized_name,
        type=tag_data.type,
        description=tag_data.description,
        usage_count=0
    )
    db.add(new_tag)
    db.flush()
    
    # Create aliases
    for alias_name in tag_data.aliases:
        normalized_alias = normalize_tag_name(alias_name)
        if normalized_alias != normalized_name:  # Don't alias to itself
            alias = models.TagAlias(
                alias=normalized_alias,
                canonical_tag_id=new_tag.id
            )
            db.add(alias)
    
    db.commit()
    db.refresh(new_tag)
    
    # Build response with aliases
    aliases = db.query(models.TagAlias).filter(
        models.TagAlias.canonical_tag_id == new_tag.id
    ).all()
    
    tag_dict = schemas.Tag.model_validate(new_tag).model_dump()
    tag_dict['aliases'] = [alias.alias for alias in aliases]
    
    return schemas.TagWithAliases(**tag_dict)


@router.patch("/{tag_id}", response_model=schemas.TagWithAliases)
def update_tag(
    tag_id: int,
    tag_data: schemas.TagCreate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(database.get_db)
):
    """Update tag metadata (admin only)."""
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Update fields
    if tag_data.type:
        tag.type = tag_data.type
    if tag_data.description is not None:
        tag.description = tag_data.description
    
    # Update aliases if provided
    if tag_data.aliases:
        # Remove existing aliases
        db.query(models.TagAlias).filter(
            models.TagAlias.canonical_tag_id == tag_id
        ).delete()
        
        # Add new aliases
        for alias_name in tag_data.aliases:
            normalized_alias = normalize_tag_name(alias_name)
            if normalized_alias != tag.name:
                alias = models.TagAlias(
                    alias=normalized_alias,
                    canonical_tag_id=tag_id
                )
                db.add(alias)
    
    db.commit()
    db.refresh(tag)
    
    # Build response
    aliases = db.query(models.TagAlias).filter(
        models.TagAlias.canonical_tag_id == tag_id
    ).all()
    
    tag_dict = schemas.Tag.model_validate(tag).model_dump()
    tag_dict['aliases'] = [alias.alias for alias in aliases]
    
    return schemas.TagWithAliases(**tag_dict)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(database.get_db)
):
    """Delete a tag (admin only). Removes all associations with books."""
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return None


@router.get("/{tag_id}/aliases", response_model=List[schemas.TagAlias])
def get_tag_aliases(tag_id: int, db: Session = Depends(database.get_db)):
    """List all aliases for a tag."""
    aliases = db.query(models.TagAlias).filter(
        models.TagAlias.canonical_tag_id == tag_id
    ).all()
    return aliases


@router.post("/{tag_id}/aliases", response_model=schemas.TagAlias)
def create_tag_alias(
    tag_id: int,
    alias_data: schemas.TagAliasBase,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(database.get_db)
):
    """Add an alias to a tag (admin only)."""
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    normalized_alias = normalize_tag_name(alias_data.alias)
    
    # Check if alias already exists
    existing_alias = db.query(models.TagAlias).filter(
        models.TagAlias.alias == normalized_alias
    ).first()
    
    if existing_alias:
        raise HTTPException(
            status_code=400,
            detail=f"Alias '{normalized_alias}' already exists"
        )
    
    alias = models.TagAlias(
        alias=normalized_alias,
        canonical_tag_id=tag_id
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    
    return alias


@router.delete("/aliases/{alias_id}", status_code=204)
def delete_tag_alias(
    alias_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(database.get_db)
):
    """Remove a tag alias (admin only)."""
    alias = db.query(models.TagAlias).filter(models.TagAlias.id == alias_id).first()
    if not alias:
        raise HTTPException(status_code=404, detail="Alias not found")
    
    db.delete(alias)
    db.commit()
    return None


@router.post("/bulk-tag", response_model=schemas.BulkTagResult)
def bulk_tag_books(
    operation: schemas.BulkTagOperation,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Add or remove tags from multiple books in bulk.
    """
    errors = []
    tags_modified = []
    affected_count = 0
    
    # Validate books exist
    books = db.query(models.Book).filter(
        models.Book.id.in_(operation.book_ids)
    ).all()
    
    if len(books) != len(operation.book_ids):
        errors.append(f"Some books not found. Expected {len(operation.book_ids)}, found {len(books)}")
    
    # Get or create tags
    tags = []
    for tag_name in operation.tag_names:
        normalized_name = normalize_tag_name(tag_name)
        tag = db.query(models.Tag).filter(models.Tag.name == normalized_name).first()
        
        if not tag:
            if operation.operation == "add":
                # Create tag if adding
                tag = models.Tag(name=normalized_name, type="meta", usage_count=0)
                db.add(tag)
                db.flush()
            else:
                errors.append(f"Tag '{normalized_name}' not found, skipping removal")
                continue
        
        tags.append(tag)
        tags_modified.append(normalized_name)
    
    # Perform operation
    if operation.operation == "add":
        for book in books:
            for tag in tags:
                # Check if book already has this tag
                existing = db.query(models.book_tags).filter(
                    models.book_tags.c.book_id == book.id,
                    models.book_tags.c.tag_id == tag.id
                ).first()
                
                if not existing:
                    # Add tag to book
                    stmt = models.book_tags.insert().values(
                        book_id=book.id,
                        tag_id=tag.id,
                        source=operation.source,
                        confidence=1.0
                    )
                    db.execute(stmt)
                    affected_count += 1
                    
                    # Update usage count
                    tag.usage_count += 1
    
    elif operation.operation == "remove":
        for book in books:
            for tag in tags:
                # Remove tag from book
                deleted = db.execute(
                    models.book_tags.delete().where(
                        models.book_tags.c.book_id == book.id,
                        models.book_tags.c.tag_id == tag.id
                    )
                )
                if deleted.rowcount > 0:
                    affected_count += 1
                    
                    # Update usage count
                    tag.usage_count = max(0, tag.usage_count - 1)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid operation: {operation.operation}. Must be 'add' or 'remove'"
        )
    
    db.commit()
    
    return schemas.BulkTagResult(
        affected_books=len(books),
        tags_modified=tags_modified,
        errors=errors
    )


@router.post("/copy-tags/{source_book_id}/{target_book_id}", status_code=200)
def copy_tags_between_books(
    source_book_id: int,
    target_book_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """Copy all tags from source book to target book."""
    source_book = db.query(models.Book).filter(models.Book.id == source_book_id).first()
    target_book = db.query(models.Book).filter(models.Book.id == target_book_id).first()
    
    if not source_book:
        raise HTTPException(status_code=404, detail="Source book not found")
    if not target_book:
        raise HTTPException(status_code=404, detail="Target book not found")
    
    added_count = 0
    for tag in source_book.tags:
        # Check if target already has this tag
        existing = db.query(models.book_tags).filter(
            models.book_tags.c.book_id == target_book_id,
            models.book_tags.c.tag_id == tag.id
        ).first()
        
        if not existing:
            stmt = models.book_tags.insert().values(
                book_id=target_book_id,
                tag_id=tag.id,
                source="manual",
                confidence=1.0
            )
            db.execute(stmt)
            tag.usage_count += 1
            added_count += 1
    
    db.commit()
    
    return {"message": f"Copied {added_count} tags from book {source_book_id} to {target_book_id}"}

