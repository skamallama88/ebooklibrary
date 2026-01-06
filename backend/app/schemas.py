from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# Tag schemas
class TagBase(BaseModel):
    name: str  # Normalized snake_case name
    type: str = "meta"  # genre, theme, setting, tone, structure, character_trait, series, author, language, format, status, meta
    description: Optional[str] = None

class TagCreate(TagBase):
    aliases: List[str] = []  # Alternative names for this tag

class Tag(TagBase):
    id: int
    usage_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class TagWithAliases(Tag):
    """Tag schema with aliases included"""
    aliases: List[str] = []

class TagAutocomplete(BaseModel):
    """Compact tag schema for autocomplete responses"""
    id: int
    name: str
    type: str
    usage_count: int
    model_config = ConfigDict(from_attributes=True)

class TagDetail(TagWithAliases):
    """Extended tag information for tag detail pages"""
    related_tags: List['TagAutocomplete'] = []  # Frequently co-occurring tags

class TagAliasBase(BaseModel):
    alias: str

class TagAliasCreate(TagAliasBase):
    canonical_tag_id: int

class TagAlias(TagAliasBase):
    id: int
    canonical_tag_id: int
    created_at: datetime
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
    word_count: Optional[int] = None

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
    last_read: Optional[datetime] = None
    
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
    recently_read_limit_days: int = 30

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
    recently_read_limit_days: Optional[int] = None

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

# Bulk tag operation schemas
class BulkTagOperation(BaseModel):
    book_ids: List[int]
    tag_names: List[str]
    operation: str  # "add" or "remove"
    source: str = "manual"  # manual, auto, import

class BulkTagResult(BaseModel):
    affected_books: int
    tags_modified: List[str]
    errors: List[str] = []

# Auto-tagging schemas
class AutoTagRule(BaseModel):
    id: Optional[int] = None
    name: str
    condition_field: str  # format, language, series, etc.
    condition_operator: str  # equals, not_equals, contains, not_null, null
    condition_value: Optional[str] = None
    tag_name: str
    tag_type: str = "meta"
    enabled: bool = True

class AutoTagRuleCreate(BaseModel):
    name: str
    condition_field: str
    condition_operator: str
    condition_value: Optional[str] = None
    tag_name: str
    tag_type: str = "meta"
    enabled: bool = True

class AutoTagResult(BaseModel):
    rules_applied: int
    books_affected: int
    tags_added: int

