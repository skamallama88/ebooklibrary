"""
AI Router - API endpoints for AI-powered book analysis
Handles provider management, summary generation, tag generation, and batch operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

from ..database import get_db
from ..models import User, Book, Tag, AIProviderConfig, TagPriorityConfig
from ..schemas import (
    AIProviderConfigCreate, AIProviderConfig as AIProviderConfigSchema,
    OllamaModelList, OllamaModelInfo,
    AISummaryRequest, AISummaryResponse,
    AITagRequest, AITagResponse, SuggestedTag,
    AIBatchRequest, AIBatchProgress,
    TagPriorityConfigBase, TagPriorityConfig as TagPriorityConfigSchema,
    TagPriorityConfigUpdate
)
from ..services.auth import get_current_user, require_admin
from ..services.ai_services import AIService
from ..services.llm_provider import create_provider, OllamaProvider

router = APIRouter(prefix="/ai", tags=["ai"])


# ============================================================================
# Provider Management Endpoints
# ============================================================================

@router.get("/providers", response_model=List[AIProviderConfigSchema])
async def list_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all configured AI providers"""
    providers = db.query(AIProviderConfig).all()
    return providers


@router.post("/providers", response_model=AIProviderConfigSchema, status_code=status.HTTP_201_CREATED)
async def create_provider(
    provider_config: AIProviderConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new AI provider configuration (admin only)"""
    # Create new provider
    new_provider = AIProviderConfig(
        provider_type=provider_config.provider_type,
        api_key=provider_config.api_key,
        base_url=provider_config.base_url,
        model_name=provider_config.model_name,
        max_tokens=provider_config.max_tokens,
        temperature=provider_config.temperature,
        extraction_strategy=provider_config.extraction_strategy,
        is_active=False  # Don't auto-activate
    )
    
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    
    return new_provider


@router.put("/providers/{provider_id}", response_model=AIProviderConfigSchema)
async def update_provider(
    provider_id: int,
    provider_config: AIProviderConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update an AI provider configuration (admin only)"""
    provider = db.query(AIProviderConfig).filter(AIProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Update fields
    provider.provider_type = provider_config.provider_type
    provider.api_key = provider_config.api_key
    provider.base_url = provider_config.base_url
    provider.model_name = provider_config.model_name
    provider.max_tokens = provider_config.max_tokens
    provider.temperature = provider_config.temperature
    provider.extraction_strategy = provider_config.extraction_strategy
    
    db.commit()
    db.refresh(provider)
    
    return provider


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete an AI provider configuration (admin only)"""
    provider = db.query(AIProviderConfig).filter(AIProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    db.delete(provider)
    db.commit()
    
    return None


@router.get("/providers/active", response_model=Optional[AIProviderConfigSchema])
async def get_active_provider(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the currently active AI provider"""
    active_provider = db.query(AIProviderConfig).filter(
        AIProviderConfig.is_active == True
    ).first()
    
    return active_provider


@router.post("/providers/{provider_id}/activate", response_model=AIProviderConfigSchema)
async def activate_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Set a provider as the active one (admin only)"""
    provider = db.query(AIProviderConfig).filter(AIProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Deactivate all other providers
    db.query(AIProviderConfig).update({"is_active": False})
    
    # Activate this one
    provider.is_active = True
    
    db.commit()
    db.refresh(provider)
    
    return provider


@router.get("/providers/{provider_id}/test")
async def test_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Test provider connection and availability"""
    provider = db.query(AIProviderConfig).filter(AIProviderConfig.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
        # Create provider instance
        config = {
            "base_url": provider.base_url,
            "model_name": provider.model_name,
            "api_key": provider.api_key,
            "temperature": provider.temperature,
            "max_tokens": provider.max_tokens,
        }
        llm_provider = create_provider(provider.provider_type, config)
        
        # Test health check
        is_healthy = await llm_provider.health_check()
        
        if is_healthy:
            return {"status": "success", "message": "Provider is healthy and model is available"}
        else:
            return {"status": "error", "message": "Provider is running but model is not available"}
            
    except Exception as e:
        return {"status": "error", "message": f"Failed to connect: {str(e)}"}


@router.get("/providers/ollama/models", response_model=OllamaModelList)
async def discover_ollama_models(
    base_url: str = "http://localhost:11434",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Discover available models from Ollama instance"""
    try:
        # Create temporary Ollama provider
        config = {
            "base_url": base_url,
            "model_name": "placeholder",  # Not used for listing
        }
        provider = OllamaProvider(config)
        
        # List models
        models = await provider.list_models()
        
        # Convert to schema format
        model_infos = [
            OllamaModelInfo(
                name=model.name,
                size=model.size,
                modified_at=model.modified_at
            )
            for model in models
        ]
        
        return OllamaModelList(models=model_infos)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to discover models: {str(e)}"
        )


# ============================================================================
# Tag Priority Management Endpoints
# ============================================================================

@router.get("/tag-priorities", response_model=List[TagPriorityConfigSchema])
async def get_tag_priorities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's tag priority configuration (or global defaults)"""
    # Try to get user-specific priorities
    priorities = db.query(TagPriorityConfig).filter(
        TagPriorityConfig.user_id == current_user.id
    ).order_by(TagPriorityConfig.priority).all()
    
    # If none found, get global defaults
    if not priorities:
        priorities = db.query(TagPriorityConfig).filter(
            TagPriorityConfig.user_id == None
        ).order_by(TagPriorityConfig.priority).all()
    
    return priorities


@router.put("/tag-priorities", response_model=List[TagPriorityConfigSchema])
async def update_tag_priorities(
    update: TagPriorityConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's tag priority configuration"""
    # Delete existing user priorities
    db.query(TagPriorityConfig).filter(
        TagPriorityConfig.user_id == current_user.id
    ).delete()
    
    # Create new priorities
    new_priorities = []
    for priority_base in update.priorities:
        new_priority = TagPriorityConfig(
            tag_type=priority_base.tag_type,
            priority=priority_base.priority,
            max_tags=priority_base.max_tags,
            user_id=current_user.id
        )
        db.add(new_priority)
        new_priorities.append(new_priority)
    
    db.commit()
    
    # Refresh all
    for p in new_priorities:
        db.refresh(p)
    
    return new_priorities


@router.post("/tag-priorities/reset", response_model=List[TagPriorityConfigSchema])
async def reset_tag_priorities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user's tag priorities to global defaults"""
    # Delete user-specific priorities
    db.query(TagPriorityConfig).filter(
        TagPriorityConfig.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    # Return global defaults
    defaults = db.query(TagPriorityConfig).filter(
        TagPriorityConfig.user_id == None
    ).order_by(TagPriorityConfig.priority).all()
    
    return defaults


# ============================================================================
# Summary Generation Endpoints
# ============================================================================

@router.post("/summary", response_model=AISummaryResponse)
async def generate_summary(
    request: AISummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI summary for a book"""
    # Verify book exists
    book = db.query(Book).filter(Book.id == request.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Create AI service
    ai_service = AIService(db)
    
    if not ai_service.provider:
        raise HTTPException(
            status_code=400,
            detail="No active AI provider configured. Please configure an AI provider first."
        )
    
    try:
        # Generate summary
        from ..services.text_extractor import ExtractionStrategy
        strategy = None
        if request.extraction_strategy:
            strategy = ExtractionStrategy(request.extraction_strategy)
        
        result = await ai_service.generate_summary(
            book_id=request.book_id,
            extraction_strategy=strategy,
            overwrite_existing=request.overwrite_existing
        )
        
        # If auto-approve, save to database
        if request.auto_approve:
            book.description = result.summary
            db.commit()
            preview_mode = False
        else:
            preview_mode = True
        
        return AISummaryResponse(
            book_id=result.book_id,
            summary=result.summary,
            original_summary=result.original_summary,
            confidence=result.confidence,
            preview_mode=preview_mode,
            strategy_used=result.strategy_used
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )


@router.post("/summary/approve")
async def approve_summary(
    book_id: int,
    summary: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve and apply AI-generated summary"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    book.description = summary
    db.commit()
    
    return {"status": "success", "message": "Summary applied"}


@router.post("/summary/reject")
async def reject_summary(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject AI-generated summary"""
    # Just a logging endpoint, no action needed
    return {"status": "success", "message": "Summary rejected"}


# ============================================================================
# Tag Generation Endpoints
# ============================================================================

@router.post("/tags", response_model=AITagResponse)
async def generate_tags(
    request: AITagRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI tags for a book"""
    # Verify book exists
    book = db.query(Book).filter(Book.id == request.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Create AI service
    ai_service = AIService(db)
    
    if not ai_service.provider:
        raise HTTPException(
            status_code=400,
            detail="No active AI provider configured. Please configure an AI provider first."
        )
    
    try:
        # Generate tags
        result = await ai_service.generate_tags(
            book_id=request.book_id,
            max_tags=request.max_tags,
            per_type_limits=request.per_type_limits,
            merge_existing=request.merge_existing,
            tag_priorities=request.tag_priorities
        )
        
        # Convert to schema format
        suggested_tag_schemas = [
            SuggestedTag(
                name=tag['name'],
                type=tag['type'],
                confidence=tag['confidence'],
                reason=tag['reason']
            )
            for tag in result.suggested_tags
        ]
        
        # If auto-approve, apply tags
        if request.auto_approve:
            await _apply_tags_to_book(
                db=db,
                book_id=request.book_id,
                suggested_tags=result.suggested_tags,
                merge_existing=request.merge_existing
            )
        
        return AITagResponse(
            book_id=result.book_id,
            suggested_tags=suggested_tag_schemas,
            existing_tags=result.existing_tags,
            applied_limits=result.applied_limits
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate tags: {str(e)}"
        )


@router.post("/tags/approve")
async def approve_tags(
    book_id: int,
    tags: List[SuggestedTag],
    merge_existing: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve and apply AI-generated tags"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Convert to dict format
    tag_dicts = [
        {
            'name': tag.name,
            'type': tag.type,
            'confidence': tag.confidence,
            'reason': tag.reason
        }
        for tag in tags
    ]
    
    await _apply_tags_to_book(db, book_id, tag_dicts, merge_existing)
    
    return {"status": "success", "message": f"Applied {len(tags)} tags to book"}


@router.post("/tags/reject")
async def reject_tags(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject AI-generated tags"""
    # Just a logging endpoint, no action needed
    return {"status": "success", "message": "Tags rejected"}


# ============================================================================
# Batch Processing Endpoints
# ============================================================================

# Note: Full batch processing with job queue would be implemented here
# For now, providing a placeholder that processes sequentially

@router.post("/batch", response_model=AIBatchProgress)
async def start_batch_processing(
    request: AIBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start batch AI processing (simplified sequential version)"""
    # TODO: Implement proper background job queue (e.g., Celery, ARQ)
    # For now, return placeholder response
    
    raise HTTPException(
        status_code=501,
        detail="Batch processing not yet implemented. Please process books individually."
    )


# ============================================================================
# Helper Functions
# ============================================================================

async def _apply_tags_to_book(
    db: Session,
    book_id: int,
    suggested_tags: List[Dict],
    merge_existing: bool
):
    """Apply tags to a book"""
    from ..services.tag_parser import normalize_tag_name
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return
    
    # Clear existing tags if not merging
    if not merge_existing:
        # Decrement usage count for tags being removed
        for tag in book.tags:
            if tag.usage_count > 0:
                tag.usage_count -= 1
        book.tags.clear()
    
    # Apply each suggested tag
    for tag_dict in suggested_tags:
        tag_name = tag_dict['name']
        tag_type = tag_dict.get('type', 'meta')
        
        # Find or create tag
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(
                name=tag_name,
                type=tag_type,
                description=tag_dict.get('reason', ''),
                usage_count=0
            )
            db.add(tag)
            db.flush()
        
        # Add to book if not already there
        if tag not in book.tags:
            book.tags.append(tag)
            tag.usage_count = (tag.usage_count or 0) + 1
            db.add(tag) # Explicitly mark as modified
    
    db.commit()
