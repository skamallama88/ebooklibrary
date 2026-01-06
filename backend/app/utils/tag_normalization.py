"""
Tag normalization utilities for booru-style tagging system.

Handles conversion between various tag formats:
- User input → normalized snake_case storage format
- Normalized tags → human-readable display names
"""

import re
from typing import Dict

# Display name exceptions for special cases (acronyms, proper nouns, etc.)
DISPLAY_EXCEPTIONS: Dict[str, str] = {
    "lgbtq": "LGBTQ+",
    "ai": "AI",
    "ml": "ML",
    "scifi": "Sci-Fi",
    "ya": "YA",
    "isbn": "ISBN",
    "ui": "UI",
    "ux": "UX",
    "api": "API",
    "pdf": "PDF",
    "epub": "EPUB",
    "mobi": "MOBI",
    "html": "HTML",
    "css": "CSS",
    "javascript": "JavaScript",
    "python": "Python",
}


def normalize_tag_name(raw_name: str) -> str:
    """
    Normalize a tag name to snake_case format following booru conventions.
    
    Normalization rules:
    1. Convert to lowercase
    2. Replace slashes with underscores
    3. Replace hyphens and spaces with underscores
    4. Remove special characters (keep only alphanumeric and underscores)
    5. Collapse multiple consecutive underscores to single underscore
    6. Trim leading/trailing underscores
    
    Args:
        raw_name: Raw tag name from user input
    
    Returns:
        Normalized tag name in snake_case format
    
    Examples:
        >>> normalize_tag_name("Science Fiction")
        'science_fiction'
        >>> normalize_tag_name("Action/Adventure")
        'action_adventure'
        >>> normalize_tag_name("sci-fi")
        'sci_fi'
        >>> normalize_tag_name("Mystery & Thriller")
        'mystery_thriller'
        >>> normalize_tag_name("space  opera")
        'space_opera'
        >>> normalize_tag_name("LGBTQ+")
        'lgbtq'
    """
    if not raw_name:
        return ""
    
    # Convert to lowercase
    normalized = raw_name.lower()
    
    # Replace slashes with underscores
    normalized = normalized.replace('/', '_')
    
    # Replace hyphens and spaces with underscores
    normalized = normalized.replace('-', '_').replace(' ', '_')
    
    # Remove all special characters except alphanumeric and underscores
    normalized = re.sub(r'[^a-z0-9_]', '', normalized)
    
    # Collapse multiple consecutive underscores to single underscore
    normalized = re.sub(r'_+', '_', normalized)
    
    # Trim leading/trailing underscores
    normalized = normalized.strip('_')
    
    return normalized


def denormalize_tag_name(normalized_name: str, custom_display: str = None) -> str:
    """
    Generate display name from normalized tag name.
    
    If custom_display is provided, use it. Otherwise, convert snake_case
    to Title Case, checking exceptions dictionary for special cases.
    
    Args:
        normalized_name: Normalized snake_case tag name
        custom_display: Optional custom display name override
    
    Returns:
        Human-readable display name
    
    Examples:
        >>> denormalize_tag_name("science_fiction")
        'Science Fiction'
        >>> denormalize_tag_name("lgbtq")
        'LGBTQ+'
        >>> denormalize_tag_name("action_adventure")
        'Action Adventure'
        >>> denormalize_tag_name("scifi", custom_display="Sci-Fi")
        'Sci-Fi'
    """
    if custom_display:
        return custom_display
    
    # Check if it's in the exceptions dictionary
    if normalized_name in DISPLAY_EXCEPTIONS:
        return DISPLAY_EXCEPTIONS[normalized_name]
    
    # Convert snake_case to Title Case
    words = normalized_name.split('_')
    
    # Check each word for exceptions
    display_words = []
    for word in words:
        if word in DISPLAY_EXCEPTIONS:
            display_words.append(DISPLAY_EXCEPTIONS[word])
        else:
            display_words.append(word.capitalize())
    
    return ' '.join(display_words)


def is_valid_tag_name(name: str) -> bool:
    """
    Check if a tag name is valid (after normalization).
    
    Valid tag names:
    - Must not be empty
    - Must contain at least one alphanumeric character
    - Should be at least 2 characters long
    
    Args:
        name: Tag name to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not name:
        return False
    
    normalized = normalize_tag_name(name)
    
    if len(normalized) < 2:
        return False
    
    # Must contain at least one letter or number
    if not re.search(r'[a-z0-9]', normalized):
        return False
    
    return True
