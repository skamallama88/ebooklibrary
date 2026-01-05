from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, database, models
from ..services import auth as auth_service

router = APIRouter(prefix="/users", tags=["users"])

# Get current user settings
@router.get("/me/settings", response_model=schemas.UserSettings)
async def get_user_settings(current_user: models.User = Depends(auth_service.get_current_user)):
    return schemas.UserSettings(
        username=current_user.username,
        email=current_user.email,
        theme_preference=current_user.theme_preference,
        reading_preferences=schemas.ReadingPreferences(
            font_size=current_user.font_size,
            font_family=current_user.font_family,
            page_layout=current_user.page_layout
        ),
        notification_preferences=schemas.NotificationPreferences(
            notifications_enabled=current_user.notifications_enabled
        )
    )

# Update current user settings
@router.put("/me/settings", response_model=schemas.UserSettings)
async def update_user_settings(
    settings: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check if username/email conflicts exist
    if settings.username and settings.username != current_user.username:
        existing_user = db.query(models.User).filter(models.User.username == settings.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = settings.username
    
    if settings.email and settings.email != current_user.email:
        existing_user = db.query(models.User).filter(models.User.email == settings.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = settings.email
    
    # Update theme preference
    if settings.theme_preference is not None:
        if settings.theme_preference not in ["light", "dark", "auto"]:
            raise HTTPException(status_code=400, detail="Invalid theme preference")
        current_user.theme_preference = settings.theme_preference
    
    # Update reading preferences
    if settings.font_size is not None:
        if settings.font_size < 10 or settings.font_size > 32:
            raise HTTPException(status_code=400, detail="Font size must be between 10 and 32")
        current_user.font_size = settings.font_size
    
    if settings.font_family is not None:
        if settings.font_family not in ["serif", "sans-serif"]:
            raise HTTPException(status_code=400, detail="Invalid font family")
        current_user.font_family = settings.font_family
    
    if settings.page_layout is not None:
        if settings.page_layout not in ["paginated", "scrolled", "two-page"]:
            raise HTTPException(status_code=400, detail="Invalid page layout")
        current_user.page_layout = settings.page_layout
    
    # Update notification preferences
    if settings.notifications_enabled is not None:
        current_user.notifications_enabled = settings.notifications_enabled
    
    db.commit()
    db.refresh(current_user)
    
    return schemas.UserSettings(
        username=current_user.username,
        email=current_user.email,
        theme_preference=current_user.theme_preference,
        reading_preferences=schemas.ReadingPreferences(
            font_size=current_user.font_size,
            font_family=current_user.font_family,
            page_layout=current_user.page_layout
        ),
        notification_preferences=schemas.NotificationPreferences(
            notifications_enabled=current_user.notifications_enabled
        )
    )

# Change password
@router.put("/me/password")
async def change_password(
    password_change: schemas.PasswordChange,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Verify current password
    if not auth_service.verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(password_change.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    current_user.hashed_password = auth_service.get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

# Admin endpoints

# List all users (admin only)
@router.get("/", response_model=List[schemas.UserListItem])
async def list_users(
    current_user: models.User = Depends(auth_service.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    users = db.query(models.User).all()
    return users

# Create new user (admin only)
@router.post("/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate,
    current_user: models.User = Depends(auth_service.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    # Check if username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = auth_service.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

# Delete user (admin only)
@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth_service.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

# Toggle admin status (admin only)
@router.put("/{user_id}/admin")
async def toggle_admin_status(
    user_id: int,
    current_user: models.User = Depends(auth_service.get_current_admin_user),
    db: Session = Depends(database.get_db)
):
    # Prevent modifying yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    
    return {"message": f"User admin status set to {user.is_admin}", "is_admin": user.is_admin}
