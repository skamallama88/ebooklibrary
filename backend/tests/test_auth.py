"""
Tests for authentication endpoints and JWT token handling.
"""
import pytest
from fastapi import status


@pytest.mark.unit
def test_login_success(client, test_user):
    """Test successful login with valid credentials"""
    response = client.post(
        "/auth/token",
        data={"username": "testuser", "password": "testpass123"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


@pytest.mark.unit
def test_login_invalid_username(client):
    """Test login with non-existent username"""
    response = client.post(
        "/auth/token",
        data={"username": "nonexistent", "password": "password123"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]


@pytest.mark.unit
def test_login_invalid_password(client, test_user):
    """Test login with incorrect password"""
    response = client.post(
        "/auth/token",
        data={"username": "testuser", "password": "wrongpassword"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]


@pytest.mark.unit
def test_get_current_user(client, auth_headers):
    """Test retrieving current user info with valid token"""
    response = client.get("/auth/me", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "hashed_password" not in data  # Should not expose password


@pytest.mark.unit
def test_get_current_user_no_token(client):
    """Test accessing protected endpoint without token"""
    response = client.get("/auth/me")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
def test_get_current_user_invalid_token(client):
    """Test accessing protected endpoint with invalid token"""
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
def test_admin_only_endpoint_as_regular_user(client, auth_headers):
    """Test that regular users cannot access admin endpoints"""
    # Try to access an admin endpoint (e.g., user management)
    response = client.get("/users/", headers=auth_headers)
    
    # Should be forbidden for non-admin users
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.integration
def test_admin_only_endpoint_as_admin(client, admin_headers):
    """Test that admin users can access admin endpoints"""
    response = client.get("/users/", headers=admin_headers)
    
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)


@pytest.mark.slow
@pytest.mark.integration
def test_rate_limiting(client):
    """Test that rate limiting works on login endpoint"""
    # We might have consumed some quota in other tests
    # So we just verify that we eventually hit the limit
    
    limit_hit = False
    for _ in range(10):
        response = client.post(
            "/auth/token",
            data={"username": "testuser", "password": "testpass123"}
        )
        if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            limit_hit = True
            break
            
    assert limit_hit, "Rate limit should have been hit within 10 requests"
