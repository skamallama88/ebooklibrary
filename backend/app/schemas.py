from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# Base schemas
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AuthorBase(BaseModel):
    name: str

class AuthorCreate(AuthorBase):
    pass

class Author(AuthorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Collection schemas
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    book_ids: List[int] = []

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    book_ids: Optional[List[int]] = None

# Book schemas
class BookBase(BaseModel):
    title: str
    format: Optional[str] = None
    file_size: Optional[int] = None
    published_date: Optional[datetime] = None
    publisher: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    rating: float = 0.0

class BookCreate(BookBase):
    authors: List[str] = []
    tags: List[str] = []

class BookUpdate(BaseModel):
    title: Optional[str] = None
    format: Optional[str] = None
    published_date: Optional[datetime] = None
    publisher: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    rating: Optional[float] = None
    authors: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class Book(BookBase):
    id: int
    file_path: str
    cover_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    authors: List[Author] = []
    tags: List[Tag] = []
    collections: List['Collection'] = []
    model_config = ConfigDict(from_attributes=True)

class PaginatedBookList(BaseModel):
    items: List[Book]
    total: int
    page: int
    limit: int

class Collection(CollectionBase):
    id: int
    owner_id: int
    books: List[Book] = []
    model_config = ConfigDict(from_attributes=True)

# Progress schemas
class ProgressBase(BaseModel):
    cfi: Optional[str] = None
    percentage: float = 0.0
    is_finished: int = 0

class ProgressUpdate(ProgressBase):
    pass

class Progress(ProgressBase):
    id: int
    user_id: int
    book_id: int
    last_read: datetime
    model_config = ConfigDict(from_attributes=True)

# User schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Bookmark schemas
class BookmarkBase(BaseModel):
    cfi: str
    label: Optional[str] = None

class BookmarkCreate(BookmarkBase):
    pass

class Bookmark(BookmarkBase):
    id: int
    user_id: int
    book_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

