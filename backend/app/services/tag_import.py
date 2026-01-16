from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import models
from ..utils.tag_normalization import normalize_tag_name, is_valid_tag_name

class TagImportService:
    def __init__(self, db: Session):
        self.db = db

    def process_metadata_to_tags(self, book_id: int, metadata: Dict[str, Any]) -> List[models.Tag]:
        """
        Extract tags from metadata fields and associate them with the book.
        
        Metadata fields processed:
        - authors -> author
        - tags (subjects) -> genre/theme (default genre)
        - series -> series
        - language -> language
        - format -> format
        - publisher -> meta
        """
        book = self.db.query(models.Book).filter(models.Book.id == book_id).first()
        if not book:
            return []

        tags_to_add = []

        # Process Authors
        for author in metadata.get("authors", []):
            tags_to_add.append(self.get_or_create_tag(author, "author"))

        # Process Subjects (Tags)
        for subject in metadata.get("tags", []):
            tags_to_add.append(self.get_or_create_tag(subject, "genre"))

        # Process Series
        series = metadata.get("series")
        if series:
            tags_to_add.append(self.get_or_create_tag(series, "series"))

        # Process Language
        language = metadata.get("language")
        if language:
            tags_to_add.append(self.get_or_create_tag(language, "language"))

        # Process Format
        file_format = metadata.get("format")
        if file_format:
            tags_to_add.append(self.get_or_create_tag(file_format, "format"))

        # Process Publisher
        publisher = metadata.get("publisher")
        if publisher:
            tags_to_add.append(self.get_or_create_tag(publisher, "meta"))

        # Filter out None values and duplicates
        seen_ids = set()
        final_tags = []
        for tag in tags_to_add:
            if tag and tag.id not in seen_ids:
                final_tags.append(tag)
                seen_ids.add(tag.id)

        # Update book tags
        # We don't overwrite existing tags here, we add new ones from import
        # But for a fresh import, this is perfect.
        # For re-importing, we might want to be careful.
        # The prompt says "import any existing tags, genres, etc from books and convert"
        
        # Check current book tags to avoid duplicates in association
        current_tag_ids = {t.id for t in book.tags}
        for tag in final_tags:
            if tag.id not in current_tag_ids:
                book.tags.append(tag)
                # Increment usage count
                tag.usage_count = (tag.usage_count or 0) + 1

        self.db.flush()
        return final_tags

    def get_or_create_tag(self, raw_name: str, tag_type: str) -> Optional[models.Tag]:
        """Normalize name and get or create tag with specified type."""
        if not raw_name or not is_valid_tag_name(raw_name):
            return None

        normalized_name = normalize_tag_name(raw_name)
        
        # Find existing tag
        tag = self.db.query(models.Tag).filter(
            models.Tag.name == normalized_name,
            models.Tag.type == tag_type
        ).first()

        if not tag:
            # Create new tag
            tag = models.Tag(
                name=normalized_name,
                type=tag_type,
                usage_count=0
            )
            self.db.add(tag)
            self.db.flush()
            self.db.refresh(tag)

        return tag
