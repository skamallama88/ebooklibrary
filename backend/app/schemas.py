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
    series: Optional[str] = None
    series_index: Optional[int] = None
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
    series: Optional[str] = None
    series_index: Optional[int] = None
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

class BookWithProgress(Book):
    """Book schema extended with user-specific reading progress"""
    progress_percentage: Optional[float] = None
    is_read: bool = False
    
class PaginatedBookListWithProgress(BaseModel):
    items: List[BookWithProgress]
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

# User settings schemas
class ReadingPreferences(BaseModel):
    font_size: int = 16
    font_family: str = "serif"  # serif, sans-serif
    page_layout: str = "paginated"  # paginated, scrolled, two-page

class NotificationPreferences(BaseModel):
    notifications_enabled: bool = True

class UserSettings(BaseModel):
    username: str
    email: str
    theme_preference: str = "auto"  # light, dark, auto
    reading_preferences: ReadingPreferences
    notification_preferences: NotificationPreferences

class UserSettingsUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    theme_preference: Optional[str] = None
    font_size: Optional[int] = None
    font_family: Optional[str] = None
    page_layout: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class UserListItem(BaseModel):
    id: int
    username: str
    email: str
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

