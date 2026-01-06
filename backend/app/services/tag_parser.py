"""
Tag expression parser for booru-style search queries.

Implements parsing and SQL query generation for tag expressions like:
- fantasy -romance
- genre:scifi tone:grimdark
- (author:"Gene Wolfe" OR author:"Ursula Le Guin") genre:fantasy
"""

import re
from typing import List, Optional, Union
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, not_
from app import models
from app.utils.tag_normalization import normalize_tag_name


@dataclass
class TagTerm:
    """Represents a single tag term in a query"""
    tag_name: str
    tag_type: Optional[str] = None
    exclude: bool = False


@dataclass
class TagQuery:
    """Represents a parsed tag query expression"""
    terms: List[Union[TagTerm, 'TagQuery']]
    operator: str = "AND"  # AND or OR


class TagExpressionParser:
    """Parser for booru-style tag expressions"""
    
    def __init__(self, db: Session):
        self.db = db
        self._aliases_cache = None
    
    def _load_aliases(self) -> dict:
        """Load all tag aliases into a lookup dictionary"""
        if self._aliases_cache is not None:
            return self._aliases_cache
        
        aliases = {}
        alias_records = self.db.query(models.TagAlias).all()
        
        for alias_record in alias_records:
            canonical_tag = self.db.query(models.Tag).get(alias_record.canonical_tag_id)
            if canonical_tag:
                aliases[normalize_tag_name(alias_record.alias)] = canonical_tag.name
        
        self._aliases_cache = aliases
        return aliases
    
    def resolve_alias(self, tag_name: str) -> str:
        """
        Resolve a tag alias to its canonical name.
        
        Args:
            tag_name: Tag name (may be an alias)
        
        Returns:
            Canonical tag name
        """
        normalized = normalize_tag_name(tag_name)
        aliases = self._load_aliases()
        return aliases.get(normalized, normalized)
    
    def parse(self, query_string: str) -> TagQuery:
        """
        Parse a tag expression string into a TagQuery structure.
        
        Args:
            query_string: Tag expression (e.g., "fantasy -romance genre:scifi")
        
        Returns:
            Parsed TagQuery object
        
        Examples:
            >>> parser.parse("fantasy -romance")
            TagQuery(terms=[TagTerm('fantasy', exclude=False), TagTerm('romance', exclude=True)], operator='AND')
            
            >>> parser.parse("genre:fantasy OR genre:scifi")
            TagQuery(terms=[TagTerm('fantasy', type='genre'), TagTerm('scifi', type='genre')], operator='OR')
        """
        if not query_string or not query_string.strip():
            return TagQuery(terms=[], operator="AND")
        
        # Handle quoted strings first by replacing them with placeholders
        quoted_pattern = r'"([^"]+)"'
        quoted_matches = list(re.finditer(quoted_pattern, query_string))
        quoted_values = []
        
        for i, match in enumerate(quoted_matches):
            placeholder = f"__QUOTED_{i}__"
            quoted_values.append(match.group(1))
            query_string = query_string.replace(match.group(0), placeholder, 1)
        
        # Split by OR operator (case insensitive)
        or_parts = re.split(r'\s+OR\s+', query_string, flags=re.IGNORECASE)
        
        if len(or_parts) > 1:
            # This is an OR query
            terms = []
            for part in or_parts:
                sub_query = self._parse_and_expression(part, quoted_values)
                if len(sub_query.terms) == 1:
                    terms.append(sub_query.terms[0])
                else:
                    terms.append(sub_query)
            return TagQuery(terms=terms, operator="OR")
        else:
            # This is an AND query
            return self._parse_and_expression(query_string, quoted_values)
    
    def _parse_and_expression(self, expr: str, quoted_values: List[str]) -> TagQuery:
        """Parse an AND expression (no OR operators)"""
        terms = []
        
        # Split by whitespace
        tokens = expr.split()
        
        for token in tokens:
            if not token:
                continue
            
            # Replace quoted placeholders
            for i, quoted_value in enumerate(quoted_values):
                token = token.replace(f"__QUOTED_{i}__", quoted_value)
            
            # Check for exclusion (-)
            exclude = token.startswith('-')
            if exclude:
                token = token[1:]
            
            # Check for type specification (type:tag)
            tag_type = None
            if ':' in token:
                parts = token.split(':', 1)
                tag_type = parts[0]
                token = parts[1]
            
            # Normalize and resolve aliases
            normalized_tag = self.resolve_alias(token)
            
            terms.append(TagTerm(
                tag_name=normalized_tag,
                tag_type=tag_type,
                exclude=exclude
            ))
        
        return TagQuery(terms=terms, operator="AND")
    
    def build_filter(self, query: TagQuery, book_query):
        """
        Build SQLAlchemy filter from parsed TagQuery.
        
        Args:
            query: Parsed TagQuery object
            book_query: Base SQLAlchemy query for books
        
        Returns:
            Modified query with tag filters applied
        """
        if not query.terms:
            return book_query
        
        filters = []
        
        for term in query.terms:
            if isinstance(term, TagQuery):
                # Nested query (from OR expression)
                sub_filter = self._build_filter_from_terms(term.terms, term.operator)
                if sub_filter is not None:
                    filters.append(sub_filter)
            else:
                # Single tag term
                tag_filter = self._build_tag_filter(term)
                if tag_filter is not None:
                    filters.append(tag_filter)
        
        if not filters:
            return book_query
        
        # Combine filters based on operator
        if query.operator == "OR":
            combined_filter = or_(*filters)
        else:
            combined_filter = and_(*filters)
        
        return book_query.filter(combined_filter)
    
    def _build_filter_from_terms(self, terms: List[Union[TagTerm, TagQuery]], operator: str):
        """Build filter from a list of terms"""
        filters = []
        
        for term in terms:
            if isinstance(term, TagQuery):
                sub_filter = self._build_filter_from_terms(term.terms, term.operator)
                if sub_filter is not None:
                    filters.append(sub_filter)
            else:
                tag_filter = self._build_tag_filter(term)
                if tag_filter is not None:
                    filters.append(tag_filter)
        
        if not filters:
            return None
        
        if operator == "OR":
            return or_(*filters)
        else:
            return and_(*filters)
    
    def _build_tag_filter(self, term: TagTerm):
        """Build SQLAlchemy filter for a single tag term"""
        # Build the base condition for tag match
        tag_conditions = [models.Tag.name == term.tag_name]
        
        if term.tag_type:
            tag_conditions.append(models.Tag.type == term.tag_type)
        
        # Subquery to check if book has this tag
        tag_subquery = self.db.query(models.Book.id).join(
            models.Book.tags
        ).filter(
            and_(*tag_conditions)
        )
        
        if term.exclude:
            # Book should NOT be in the subquery
            return models.Book.id.notin_(tag_subquery)
        else:
            # Book should be in the subquery
            return models.Book.id.in_(tag_subquery)


def parse_tag_expression(db: Session, expression: str):
    """
    Convenience function to parse a tag expression.
    
    Args:
        db: Database session
        expression: Tag expression string
    
    Returns:
        Parsed TagQuery object
    """
    parser = TagExpressionParser(db)
    return parser.parse(expression)


def apply_tag_filter(db: Session, book_query, expression: str):
    """
    Convenience function to apply tag expression filter to a book query.
    
    Args:
        db: Database session
        book_query: Base SQLAlchemy query for books
        expression: Tag expression string
    
    Returns:
        Modified query with tag filters applied
    """
    parser = TagExpressionParser(db)
    query = parser.parse(expression)
    return parser.build_filter(query, book_query)
