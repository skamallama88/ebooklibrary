import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import auth

def test_password_verification():
    password = "admin"
    print(f"Testing password: {password}")
    
    hashed = auth.get_password_hash(password)
    print(f"Generated hash: {hashed}")
    
    is_valid = auth.verify_password(password, hashed)
    print(f"Verification result: {is_valid}")
    
    if is_valid:
        print("✅ SUCCESS: Password verification works!")
    else:
        print("❌ FAILURE: Password verification failed!")

if __name__ == "__main__":
    test_password_verification()
