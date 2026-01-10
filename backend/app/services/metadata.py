import os
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import uuid
from PIL import Image
import io
from datetime import datetime
from typing import Dict, Any, Optional
import mobi

COVER_STORAGE_PATH = os.getenv("COVER_STORAGE_PATH", "/data/covers")

def extract_metadata(file_path: str) -> Dict[str, Any]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".epub":
        return extract_epub_metadata(file_path)
    elif ext == ".mobi":
        return extract_mobi_metadata(file_path)
    # Basic support for other formats
    return {
        "title": os.path.basename(file_path).rsplit(".", 1)[0],
        "authors": [],
        "tags": [],
        "description": "",
        "format": ext.replace(".", "").upper(),
        "file_size": os.path.getsize(file_path)
    }

def extract_epub_metadata(file_path: str) -> Dict[str, Any]:
    try:
        book = epub.read_epub(file_path)
        
        metadata = {
            "title": book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else os.path.basename(file_path),
            "authors": [a[0] for a in book.get_metadata('DC', 'creator')] if book.get_metadata('DC', 'creator') else [],
            "publisher": book.get_metadata('DC', 'publisher')[0][0] if book.get_metadata('DC', 'publisher') else None,
            "language": book.get_metadata('DC', 'language')[0][0] if book.get_metadata('DC', 'language') else None,
            "description": "",
            "tags": [s[0] for s in book.get_metadata('DC', 'subject')] if book.get_metadata('DC', 'subject') else [],
            "format": "EPUB",
            "file_size": os.path.getsize(file_path)
        }

        # Extract description (often in DC:description)
        desc = book.get_metadata('DC', 'description')
        if desc:
            metadata["description"] = BeautifulSoup(desc[0][0], "lxml").get_text()

        # Extract cover
        metadata["cover_path"] = extract_epub_cover(book)
        
        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {file_path}: {e}")
        return {
            "title": os.path.basename(file_path),
            "authors": [],
            "tags": [],
            "description": str(e),
            "format": "EPUB"
        }

def extract_mobi_metadata(file_path: str) -> Dict[str, Any]:
    try:
        # Extract to a temporary location to get metadata
        # mobi.extract returns (path, metadata)
        # We don't really want to keep the extracted files yet, but we need the metadata
        import tempfile
        import shutil
        
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path, metadata_raw = mobi.extract(file_path, tmpdir)
            
            # Prepare metadata
            metadata = {
                "title": metadata_raw.get("Title", [os.path.basename(file_path).rsplit(".", 1)[0]])[0],
                "authors": metadata_raw.get("Author", []),
                "publisher": metadata_raw.get("Publisher", [None])[0],
                "description": metadata_raw.get("Description", [""])[0],
                "tags": metadata_raw.get("Subject", []),
                "format": "MOBI",
                "file_size": os.path.getsize(file_path),
                "cover_path": None
            }
            
            # Mobi metadata can be messy, clean it up
            if isinstance(metadata["authors"], str):
                metadata["authors"] = [metadata["authors"]]
            
            # Try to extract cover if possible
            # mobi.extract might have extracted the cover image to out_path
            # Let's look for images in out_path
            for root, dirs, files in os.walk(out_path):
                for f in files:
                    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                        # Use the first image as cover for now
                        cover_filename = f"{uuid.uuid4()}.jpg"
                        save_path = os.path.join(COVER_STORAGE_PATH, cover_filename)
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        
                        try:
                            image = Image.open(os.path.join(root, f))
                            if image.mode != 'RGB':
                                image = image.convert('RGB')
                            image.thumbnail((600, 900))
                            image.save(save_path, "JPEG", quality=85)
                            metadata["cover_path"] = cover_filename
                            break
                        except Exception:
                            continue
                if metadata["cover_path"]:
                    break
                    
            return metadata
            
    except Exception as e:
        print(f"Error extracting metadata from {file_path}: {e}")
        return {
            "title": os.path.basename(file_path).rsplit(".", 1)[0],
            "authors": [],
            "tags": [],
            "description": str(e),
            "format": "MOBI",
            "file_size": os.path.getsize(file_path)
        }

def extract_epub_cover(book: epub.EpubBook) -> Optional[str]:
    try:
        # Try to find the cover image
        cover_item = None
        # Common cover IDs
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                if 'cover' in item.get_id().lower() or 'cover' in item.get_name().lower():
                    cover_item = item
                    break
        
        if not cover_item:
            # Fallback: take the first image if no cover ID is found
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_IMAGE:
                    cover_item = item
                    break
        
        if cover_item:
            cover_data = cover_item.get_content()
            image = Image.open(io.BytesIO(cover_data))
            
            # Save as JPEG for consistency
            filename = f"{uuid.uuid4()}.jpg"
            save_path = os.path.join(COVER_STORAGE_PATH, filename)
            
            # Ensure directory exists (in case it's local)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
            # Resize slightly if too large to save space/bandwidth
            image.thumbnail((600, 900))
            image.save(save_path, "JPEG", quality=85)
            
            return filename
    except Exception as e:
        print(f"Error extracting cover: {e}")
    
    return None
