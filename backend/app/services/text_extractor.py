"""
Text extraction service for ebook files.
Supports multiple extraction strategies for optimal LLM processing.
"""

import os
import re
from typing import Dict, List, Optional, Tuple
from enum import Enum
from pydantic import BaseModel
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from striprtf.striprtf import rtf_to_text
import mobi
import tempfile
import shutil


class ExtractionStrategy(str, Enum):
    """Text extraction strategies for different use cases"""
    FULL = "full"  # Extract entire book
    SMART_SAMPLING = "smart_sampling"  # Beginning, middle, end chapters
    ROLLING_SUMMARY = "rolling_summary"  # Process in chunks with rolling summary
    METADATA_ONLY = "metadata_only"  # Use existing metadata + sample chapters


class ExtractedContent(BaseModel):
    """Container for extracted book content"""
    text: str
    word_count: int
    chapter_count: int
    metadata_tags: List[str]
    existing_summary: str
    strategy_used: ExtractionStrategy
    
    class Config:
        use_enum_values = True


class TextExtractor:
    """Service for extracting text from ebook files"""
    
    # Word count thresholds for auto-strategy selection
    SHORT_BOOK_THRESHOLD = 30000  # < 30k words = short
    MEDIUM_BOOK_THRESHOLD = 100000  # 30k-100k words = medium
    # > 100k words = long book
    
    def __init__(self):
        pass
    
    def extract_text(
        self,
        file_path: str,
        strategy: Optional[ExtractionStrategy] = None,
        max_words: Optional[int] = None
    ) -> ExtractedContent:
        """
        Extract text from ebook file using specified or auto-selected strategy
        
        Args:
            file_path: Path to the ebook file
            strategy: Extraction strategy (auto-selects if None)
            max_words: Maximum words to extract (for limiting context)
        
        Returns:
            ExtractedContent with text and metadata
        """
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".epub":
            return self._extract_epub(file_path, strategy, max_words)
        elif ext == ".mobi":
            return self._extract_mobi(file_path, strategy, max_words)
        elif ext == ".rtf":
            return self._extract_rtf(file_path, strategy, max_words)
        elif ext == ".txt":
            return self._extract_txt(file_path, strategy, max_words)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
    
    def _extract_epub(
        self,
        file_path: str,
        strategy: Optional[ExtractionStrategy],
        max_words: Optional[int]
    ) -> ExtractedContent:
        """Extract text from EPUB file"""
        try:
            book = epub.read_epub(file_path)
            
            # Extract metadata
            metadata_tags = self._extract_metadata_tags(book)
            existing_summary = self._extract_metadata_summary(book)
            
            # Get all chapters
            chapters = self._get_epub_chapters(book)
            
            # Calculate word count
            full_text = "\n\n".join(chapters)
            word_count = len(full_text.split())
            
            # Auto-select strategy if not provided
            if strategy is None:
                strategy = self._select_strategy(word_count)
            
            # Extract based on strategy
            if strategy == ExtractionStrategy.FULL:
                extracted_text = full_text
            elif strategy == ExtractionStrategy.SMART_SAMPLING:
                extracted_text = self._smart_sample(chapters, word_count)
            elif strategy == ExtractionStrategy.ROLLING_SUMMARY:
                # For rolling summary, return chunks metadata
                # The AI service will handle the rolling summarization
                extracted_text = full_text  # Return full text, chunking handled by AI service
            elif strategy == ExtractionStrategy.METADATA_ONLY:
                extracted_text = self._metadata_sample(chapters, existing_summary)
            else:
                extracted_text = full_text
            
            # Apply max_words limit if specified
            if max_words and len(extracted_text.split()) > max_words:
                words = extracted_text.split()[:max_words]
                extracted_text = " ".join(words) + "\n\n[... truncated for length ...]"
            
            return ExtractedContent(
                text=extracted_text,
                word_count=word_count,
                chapter_count=len(chapters),
                metadata_tags=metadata_tags,
                existing_summary=existing_summary,
                strategy_used=strategy
            )
            
        except Exception as e:
            raise RuntimeError(f"Error extracting text from EPUB: {str(e)}")

    def _extract_mobi(
        self,
        file_path: str,
        strategy: Optional[ExtractionStrategy],
        max_words: Optional[int]
    ) -> ExtractedContent:
        """Extract text from MOBI file"""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                out_path, metadata_raw = mobi.extract(file_path, tmpdir)
                
                # MOBI extraction usually results in HTML files
                full_text = ""
                for root, dirs, files in os.walk(out_path):
                    for f in sorted(files):
                        if f.lower().endswith(('.html', '.htm')):
                            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as html_file:
                                soup = BeautifulSoup(html_file.read(), 'html.parser')
                                for script in soup(["script", "style"]):
                                    script.decompose()
                                text = soup.get_text()
                                lines = (line.strip() for line in text.splitlines())
                                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                                text = ' '.join(chunk for chunk in chunks if chunk)
                                if text:
                                    full_text += text + "\n\n"
                
                word_count = len(full_text.split())
                
                # Simple chapter detection for MOBI (heuristic)
                chapters = [c for c in full_text.split("\n\n") if len(c.split()) > 50]
                
                if strategy is None:
                    strategy = self._select_strategy(word_count)
                
                extracted_text = self._apply_strategy(full_text, chapters, word_count, strategy)
                
                if max_words and len(extracted_text.split()) > max_words:
                    words = extracted_text.split()[:max_words]
                    extracted_text = " ".join(words) + "\n\n[... truncated for length ...]"

                return ExtractedContent(
                    text=extracted_text,
                    word_count=word_count,
                    chapter_count=max(1, len(chapters)),
                    metadata_tags=metadata_raw.get("Subject", []),
                    existing_summary=metadata_raw.get("Description", [""])[0],
                    strategy_used=strategy
                )
        except Exception as e:
            raise RuntimeError(f"Error extracting text from MOBI: {str(e)}")

    def _extract_rtf(
        self,
        file_path: str,
        strategy: Optional[ExtractionStrategy],
        max_words: Optional[int]
    ) -> ExtractedContent:
        """Extract text from RTF file"""
        try:
            with open(file_path, 'r', encoding='ascii', errors='ignore') as f:
                rtf_content = f.read()
                text = rtf_to_text(rtf_content)
                
            word_count = len(text.split())
            if strategy is None:
                strategy = self._select_strategy(word_count)
            
            # For plain text/RTF, we don't have clear chapters
            chapters = [c for c in text.split("\n\n") if len(c.split()) > 50]
            extracted_text = self._apply_strategy(text, chapters, word_count, strategy)
            
            if max_words and len(extracted_text.split()) > max_words:
                words = extracted_text.split()[:max_words]
                extracted_text = " ".join(words) + "\n\n[... truncated for length ...]"

            return ExtractedContent(
                text=extracted_text,
                word_count=word_count,
                chapter_count=max(1, len(chapters)),
                metadata_tags=[],
                existing_summary="",
                strategy_used=strategy
            )
        except Exception as e:
            raise RuntimeError(f"Error extracting text from RTF: {str(e)}")

    def _extract_txt(
        self,
        file_path: str,
        strategy: Optional[ExtractionStrategy],
        max_words: Optional[int]
    ) -> ExtractedContent:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
                
            word_count = len(text.split())
            if strategy is None:
                strategy = self._select_strategy(word_count)
            
            chapters = [c for c in text.split("\n\n") if len(c.split()) > 50]
            extracted_text = self._apply_strategy(text, chapters, word_count, strategy)
            
            if max_words and len(extracted_text.split()) > max_words:
                words = extracted_text.split()[:max_words]
                extracted_text = " ".join(words) + "\n\n[... truncated for length ...]"

            return ExtractedContent(
                text=extracted_text,
                word_count=word_count,
                chapter_count=max(1, len(chapters)),
                metadata_tags=[],
                existing_summary="",
                strategy_used=strategy
            )
        except Exception as e:
            raise RuntimeError(f"Error extracting text from TXT: {str(e)}")

    def _apply_strategy(self, full_text: str, chapters: List[str], word_count: int, strategy: ExtractionStrategy) -> str:
        """Helper to apply extraction strategy"""
        if strategy == ExtractionStrategy.FULL:
            return full_text
        elif strategy == ExtractionStrategy.SMART_SAMPLING:
            return self._smart_sample(chapters if chapters else [full_text], word_count)
        elif strategy == ExtractionStrategy.ROLLING_SUMMARY:
            return full_text
        elif strategy == ExtractionStrategy.METADATA_ONLY:
            return self._metadata_sample(chapters if chapters else [full_text], "")
        else:
            return full_text
    
    def _get_epub_chapters(self, book: epub.EpubBook) -> List[str]:
        """Extract all chapter texts from EPUB"""
        chapters = []
        
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                # Parse HTML content
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text
                text = soup.get_text()
                
                # Clean up whitespace
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)
                
                if text and len(text.split()) > 50:  # Only include substantial chapters
                    chapters.append(text)
        
        return chapters
    
    def _extract_metadata_tags(self, book: epub.EpubBook) -> List[str]:
        """
        Extract tags from EPUB metadata (DC:subject fields)
        Applies normalization and pattern matching
        """
        tags = []
        
        try:
            # Get DC:subject metadata
            subjects = book.get_metadata('DC', 'subject')
            if subjects:
                for subject in subjects:
                    tag_text = subject[0] if isinstance(subject, tuple) else subject
                    
                    # Normalize tag
                    normalized = self._normalize_tag(tag_text)
                    if normalized:
                        tags.append(normalized)
            
            # TODO: Add pattern matching for common metadata formats
            # This will be refined iteratively based on user's library
            
        except Exception as e:
            print(f"Warning: Error extracting metadata tags: {e}")
        
        return tags
    
    def _normalize_tag(self, tag: str) -> Optional[str]:
        """
        Normalize tag to booru-style snake_case format
        
        Args:
            tag: Raw tag string
        
        Returns:
            Normalized tag or None if invalid
        """
        if not tag:
            return None
        
        # Convert to lowercase
        tag = tag.lower().strip()
        
        # Replace spaces and hyphens with underscores
        tag = re.sub(r'[\s\-]+', '_', tag)
        
        # Remove special characters except underscores
        tag = re.sub(r'[^a-z0-9_]', '', tag)
        
        # Remove leading/trailing underscores
        tag = tag.strip('_')
        
        # Remove multiple consecutive underscores
        tag = re.sub(r'_+', '_', tag)
        
        return tag if tag else None
    
    def _extract_metadata_summary(self, book: epub.EpubBook) -> str:
        """Extract existing description/summary from metadata"""
        try:
            desc = book.get_metadata('DC', 'description')
            if desc:
                desc_text = desc[0][0] if desc[0] else ""
                # Clean HTML if present
                soup = BeautifulSoup(desc_text, "html.parser")
                return soup.get_text().strip()
        except Exception:
            pass
        
        return ""
    
    def _select_strategy(self, word_count: int) -> ExtractionStrategy:
        """
        Auto-select extraction strategy based on book size
        
        Args:
            word_count: Total words in book
        
        Returns:
            Recommended extraction strategy
        """
        if word_count < self.SHORT_BOOK_THRESHOLD:
            return ExtractionStrategy.FULL
        elif word_count < self.MEDIUM_BOOK_THRESHOLD:
            return ExtractionStrategy.SMART_SAMPLING
        else:
            return ExtractionStrategy.ROLLING_SUMMARY
    
    def _smart_sample(self, chapters: List[str], word_count: int) -> str:
        """
        Extract beginning, middle, and end chapters (Smart Sampling strategy)
        
        Args:
            chapters: List of chapter texts
            word_count: Total word count
        
        Returns:
            Sampled text
        """
        if len(chapters) <= 7:
            # If book is short, return all chapters
            return "\n\n".join(chapters)
        
        # Take first 3 chapters
        beginning = chapters[:3]
        
        # Take 2 middle chapters
        mid_point = len(chapters) // 2
        middle = chapters[mid_point-1:mid_point+1]
        
        # Take last 2 chapters
        end = chapters[-2:]
        
        sampled_chapters = beginning + middle + end
        return "\n\n".join(sampled_chapters)
    
    def _metadata_sample(self, chapters: List[str], existing_summary: str) -> str:
        """
        Use existing metadata + first few chapters (Metadata Only strategy)
        
        Args:
            chapters: List of chapter texts
            existing_summary: Existing book summary
        
        Returns:
            Combined metadata and sample text
        """
        # Include first 5 chapters or fewer if book is short
        sample_chapters = chapters[:min(5, len(chapters))]
        sample_text = "\n\n".join(sample_chapters)
        
        if existing_summary:
            return f"EXISTING SUMMARY:\n{existing_summary}\n\nSAMPLE TEXT:\n{sample_text}"
        else:
            return sample_text
