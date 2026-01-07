"""
Utility script to recalculate all tag usage counts from actual book_tags data.
Run this after migration or when counts get out of sync.
"""

from app.database import engine
from sqlalchemy import text

def recalculate_all_usage_counts():
    """Recalculate usage_count for all tags based on actual book_tags relationships."""
    with engine.connect() as conn:
        trans = conn.begin()
        
        try:
            print("Recalculating tag usage counts...")
            
            # Update all tags' usage_count based on actual book_tags count
            result = conn.execute(text("""
                UPDATE tags
                SET usage_count = (
                    SELECT COUNT(*)
                    FROM book_tags
                    WHERE book_tags.tag_id = tags.id
                )
            """))
            
            # Get updated counts for reporting
            counts = conn.execute(text("""
                SELECT name, usage_count 
                FROM tags 
                WHERE usage_count > 0
                ORDER BY usage_count DESC, name
            """))
            
            trans.commit()
            
            print("\nUpdated tag usage counts:")
            for row in counts:
                print(f"  {row[0]}: {row[1]}")
            
            print("\n✅ Usage count recalculation complete!")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Recalculation failed: {e}")
            raise

if __name__ == "__main__":
    recalculate_all_usage_counts()
