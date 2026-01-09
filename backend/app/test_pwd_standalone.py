import os
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

# Exact configuration from app/services/auth.py
password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))

def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

def get_password_hash(password):
    return password_hash.hash(password)

def test_password_verification():
    password = "admin"
    print(f"Testing password: {password}")
    
    hashed = get_password_hash(password)
    print(f"Generated hash: {hashed}")
    
    is_valid = verify_password(password, hashed)
    print(f"Verification result: {is_valid}")
    
    if is_valid:
        print("✅ SUCCESS: Password verification works!")
    else:
        print("❌ FAILURE: Password verification failed!")

    # Test with a known prefix to check Argon2 vs Bcrypt
    if hashed.startswith("$argon2"):
        print("Info: Used Argon2")
    elif hashed.startswith("$2") or hashed.startswith("$2b"):
        print("Info: Used Bcrypt")

if __name__ == "__main__":
    test_password_verification()
