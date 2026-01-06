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

book_tags = Table(
    "book_tags",
    Base.metadata,
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
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
    name = Column(String, unique=True, index=True, nullable=False)
    
    books = relationship("Book", secondary=book_tags, back_populates="tags")

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    authors = relationship("Author", secondary=book_authors, back_populates="books")
    tags = relationship("Tag", secondary=book_tags, back_populates="books")
    progress = relationship("ReadingProgress", back_populates="book")
    collections = relationship("Collection", secondary=collection_books, back_populates="books")
    bookmarks = relationship("Bookmark", back_populates="book")

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
