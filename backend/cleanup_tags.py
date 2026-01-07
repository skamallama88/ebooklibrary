"""
Tag data cleanup script for booru-style tagging system.

This script:
1. Normalizes tag names to snake_case
2. Assigns appropriate tag types (genre, setting, etc.)
3. Creates common aliases
4. Merges duplicate tags
5. Removes unused tags
"""

from app.database import engine
from app.utils.tag_normalization import normalize_tag_name
from sqlalchemy import text
import re

# Tag type mapping rules
TAG_TYPE_RULES = {
    'genre': [
        'fantasy', 'science_fiction', 'scifi', 'mystery', 'thriller', 'romance', 
        'horror', 'historical_fiction', 'literary_fiction', 'young_adult', 'dystopian',
        'urban_fantasy', 'epic_fantasy', 'space_opera', 'cyberpunk', 'steampunk',
        'domestic_fiction', 'love_stories', 'courtship'
    ],
    'setting': [
        'england', 'london', 'space', 'future', 'medieval', 'victorian',
        'contemporary', 'historical'
    ],
    'theme': [
        'coming_of_age', 'revenge', 'redemption', 'survival', 'war',
        'social_classes', 'sisters', 'young_women'
    ],
    'format': [
        'audiobook', 'ebook', 'hardcover', 'paperback'
    ],
}

# Common aliases to create
COMMON_ALIASES = {
    'science_fiction': ['sci-fi', 'scifi', 'sf'],
    'fantasy': ['fant'],
    'young_adult': ['ya'],
}

def classify_tag_type(normalized_name: str, original_name: str) -> str:
    """Determine the appropriate type for a tag based on its name."""
    
    # Check each type's keywords
    for tag_type, keywords in TAG_TYPE_RULES.items():
        for keyword in keywords:
            if keyword in normalized_name:
                return tag_type
    
    # Check for common patterns
    if re.search(r'fiction$', normalized_name):
        # Tags ending in "fiction" are often settings or genres
        if any(word in normalized_name for word in ['england', 'london', 'space', 'historical']):
            return 'setting'
        return 'genre'
    
    # Default to meta
    return 'meta'

def cleanup_tags():
    """Main cleanup function."""
    with engine.connect() as conn:
        trans = conn.begin()
        
        try:
            print("🧹 Starting tag cleanup...\n")
            
            # Get all tags
            tags = conn.execute(text("SELECT id, name, type, usage_count FROM tags")).fetchall()
            
            print(f"Found {len(tags)} tags\n")
            
            # Track changes
            normalized_count = 0
            retype_count = 0
            merged_count = 0
            alias_count = 0
            
            # Dictionary to track normalized names
            normalized_tags = {}
            
            for tag_id, name, current_type, usage_count in tags:
                # Normalize the name
                normalized_name = normalize_tag_name(name)
                
                # Determine proper type
                suggested_type = classify_tag_type(normalized_name, name)
                
                # Check if we need to rename or merge
                if normalized_name != name:
                    print(f"📝 Normalize: '{name}' → '{normalized_name}'")
                    
                    # Check if normalized name already exists
                    if normalized_name in normalized_tags:
                        # Merge with existing tag
                        existing_id = normalized_tags[normalized_name]
                        print(f"   ⚠️  Merging with existing tag (ID {existing_id})")
                        
                        # Move all book associations to the existing tag
                        conn.execute(text("""
                            UPDATE book_tags 
                            SET tag_id = :new_id 
                            WHERE tag_id = :old_id
                            AND NOT EXISTS (
                                SELECT 1 FROM book_tags bt2 
                                WHERE bt2.tag_id = :new_id AND bt2.book_id = book_tags.book_id
                            )
                        """), {"new_id": existing_id, "old_id": tag_id})
                        
                        # Delete the duplicate tag
                        conn.execute(text("DELETE FROM book_tags WHERE tag_id = :id"), {"id": tag_id})
                        conn.execute(text("DELETE FROM tags WHERE id = :id"), {"id": tag_id})
                        merged_count += 1
                        continue
                    else:
                        # Just rename
                        conn.execute(text("""
                            UPDATE tags SET name = :new_name WHERE id = :id
                        """), {"new_name": normalized_name, "id": tag_id})
                        normalized_count += 1
                        normalized_tags[normalized_name] = tag_id
                else:
                    normalized_tags[normalized_name] = tag_id
                
                # Update type if needed
                if suggested_type != current_type:
                    print(f"🏷️  Retype: '{normalized_name}' from '{current_type}' → '{suggested_type}'")
                    conn.execute(text("""
                        UPDATE tags SET type = :new_type WHERE id = :id
                    """), {"new_type": suggested_type, "id": tag_id})
                    retype_count += 1
                
                # Create aliases for common tags
                if normalized_name in COMMON_ALIASES:
                    for alias in COMMON_ALIASES[normalized_name]:
                        # Check if alias already exists
                        existing = conn.execute(text("""
                            SELECT id FROM tag_aliases WHERE alias = :alias
                        """), {"alias": alias}).fetchone()
                        
                        if not existing:
                            conn.execute(text("""
                                INSERT INTO tag_aliases (alias, canonical_tag_id)
                                VALUES (:alias, :tag_id)
                            """), {"alias": alias, "tag_id": tag_id})
                            print(f"🔗 Created alias: '{alias}' → '{normalized_name}'")
                            alias_count += 1
            
            # Recalculate all usage counts
            print("\n📊 Recalculating usage counts...")
            conn.execute(text("""
                UPDATE tags
                SET usage_count = (
                    SELECT COUNT(*)
                    FROM book_tags
                    WHERE book_tags.tag_id = tags.id
                )
            """))
            
            # Remove tags with 0 usage
            removed = conn.execute(text("""
                DELETE FROM tags WHERE usage_count = 0 RETURNING name
            """)).fetchall()
            
            if removed:
                print(f"\n🗑️  Removed {len(removed)} unused tags:")
                for (name,) in removed:
                    print(f"   - {name}")
            
            trans.commit()
            
            # Print summary
            print("\n" + "="*60)
            print("✅ Tag cleanup complete!")
            print("="*60)
            print(f"Normalized: {normalized_count} tags")
            print(f"Retyped: {retype_count} tags")
            print(f"Merged: {merged_count} duplicate tags")
            print(f"Aliases created: {alias_count}")
            print(f"Removed: {len(removed)} unused tags")
            
            # Show final tag list
            print("\n📋 Final tag list:")
            final_tags = conn.execute(text("""
                SELECT name, type, usage_count 
                FROM tags 
                ORDER BY usage_count DESC, name
            """)).fetchall()
            
            for name, tag_type, count in final_tags:
                print(f"   {name:40s} [{tag_type:10s}] ({count} books)")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Cleanup failed: {e}")
            raise

if __name__ == "__main__":
    cleanup_tags()
