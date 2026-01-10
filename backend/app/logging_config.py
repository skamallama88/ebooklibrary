"""
Logging configuration for the Ebook Library application.
Provides structured logging with proper levels and formatters.
"""
import logging
import sys
from typing import Optional


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """
    Configure application logging with structured format.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
                  Defaults to INFO
    
    Returns:
        Configured root logger
    """
    # Determine log level
    level = getattr(logging, (log_level or "INFO").upper(), logging.INFO)
    
    # Create formatter with structured output
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
