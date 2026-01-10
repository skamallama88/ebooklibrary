import os
from ebooklib import epub
from bs4 import BeautifulSoup
from typing import Optional
from .text_extractor import TextExtractor, ExtractionStrategy

def count_words_in_book(file_path: str) -> Optional[int]:
    """
    Counts the number of words in a book (EPUB, MOBI, PDF, TXT, RTF).
    Returns None if the file doesn't exist or error occurs.
    """
    if not os.path.exists(file_path):
        return None
        
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        # Use TextExtractor for consistent word counting across all supported formats
        extractor = TextExtractor()
        # Use FULL strategy to get accurate word count of the entire book
        content = extractor.extract_text(file_path, strategy=ExtractionStrategy.FULL)
        return content.word_count
    except Exception as e:
        print(f"Error counting words in {file_path}: {e}")
        return None
