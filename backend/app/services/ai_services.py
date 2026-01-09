"""
AI Services for book summarization and tag generation.
Orchestrates LLM providers and text extraction for intelligent book analysis.
"""

from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from .llm_provider import create_provider, LLMProvider, LLMResponse
from .text_extractor import TextExtractor, ExtractedContent, ExtractionStrategy
from ..models import Book, Tag, AIProviderConfig, TagPriorityConfig, book_tags
from ..database import get_db


class AISummaryResult:
    """Result of AI summary generation"""
    def __init__(
        self,
        book_id: int,
        summary: str,
        original_summary: str,
        confidence: float,
        strategy_used: str,
        word_count: int
    ):
        self.book_id = book_id
        self.summary = summary
        self.original_summary = original_summary
        self.confidence = confidence
        self.strategy_used = strategy_used
        self.word_count = word_count


class AITagResult:
    """Result of AI tag generation"""
    def __init__(
        self,
        book_id: int,
        suggested_tags: List[Dict],  # [{name, type, confidence, reason}]
        existing_tags: List[str],
        applied_limits: Dict[str, int]
    ):
        self.book_id = book_id
        self.suggested_tags = suggested_tags
        self.existing_tags = existing_tags
        self.applied_limits = applied_limits


class AIService:
    """Main service for AI-powered book analysis"""
    
    def __init__(self, db: Session):
        self.db = db
        self.text_extractor = TextExtractor()
        self.provider: Optional[LLMProvider] = None
        self._load_active_provider()
    
    def _load_active_provider(self):
        """Load the currently active LLM provider"""
        active_config = self.db.query(AIProviderConfig).filter(
            AIProviderConfig.is_active == True
        ).first()
        
        if active_config:
            config = {
                "base_url": active_config.base_url,
                "model_name": active_config.model_name,
                "api_key": active_config.api_key,
                "temperature": active_config.temperature,
                "max_tokens": active_config.max_tokens,
            }
            self.provider = create_provider(active_config.provider_type, config)
            self.active_config = active_config
        else:
            self.provider = None
            self.active_config = None
    
    async def generate_summary(
        self,
        book_id: int,
        extraction_strategy: Optional[ExtractionStrategy] = None,
        overwrite_existing: bool = False
    ) -> AISummaryResult:
        """
        Generate AI summary for a book
        
        Args:
            book_id: ID of the book to summarize
            extraction_strategy: Optional override of default strategy
            overwrite_existing: Whether to consider existing summary
        
        Returns:
            AISummaryResult with generated summary
        """
        if not self.provider:
            raise RuntimeError("No active AI provider configured")
        
        # Get book
        book = self.db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise ValueError(f"Book not found: {book_id}")
        
        # Use provider's default strategy if not specified
        if extraction_strategy is None and self.active_config:
            extraction_strategy = ExtractionStrategy(self.active_config.extraction_strategy)
        
        # Extract text
        extracted = self.text_extractor.extract_text(
            book.file_path,
            strategy=extraction_strategy
        )
        
        # Build prompt
        prompt = self._build_summary_prompt(
            book=book,
            extracted=extracted,
            overwrite_existing=overwrite_existing
        )
        
        # Generate summary
        response: LLMResponse = await self.provider.generate(prompt)
        
        return AISummaryResult(
            book_id=book_id,
            summary=response.text.strip(),
            original_summary=book.description or "",
            confidence=response.confidence,
            strategy_used=extracted.strategy_used.value,
            word_count=extracted.word_count
        )
    
    async def generate_tags(
        self,
        book_id: int,
        max_tags: int = 20,
        per_type_limits: Optional[Dict[str, int]] = None,
        merge_existing: bool = True,
        tag_priorities: Optional[List[Tuple[str, int]]] = None
    ) -> AITagResult:
        """
        Generate AI tags for a book
        
        Args:
            book_id: ID of the book to tag
            max_tags: Maximum total tags to generate
            per_type_limits: Per-type tag limits override
            merge_existing: Whether to keep existing tags
            tag_priorities: Optional priority override
        
        Returns:
            AITagResult with suggested tags
        """
        if not self.provider:
            raise RuntimeError("No active AI provider configured")
        
        # Get book with existing tags
        book = self.db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise ValueError(f"Book not found: {book_id}")
        
        existing_tag_names = [tag.name for tag in book.tags]
        
        # Get tag priorities (use provided or load from DB)
        if tag_priorities is None:
            tag_priorities = self._get_tag_priorities(per_type_limits)
        
        # Extract text (use lighter strategy for tags)
        extracted = self.text_extractor.extract_text(
            book.file_path,
            strategy=ExtractionStrategy.SMART_SAMPLING  # Faster for tag generation
        )
        
        # Get library tag statistics for suggestions
        tag_stats = self._get_tag_statistics()
        
        # Build prompt
        prompt = self._build_tag_prompt(
            book=book,
            extracted=extracted,
            existing_tags=existing_tag_names,
            tag_priorities=tag_priorities,
            tag_stats=tag_stats,
            max_tags=max_tags
        )
        
        # Generate tags
        response: LLMResponse = await self.provider.generate(prompt)
        
        # Parse and filter tags
        suggested_tags = self._parse_tag_response(
            response.text,
            tag_priorities=tag_priorities,
            max_tags=max_tags
        )
        
        # Calculate applied limits
        applied_limits = {
            tag_type: limit for tag_type, _, limit in tag_priorities
        }
        
        return AITagResult(
            book_id=book_id,
            suggested_tags=suggested_tags,
            existing_tags=existing_tag_names,
            applied_limits=applied_limits
        )
    
    def _build_summary_prompt(
        self,
        book: Book,
        extracted: ExtractedContent,
        overwrite_existing: bool
    ) -> str:
        """Build prompt for summary generation"""
        # Base prompt
        prompt = f"""You are a literary analyst. Generate a concise, informative summary of the following book.

Book Title: {book.title}
"""
        
        if book.authors:
            authors = ", ".join([a.name for a in book.authors])
            prompt += f"Author(s): {authors}\n"
        
        # Include existing summary if not overwriting
        if not overwrite_existing and extracted.existing_summary:
            prompt += f"\nExisting Summary:\n{extracted.existing_summary}\n"
            prompt += "\nYou may refine or expand on the existing summary.\n"
        
        # Add extracted text
        prompt += f"\nBook Content ({extracted.word_count} words total, strategy: {extracted.strategy_used}):\n"
        prompt += f"{extracted.text[:15000]}\n"  # Limit to ~15k chars
        
        prompt += """
Generate a summary that:
- Is 150-300 words
- Captures the main plot/themes
- Mentions key characters or ideas
- Avoids spoilers
- Is engaging and informative

Summary:"""
        
        return prompt
    
    def _build_tag_prompt(
        self,
        book: Book,
        extracted: ExtractedContent,
        existing_tags: List[str],
        tag_priorities: List[Tuple[str, int, int]],  # (type, priority, max_tags)
        tag_stats: Dict,
        max_tags: int
    ) -> str:
        """Build prompt for tag generation"""
        prompt = f"""You are a book cataloging expert. Generate booru-style tags for this book.

Book Title: {book.title}
"""
        
        if book.authors:
            authors = ", ".join([a.name for a in book.authors])
            prompt += f"Author(s): {authors}\n"
        
        # Add metadata tags if available
        if extracted.metadata_tags:
            prompt += f"Existing Metadata Tags: {', '.join(extracted.metadata_tags)}\n"
        
        if existing_tags:
            prompt += f"Current Tags: {', '.join(existing_tags)}\n"
        
        # Tag type priorities and limits
        prompt += "\nTag Type Priorities and Limits:\n"
        for tag_type, priority, max_count in sorted(tag_priorities, key=lambda x: x[1]):
            prompt += f"- {tag_type}: max {max_count} tags\n"
        
        # Add sample from book
        prompt += f"\nBook Sample:\n{extracted.text[:10000]}\n"
        
        # Popular tags in library
        if tag_stats:
            popular = ", ".join([f"{name} ({count})" for name, count in tag_stats[:20]])
            prompt += f"\nPopular Tags in Library: {popular}\n"
        
        prompt += f"""
Generate {max_tags} tags maximum following these rules:

TAG FORMAT:
- Use snake_case format (e.g., "science_fiction", "female_protagonist")
- Each tag should be a single normalized word or compound word
- No spaces, use underscores

TAG TYPES (stick to these types):
- genre: main genre(s) - max {dict([(t, l) for t, _, l in tag_priorities]).get('genre', 2)}
- theme: central themes - max {dict([(t, l) for t, _, l in tag_priorities]).get('theme', 5)}
- tone: mood/atmosphere - max {dict([(t, l) for t, _, l in tag_priorities]).get('tone', 3)}
- setting: time/place - max {dict([(t, l) for t, _, l in tag_priorities]).get('setting', 5)}
- structure: narrative structure
- character_trait: protagonist traits
- other types as appropriate

IMPORTANT:
- Prioritize genre tags first (must have at least 1)
- Then theme tags
- Then other types
- Respect the maximum count for each type
- Use existing metadata tags when appropriate
- Prefer popular library tags when accurate

OUTPUT FORMAT (one per line):
type:tag_name | reason

Example:
genre:fantasy | Clear fantasy elements with magic system
theme:political_intrigue | Central focus on court politics
tone:dark | Grim atmosphere throughout
setting:medieval | Medieval-inspired world

Your tags:"""
        
        return prompt
    
    def _parse_tag_response(
        self,
        response_text: str,
        tag_priorities: List[Tuple[str, int, int]],
        max_tags: int
    ) -> List[Dict]:
        """Parse LLM tag response into structured format"""
        suggested_tags = []
        type_counts = {tag_type: 0 for tag_type, _, _ in tag_priorities}
        type_limits = {tag_type: limit for tag_type, _, limit in tag_priorities}
        
        for line in response_text.strip().split('\n'):
            line = line.strip()
            if not line or '|' not in line:
                continue
            
            try:
                tag_part, reason = line.split('|', 1)
                tag_part = tag_part.strip()
                reason = reason.strip()
                
                # Parse type:name
                if ':' in tag_part:
                    tag_type, tag_name = tag_part.split(':', 1)
                    tag_type = tag_type.strip()
                    tag_name = tag_name.strip()
                else:
                    # Default to meta if no type specified
                    tag_type = 'meta'
                    tag_name = tag_part
                
                # Check type limit
                if tag_type in type_counts:
                    if type_counts[tag_type] >= type_limits.get(tag_type, 10):
                        continue  # Skip if type limit reached
                
                # Normalize tag name
                tag_name = self._normalize_tag_name(tag_name)
                
                if tag_name:
                    suggested_tags.append({
                        'name': tag_name,
                        'type': tag_type,
                        'confidence': 0.8,  # Default confidence
                        'reason': reason
                    })
                    
                    if tag_type in type_counts:
                        type_counts[tag_type] += 1
                    
                    # Stop if we've reached max total tags
                    if len(suggested_tags) >= max_tags:
                        break
                        
            except Exception as e:
                print(f"Warning: Failed to parse tag line: {line} - {e}")
                continue
        
        return suggested_tags
    
    def _normalize_tag_name(self, tag: str) -> str:
        """Normalize tag to booru-style format"""
        import re
        tag = tag.lower().strip()
        tag = re.sub(r'[\s\-]+', '_', tag)
        tag = re.sub(r'[^a-z0-9_]', '', tag)
        tag = tag.strip('_')
        tag = re.sub(r'_+', '_', tag)
        return tag
    
    def _get_tag_priorities(
        self,
        per_type_limits: Optional[Dict[str, int]] = None
    ) -> List[Tuple[str, int, int]]:
        """
        Get tag priorities from database or use defaults
        
        Returns:
            List of (tag_type, priority, max_tags) tuples
        """
        # Query global defaults (user_id is NULL)
        priorities = self.db.query(TagPriorityConfig).filter(
            TagPriorityConfig.user_id == None
        ).order_by(TagPriorityConfig.priority).all()
        
        result = []
        for priority_config in priorities:
            max_tags = priority_config.max_tags
            # Apply override if provided
            if per_type_limits and priority_config.tag_type in per_type_limits:
                max_tags = per_type_limits[priority_config.tag_type]
            
            result.append((
                priority_config.tag_type,
                priority_config.priority,
                max_tags
            ))
        
        return result
    
    def _get_tag_statistics(self) -> List[Tuple[str, int]]:
        """Get most popular tags in library for suggestions"""
        # Query top tags by usage count
        top_tags = self.db.query(Tag.name, Tag.usage_count).filter(
            Tag.usage_count > 0
        ).order_by(Tag.usage_count.desc()).limit(50).all()
        
        return [(name, count) for name, count in top_tags]
