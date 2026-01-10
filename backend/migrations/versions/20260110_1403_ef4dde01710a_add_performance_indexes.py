"""add_performance_indexes

Revision ID: ef4dde01710a
Revises: 20260110_0001
Create Date: 2026-01-10 14:03:42.524104

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef4dde01710a'
down_revision: Union[str, None] = '20260110_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Books Table Indexes
    op.create_index('idx_books_format', 'books', ['format'])
    op.create_index('idx_books_language', 'books', ['language'])
    op.create_index('idx_books_publisher', 'books', ['publisher'])
    op.create_index('idx_books_series', 'books', ['series'])
    op.create_index('idx_books_rating', 'books', ['rating'])
    op.create_index('idx_books_created_at', 'books', ['created_at'])
    op.create_index('idx_books_word_count', 'books', ['word_count'])

    # Tags Table Indexes
    op.create_index('idx_tags_usage_count_desc', 'tags', [sa.text('usage_count DESC')])
    op.create_index('idx_tags_type_usage', 'tags', ['type', sa.text('usage_count DESC')])
    op.create_index('idx_tags_type_name', 'tags', ['type', 'name'])

    # Reading Progress Table Indexes
    op.create_index('idx_progress_user_last_read', 'reading_progress', ['user_id', sa.text('last_read DESC')])
    op.create_index('idx_progress_user_book_unique', 'reading_progress', ['user_id', 'book_id'], unique=True)
    op.create_index('idx_progress_is_finished', 'reading_progress', ['is_finished'])

    # Collection Books Index
    op.create_index('idx_collection_books_position', 'collection_books', ['collection_id', 'position'])


def downgrade() -> None:
    # Drop Indexes
    op.drop_index('idx_collection_books_position')
    op.drop_index('idx_progress_is_finished')
    op.drop_index('idx_progress_user_book_unique')
    op.drop_index('idx_progress_user_last_read')
    op.drop_index('idx_tags_type_name')
    op.drop_index('idx_tags_type_usage')
    op.drop_index('idx_tags_usage_count_desc')
    op.drop_index('idx_books_word_count')
    op.drop_index('idx_books_created_at')
    op.drop_index('idx_books_rating')
    op.drop_index('idx_books_series')
    op.drop_index('idx_books_publisher')
    op.drop_index('idx_books_language')
    op.drop_index('idx_books_format')
