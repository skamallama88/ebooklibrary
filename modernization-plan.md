# codebase-modernization-plan.md

This plan outlines the steps to replace deprecated and legacy packages in the Ebook Library project to ensure compatibility with modern environments (Python 3.13+) and better maintainability.

## Phase 1: Backend Authentication Refresh (High Priority)
The current authentication system uses `passlib` and `python-jose`, which are unmaintained and incompatible with Python 3.13/3.14.

### 1.1 Update Requirements
- Modify `backend/requirements.txt`:
    - Remove `passlib[bcrypt]`
    - Remove `python-jose[cryptography]`
    - Add `pwdlib[argon2,bcrypt]` (Modern password hashing helper)
    - Add `PyJWT` (Actively maintained JWT library)

### 1.2 Refactor Auth Service
- Update `backend/app/services/auth.py`:
    - Replace `jose` with `jwt` from `PyJWT`.
    - Replace `passlib.context.CryptContext` with `pwdlib.PasswordHash`.
    - Update `create_access_token` and `decode_token` to use `PyJWT` syntax (e.g., handling algorithm parameters correctly).

### 1.3 Verify Schema Stability
- Ensure that the password hashing strategy remains compatible so existing users (like the "admin" user) are not locked out. `pwdlib` supports multiple schemes, but a manual check of the `admin` user password hash is recommended.

---

## Phase 2: Frontend Dependency Optimization (Medium Priority)
Using Tailwind CSS v4 allows us to simplify our build process by removing redundant PostCSS tools.

### 2.1 Dependency Removal
- In `frontend/package.json`, remove:
    - `postcss`
    - `autoprefixer`
    - `@tailwindcss/postcss` (unless specifically needed by other tools)

### 2.2 Config Cleanup
- Remove any leftover `postcss.config.js` or `postcss.config.mjs` files if they exist (Vite + `@tailwindcss/vite` handles integration automatically).

---

## Phase 3: General Maintenance (Low Priority)
Modernizing the EPUB handling library.

### 3.1 Evaluate Ebook Handling
- If `ebooklib` continues to cause XML parsing warnings or errors with Python 3.14, migrate to `epublib` or `epub-utils`. This requires updating the `backend/app/routers/books.py` service.

---

## Phase 4: Verification
1. **Docker Build**: Run `docker-compose build` to ensure all new requirements install correctly.
2. **Login Test**: Verify that the login flow still works with the new `PyJWT` and `pwdlib` implementation.
3. **Frontend Build**: Run `npm run build` in the frontend to ensure Tailwind v4 compilation still works without PostCSS dependencies.
