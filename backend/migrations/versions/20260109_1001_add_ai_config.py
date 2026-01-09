"""Add AI provider config and tag priority config

Revision ID: 20260109_1001_add_ai_config
Revises: 20260106_1030_001_add_tag_metadata_and_aliases
Create Date: 2026-01-09 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260109_1001_add_ai_config'
down_revision = '20260106_1030_001_add_tag_metadata_and_aliases'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ai_provider_config table
    op.create_table(
        'ai_provider_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider_type', sa.String(), nullable=False),
        sa.Column('api_key', sa.String(), nullable=True),
        sa.Column('base_url', sa.String(), nullable=True),
        sa.Column('model_name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('max_tokens', sa.Integer(), nullable=True, server_default='2048'),
        sa.Column('temperature', sa.Float(), nullable=True, server_default='0.7'),
        sa.Column('extraction_strategy', sa.String(), nullable=True, server_default='smart_sampling'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_provider_config_id'), 'ai_provider_config', ['id'], unique=False)
    
    # Create tag_priority_config table
    op.create_table(
        'tag_priority_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tag_type', sa.String(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('max_tags', sa.Integer(), nullable=True, server_default='10'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tag_priority_config_id'), 'tag_priority_config', ['id'], unique=False)
    op.create_index(op.f('ix_tag_priority_config_tag_type'), 'tag_priority_config', ['tag_type'], unique=False)
    
    # Insert default global tag priority configuration
    op.execute("""
        INSERT INTO tag_priority_config (tag_type, priority, max_tags, user_id) VALUES
        ('genre', 1, 2, NULL),
        ('theme', 2, 5, NULL),
        ('tone', 3, 3, NULL),
        ('setting', 4, 5, NULL),
        ('structure', 5, 2, NULL),
        ('character_trait', 6, 5, NULL),
        ('series', 7, 1, NULL),
        ('author', 8, 3, NULL),
        ('language', 9, 1, NULL),
        ('format', 10, 1, NULL),
        ('status', 11, 2, NULL),
        ('meta', 12, 10, NULL)
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_tag_priority_config_tag_type'), table_name='tag_priority_config')
    op.drop_index(op.f('ix_tag_priority_config_id'), table_name='tag_priority_config')
    op.drop_table('tag_priority_config')
    
    op.drop_index(op.f('ix_ai_provider_config_id'), table_name='ai_provider_config')
    op.drop_table('ai_provider_config')
