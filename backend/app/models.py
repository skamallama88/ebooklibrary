from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Many-to-many associations
book_authors = Table(
    "book_authors",
    Base.metadata,
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("author_id", Integer, ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True),
)

# Enhanced book-tags junction table with metadata
book_tags = Table(
    "book_tags",
    Base.metadata,
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Column("confidence", Float, default=1.0),  # Confidence score for auto-tagged books
    Column("source", String, default="manual"),  # manual, auto, import
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

collection_books = Table(
    "collection_books",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("position", Integer, default=0), # Order within collection
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # User preferences
    theme_preference = Column(String, default="auto")  # light, dark, auto
    font_size = Column(Integer, default=16)  # Reading font size
    font_family = Column(String, default="serif")  # serif, sans-serif
    page_layout = Column(String, default="paginated")  # paginated, scrolled, two-page
    notifications_enabled = Column(Boolean, default=True)
    recently_read_limit_days = Column(Integer, default=30)
    
    progress = relationship("ReadingProgress", back_populates="user")
    collections = relationship("Collection", back_populates="owner")
    bookmarks = relationship("Bookmark", back_populates="user")

class Author(Base):
    __tablename__ = "authors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    books = relationship("Book", secondary=book_authors, back_populates="authors")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # Normalized snake_case
    type = Column(String, index=True, nullable=False, default="meta")  # genre, theme, setting, tone, etc.
    description = Column(Text, nullable=True)  # Tag description and usage notes
    usage_count = Column(Integer, default=0, index=True)  # Number of books with this tag
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    books = relationship("Book", secondary=book_tags, back_populates="tags")
    aliases = relationship("TagAlias", back_populates="canonical_tag", cascade="all, delete-orphan")

class TagAlias(Base):
    __tablename__ = "tag_aliases"
    id = Column(Integer, primary_key=True, index=True)
    alias = Column(String, unique=True, index=True, nullable=False)  # Alternative name (e.g., "sci-fi")
    canonical_tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    canonical_tag = relationship("Tag", back_populates="aliases")

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    file_path = Column(String, unique=True, nullable=False)
    cover_path = Column(String)
    format = Column(String)
    file_size = Column(Integer)
    published_date = Column(DateTime)
    publisher = Column(String)
    series = Column(String)
    series_index = Column(Integer)
    language = Column(String)
    description = Column(Text)
    rating = Column(Float, default=0.0)
    word_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    authors = relationship("Author", secondary=book_authors, back_populates="books")
    tags = relationship("Tag", secondary=book_tags, back_populates="books")
    progress = relationship("ReadingProgress", back_populates="book")
    collections = relationship("Collection", secondary=collection_books, back_populates="books")
    bookmarks = relationship("Bookmark", back_populates="book")
    
    # Duplicate handling
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("books.id"), nullable=True)
    duplicate_of = relationship("Book", remote_side=[id])

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="collections")
    books = relationship("Book", secondary=collection_books, back_populates="collections")

class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    cfi = Column(String) # For EPUB reading position
    percentage = Column(Float, default=0.0)
    last_read = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_finished = Column(Integer, default=0)
    
    user = relationship("User", back_populates="progress")
    book = relationship("Book", back_populates="progress")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    cfi = Column(String, nullable=False)
    label = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="bookmarks")
    book = relationship("Book", back_populates="bookmarks")

class AIProviderConfig(Base):
    __tablename__ = "ai_provider_config"
    id = Column(Integer, primary_key=True, index=True)
    provider_type = Column(String, nullable=False)  # ollama, openai, anthropic
    api_key = Column(String, nullable=True)  # Encrypted, optional for Ollama
    base_url = Column(String, nullable=True)  # For Ollama - user can input custom IP/URL
    model_name = Column(String, nullable=False)  # Selected from available models
    is_active = Column(Boolean, default=False)  # Only one provider can be active
    max_tokens = Column(Integer, default=2048)
    temperature = Column(Float, default=0.7)
    extraction_strategy = Column(String, default="smart_sampling")  # full, smart_sampling, rolling_summary, metadata_only
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TagPriorityConfig(Base):
    __tablename__ = "tag_priority_config"
    id = Column(Integer, primary_key=True, index=True)
    tag_type = Column(String, nullable=False, index=True)  # genre, theme, tone, setting, etc.
    priority = Column(Integer, nullable=False)  # Lower number = higher priority
    max_tags = Column(Integer, default=10)  # Per-type limit
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for global defaults
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AIPromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # summary, tags
    template = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
