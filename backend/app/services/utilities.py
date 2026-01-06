import os
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from typing import Optional

def count_words_in_book(file_path: str) -> Optional[int]:
    """
    Counts the number of words in an EPUB book.
    Returns None if the file doesn't exist or is not a valid EPUB.
    """
    if not os.path.exists(file_path):
        return None
        
    try:
        # Check extension
        ext = os.path.splitext(file_path)[1].lower()
        if ext != '.epub':
            # Basic text file support could be added here
            return None
            
        book = epub.read_epub(file_path)
        word_count = 0
        
        # Iterate through document items
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                # Extract text from HTML content
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                text = soup.get_text()
                # Simple whitespace splitting for word count
                words = text.split()
                word_count += len(words)
                
        return word_count
    except Exception as e:
        print(f"Error counting words in {file_path}: {e}")
        return None
