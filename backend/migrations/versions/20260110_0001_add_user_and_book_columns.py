"""Add recently_read_limit_days and word_count columns

Revision ID: 20260110_0001
Revises: 20260109_2029_b45b8f2cd21a
Create Date: 2026-01-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260110_0001'
down_revision = 'b45b8f2cd21a'
branch_labels = None
depends_on = None


def upgrade():
    # Add recently_read_limit_days to users table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='users' AND column_name='recently_read_limit_days'
            ) THEN
                ALTER TABLE users ADD COLUMN recently_read_limit_days INTEGER DEFAULT 30;
            END IF;
        END $$;
    """)
    
    # Add word_count to books table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='books' AND column_name='word_count'
            ) THEN
                ALTER TABLE books ADD COLUMN word_count INTEGER;
            END IF;
        END $$;
    """)


def downgrade():
    # Remove word_count from books
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='books' AND column_name='word_count'
            ) THEN
                ALTER TABLE books DROP COLUMN word_count;
            END IF;
        END $$;
    """)
    
    # Remove recently_read_limit_days from users
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='users' AND column_name='recently_read_limit_days'
            ) THEN
                ALTER TABLE users DROP COLUMN recently_read_limit_days;
            END IF;
        END $$;
    """)
