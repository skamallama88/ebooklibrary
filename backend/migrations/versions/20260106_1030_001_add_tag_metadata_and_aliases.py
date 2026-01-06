"""Add tag metadata and aliases for booru-style tagging

Revision ID: 001
Revises: 
Create Date: 2026-01-06 10:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to tags table
    op.add_column('tags', sa.Column('type', sa.String(), nullable=False, server_default='meta'))
    op.add_column('tags', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('tags', sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('tags', sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()))
    op.add_column('tags', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create index on tag type and usage_count for performance
    op.create_index('ix_tags_type', 'tags', ['type'])
    op.create_index('ix_tags_usage_count', 'tags', ['usage_count'])
    
    # Create temporary table for book_tags with new columns
    op.create_table(
        'book_tags_new',
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', sa.Integer(), sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('source', sa.String(), nullable=False, server_default='manual'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()),
    )
    
    # Copy existing data from book_tags to book_tags_new
    op.execute("""
        INSERT INTO book_tags_new (book_id, tag_id, confidence, source, created_at)
        SELECT book_id, tag_id, 1.0, 'manual', NOW()
        FROM book_tags
    """)
    
    # Drop old book_tags table
    op.drop_table('book_tags')
    
    # Rename new table to book_tags
    op.rename_table('book_tags_new', 'book_tags')
    
    # Create tag_aliases table
    op.create_table(
        'tag_aliases',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('alias', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('canonical_tag_id', sa.Integer(), sa.ForeignKey('tags.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=func.now()),
    )
    
    # Update usage_count for all existing tags
    op.execute("""
        UPDATE tags
        SET usage_count = (
            SELECT COUNT(*)
            FROM book_tags
            WHERE book_tags.tag_id = tags.id
        )
    """)


def downgrade() -> None:
    # Drop tag_aliases table
    op.drop_table('tag_aliases')
    
    # Create old book_tags structure
    op.create_table(
        'book_tags_old',
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag_id', sa.Integer(), sa.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True),
    )
    
    # Copy data back (losing confidence and source info)
    op.execute("""
        INSERT INTO book_tags_old (book_id, tag_id)
        SELECT book_id, tag_id
        FROM book_tags
    """)
    
    # Drop new book_tags
    op.drop_table('book_tags')
    
    # Rename old table back
    op.rename_table('book_tags_old', 'book_tags')
    
    # Drop indexes from tags
    op.drop_index('ix_tags_usage_count', 'tags')
    op.drop_index('ix_tags_type', 'tags')
    
    # Remove new columns from tags table
    op.drop_column('tags', 'updated_at')
    op.drop_column('tags', 'created_at')
    op.drop_column('tags', 'usage_count')
    op.drop_column('tags', 'description')
    op.drop_column('tags', 'type')
