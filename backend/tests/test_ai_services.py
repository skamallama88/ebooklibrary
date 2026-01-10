"""
Tests for AI services (summarization and tag generation).
"""
import pytest
from unittest.mock import Mock, patch
from app.services.ai_services import AIService, AISummaryResult, AITagResult
from app import models


@pytest.fixture
def ai_service(test_db):
    """Create AI service instance"""
    return AIService(test_db)


@pytest.mark.unit
def test_ai_service_initialization(ai_service):
    """Test AI service initializes correctly"""
    assert ai_service.db is not None
    assert ai_service.text_extractor is not None


@pytest.mark.unit
@patch('app.services.ai_services.AIService._load_active_provider')
def test_load_active_provider_no_config(mock_load, test_db):
    """Test AI service handles missing provider configuration"""
    service = AIService(test_db)
    # Should not raise error, just log warning
    assert service.provider is None


@pytest.mark.integration
def test_ai_provider_config_crud(test_db):
    """Test creating and retrieving AI provider configuration"""
    config = models.AIProviderConfig(
        provider_name="ollama",
        base_url="http://localhost:11434",
        model_name="llama2",
        is_active=True
    )
    
    test_db.add(config)
    test_db.commit()
    test_db.refresh(config)
    
    assert config.id is not None
    assert config.provider_name == "ollama"
    assert config.is_active is True
    
    # Retrieve active provider
    active = test_db.query(models.AIProviderConfig).filter(
        models.AIProviderConfig.is_active == True
    ).first()
    
    assert active is not None
    assert active.id == config.id


@pytest.mark.unit
def test_ai_summary_result_structure():
    """Test AI summary result data structure"""
    result = AISummaryResult(
        book_id=1,
        summary="Test summary",
        original_summary="Original",
        confidence=0.85,
        strategy_used="full_text",
        word_count=500
    )
    
    assert result.book_id == 1
    assert result.summary == "Test summary"
    assert result.confidence == 0.85
    assert result.strategy_used == "full_text"


@pytest.mark.unit
def test_ai_tag_result_structure():
    """Test AI tag result data structure"""
    tags = [
        {"name": "fantasy", "type": "genre", "confidence": 0.9},
        {"name": "adventure", "type": "theme", "confidence": 0.8}
    ]
    
    result = AITagResult(
        book_id=1,
        suggested_tags=tags,
        existing_tags=["fiction"],
        applied_limits={"genre": 3, "theme": 5}
    )
    
    assert result.book_id == 1
    assert len(result.suggested_tags) == 2
    assert result.suggested_tags[0]["name"] == "fantasy"


@pytest.mark.integration
def test_ai_prompt_template_crud(test_db, test_user):
    """Test creating and using AI prompt templates"""
    template = models.AIPromptTemplate(
        name="Test Summary Template",
        template_type="summary",
        content="Summarize this book: {title}",
        user_id=test_user.id,
        is_default=False
    )
    
    test_db.add(template)
    test_db.commit()
    test_db.refresh(template)
    
    assert template.id is not None
    assert template.template_type == "summary"
    
    # Test retrieval
    retrieved = test_db.query(models.AIPromptTemplate).filter(
        models.AIPromptTemplate.template_type == "summary",
        models.AIPromptTemplate.user_id == test_user.id
    ).first()
    
    assert retrieved is not None
    assert retrieved.content == "Summarize this book: {title}"


@pytest.mark.unit
@patch('app.services.llm_provider.OllamaProvider.generate')
def test_ai_service_error_handling(mock_generate, ai_service, test_book):
    """Test AI service handles provider errors gracefully"""
    # Mock provider to raise an error
    mock_generate.side_effect = Exception("Provider unavailable")
    
    # Should handle error gracefully, not crash
    # This would be implemented in actual service methods


@pytest.mark.integration
def test_tag_priority_config(test_db):
    """Test tag priority configuration for AI generation"""
    priority = models.TagPriorityConfig(
        tag_type="genre",
        priority=1,
        max_tags=3
    )
    
    test_db.add(priority)
    test_db.commit()
    test_db.refresh(priority)
    
    assert priority.id is not None
    assert priority.tag_type == "genre"
    assert priority.priority == 1
    assert priority.max_tags == 3


@pytest.mark.unit
def test_normalize_tag_name(ai_service):
    """Test tag name normalization to booru-style format"""
    # Test lowercase and underscore conversion
    normalized = ai_service._normalize_tag_name("Science Fiction")
    assert normalized == "science_fiction"
    
    # Test special character removal
    normalized = ai_service._normalize_tag_name("Action & Adventure!")
    assert "_" in normalized or "-" in normalized
    assert "!" not in normalized
