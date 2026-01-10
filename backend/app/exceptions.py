"""
Custom exception classes for the Ebook Library application.
Provides structured error handling with appropriate HTTP status codes.
"""
from typing import Optional, Dict, Any


class BookLibraryException(Exception):
    """Base exception for all application errors"""
    
    def __init__(
        self, 
        message: str, 
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(BookLibraryException):
    """Authentication failed - invalid credentials or token"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(BookLibraryException):
    """Insufficient permissions to perform action"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class ResourceNotFoundError(BookLibraryException):
    """Requested resource does not exist"""
    
    def __init__(self, resource: str, identifier: Any):
        message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message, status_code=404)


class ValidationError(BookLibraryException):
    """Input validation failed"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, details=details)


class ConflictError(BookLibraryException):
    """Resource already exists or conflict with current state"""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class ServiceUnavailableError(BookLibraryException):
    """External service (AI provider, etc.) is unavailable"""
    
    def __init__(self, service: str, message: Optional[str] = None):
        msg = message or f"{service} is currently unavailable"
        super().__init__(msg, status_code=503)
