"""
Direct SQL migration script for booru-style tagging system.
Adds new columns to tags, upgrades book_tags, and creates tag_aliases table.
"""

from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            print("Starting migration...")
            
            # 1. Add new columns to tags table
            print("Adding columns to tags table...")
            conn.execute(text("""
                ALTER TABLE tags 
                ADD COLUMN IF NOT EXISTS type VARCHAR NOT NULL DEFAULT 'meta',
                ADD COLUMN IF NOT EXISTS description TEXT,
                ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
            """))
            
            # 2. Create indexes
            print("Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_tags_type ON tags(type)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_tags_usage_count ON tags(usage_count)
            """))
            
            # 3. Create new book_tags table with additional columns
            print("Upgrading book_tags table...")
            
            # Check if confidence column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='book_tags' AND column_name='confidence'
            """))
            
            if not result.fetchone():
                conn.execute(text("""
                    ALTER TABLE book_tags
                    ADD COLUMN confidence FLOAT NOT NULL DEFAULT 1.0,
                    ADD COLUMN source VARCHAR NOT NULL DEFAULT 'manual',
                    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """))
            else:
                print("book_tags already has new columns, skipping...")
            
            # 4. Create tag_aliases table if it doesn't exist
            print("Creating tag_aliases table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tag_aliases (
                    id SERIAL PRIMARY KEY,
                    alias VARCHAR UNIQUE NOT NULL,
                    canonical_tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_tag_aliases_alias ON tag_aliases(alias)
            """))
            
            # 5. Update usage_count for existing tags
            print("Calculating usage counts...")
            conn.execute(text("""
                UPDATE tags
                SET usage_count = (
                    SELECT COUNT(*)
                    FROM book_tags
                    WHERE book_tags.tag_id = tags.id
                )
            """))
            
            # Commit transaction
            trans.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    run_migration()
