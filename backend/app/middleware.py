"""
Rate limiting middleware for FastAPI endpoints.
Prevents brute force attacks and API abuse.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
            "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else None
        }
    )
