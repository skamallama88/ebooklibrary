# Testing Guide

## Overview

This guide covers how to run tests, write new tests, and understand the testing infrastructure for the Ebook Library backend.

---

## Quick Start

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in your browser to see coverage report
```

---

## Running Specific Tests

### By File

```bash
pytest tests/test_auth.py
```

### By Test Function

```bash
pytest tests/test_auth.py::test_login_success
```

### By Marker

```bash
# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration

# Skip slow tests
pytest -m "not slow"
```

### Parallel Execution

```bash
# Run tests in parallel (faster)
pytest -n auto
```

---

## Test Structure

### Directory Layout

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py         # Shared fixtures
│   ├── test_auth.py         # Authentication tests
│   ├── test_books.py        # Book management tests
│   ├── test_ai_services.py  # AI feature tests
│   └── test_models.py       # Database model tests
```

### Test Markers

- `@pytest.mark.unit` - Fast unit tests, no external dependencies
- `@pytest.mark.integration` - Integration tests with database/API
- `@pytest.mark.slow` - Slow tests (e.g., rate limiting tests)

---

## Available Fixtures

### Database Fixtures

```python
def test_example(test_db):
    """test_db provides a fresh in-memory SQLite database"""
    # Use test_db for database operations
```

### Client Fixture

```python
def test_api_endpoint(client):
    """client provides FastAPI TestClient"""
    response = client.get("/endpoint")
    assert response.status_code == 200
```

### User Fixtures

```python
def test_with_user(test_user, auth_headers):
    """test_user: regular user, auth_headers: auth token"""
    # Use auth_headers for authenticated requests
    
def test_admin_action(test_admin, admin_headers):
    """test_admin: admin user, admin_headers: admin auth token"""
    # Use admin_headers for admin requests
```

### Data Fixtures

```python
def test_with_book(test_book):
    """test_book: sample book in database"""
    
def test_with_tag(test_tag):
    """test_tag: sample tag in database"""
```

---

## Writing New Tests

### Basic Test Pattern

```python
import pytest
from fastapi import status


@pytest.mark.unit
def test_my_function():
    """Test description"""
    # Arrange
    input_data = {"key": "value"}
    
    # Act
    result = my_function(input_data)
    
    # Assert
    assert result == expected_value
```

### API Endpoint Test

```python
@pytest.mark.integration
def test_get_endpoint(client, auth_headers):
    """Test GET endpoint with authentication"""
    response = client.get("/api/resource", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "key" in data
```

### Database Test

```python
@pytest.mark.unit
def test_model_creation(test_db):
    """Test creating a database model"""
    obj = MyModel(field="value")
    test_db.add(obj)
    test_db.commit()
    test_db.refresh(obj)
    
    assert obj.id is not None
    assert obj.field == "value"
```

### Testing with Mocks

```python
from unittest.mock import patch, Mock

@pytest.mark.unit
@patch('app.services.my_service.external_api_call')
def test_with_mock(mock_api):
    """Test function that calls external API"""
    mock_api.return_value = {"data": "mocked"}
    
    result = function_that_calls_api()
    
    assert result["data"] == "mocked"
    mock_api.assert_called_once()
```

---

## Test Coverage Goals

- **Overall**: > 60%
- **Critical paths**: > 80% (auth, book management)
- **New features**: 100% coverage required

### Viewing Coverage

```bash
# Terminal output
pytest --cov=app --cov-report=term-missing

# HTML report (detailed, shows uncovered lines)
pytest --cov=app --cov-report=html
open htmlcov/index.html

# XML report (for CI/CD)
pytest --cov=app --cov-report=xml
```

---

## Debugging Tests

### Run with Verbose Output

```bash
pytest -vv
```

### Stop on First Failure

```bash
pytest -x
```

### Print Statements

```bash
pytest -s  # Shows print() output
```

### Drop into Debugger on Failure

```bash
pytest --pdb
```

### Run Last Failed Tests

```bash
pytest --lf
```

---

## Best Practices

### 1. **Test Naming**
- Use descriptive names: `test_login_with_invalid_password`
- Follow pattern: `test_<what>_<condition>_<expected>`

### 2. **Test Independence**
- Each test should be independent
- Don't rely on test execution order
- Use fixtures for setup/teardown

### 3. **Arrange-Act-Assert Pattern**
```python
def test_example():
    # Arrange - set up test data
    user = create_test_user()
    
    # Act - perform the action
    result = login(user)
    
    # Assert - verify the result
    assert result.is_authenticated
```

### 4. **Use Markers**
- Mark slow tests with `@pytest.mark.slow`
- Mark integration tests with `@pytest.mark.integration`
- This allows selective test execution

### 5. **Keep Tests Fast**
- Use in-memory database
- Mock external dependencies
- Minimize database commits

### 6. **Test Error Cases**
- Don't just test happy path
- Test validation errors
- Test authorization failures
- Test resource not found

---

## Continuous Integration

### GitHub Actions (Future)

```yaml
- name: Run tests
  run: |
    cd backend
    pytest --cov=app --cov-report=xml
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage.xml
```

---

## Common Issues

### Import Errors
```bash
# Make sure you're in the backend directory
cd backend
pytest
```

### Fixture Not Found
```bash
# Check that conftest.py is in tests/ directory
# Fixtures are automatically discovered in conftest.py
```

### Database Lock (SQLite)
```bash
# Use function scope for test_db fixture
# Each test gets a fresh database
```

### Async Tests Not Running
```bash
# Make sure pytest-asyncio is installed
# Use pytest.ini with asyncio_mode = auto
```

---

## Examples

### Example 1: Testing Authentication

```python
@pytest.mark.integration
def test_protected_endpoint_requires_auth(client):
    """Verify protected endpoint rejects unauthenticated requests"""
    response = client.get("/books/")
    assert response.status_code == 401

@pytest.mark.integration
def test_protected_endpoint_with_auth(client, auth_headers):
    """Verify protected endpoint accepts authenticated requests"""
    response = client.get("/books/", headers=auth_headers)
    assert response.status_code == 200
```

### Example 2: Testing Error Handling

```python
@pytest.mark.integration
def test_resource_not_found(client, auth_headers):
    """Test 404 response for non-existent resource"""
    response = client.get("/books/99999", headers=auth_headers)
    
    assert response.status_code == 404
    assert "error" in response.json()
    assert "request_id" in response.json()
```

### Example 3: Testing Relationships

```python
@pytest.mark.unit
def test_many_to_many_relationship(test_db, test_book, test_tag):
    """Test book-tag many-to-many relationship"""
    test_book.tags.append(test_tag)
    test_db.commit()
    
    assert test_tag in test_book.tags
    assert test_book in test_tag.books
```

---

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Coverage.py](https://coverage.readthedocs.io/)

---

## Getting Help

If you have questions about testing:
1. Check this documentation
2. Look at existing tests for examples
3. Review pytest documentation
4. Ask in team chat
