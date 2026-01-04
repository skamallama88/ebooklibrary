Project: Self-Hosted Ebook Library & Reader (MVP)

1. Mission

Design and implement a self-hosted, Docker-deployable web application for managing and reading ebooks at scale (20,000+ books), inspired by Calibre, with a modern UI and a clean architecture that supports future expansion (AI summaries, OPDS).

This task is to build the MVP only, but the architecture must be future-proofed for Phase 2 features.

2. Technology Stack (MANDATORY)
Frontend
- React + TypeScript
- Vite
- TanStack Table (library grid)
- TanStack Query (API state)
- Tailwind CSS
- Headless UI or Radix UI
- EPUB.js (ebook reader)

Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.x
- Alembic (migrations)
- Pydantic
- Uvicorn

Database
- PostgreSQL

Infrastructure
- Docker
- Docker Compose
- Local filesystem storage via Docker volumes

3. System Architecture

- SPA frontend communicating with backend via REST API
- Backend handles:
  - Metadata
  - File indexing
  - Reading progress
  - Authentication
- Ebooks stored on filesystem, not in the database
- Database stores metadata, relationships, and user state

4. Core MVP Features
4.1 Ebook Library

- Support at minimum:
  - EPUB
  - PDF (basic metadata)
- Import books via:
  - File upload
  - Directory scan
- Store and edit metadata:
  - Title
  - Author(s)
  - Published date
  - Date added
  - Tags
  - Genre
  - Publisher
  - Language
  - User rating
  - Description / synopsis
  - Format
  - File size
- Store cover images separately
- Scale efficiently to 20,000+ books

4.2 Main Library UI (Desktop-First)

- Full-screen table view
- Columns:
  - Title
  - Author
  - Added date
  - Tags
  - Format
  - Size
  - Read status
- Sortable columns
- Multi-select rows
- Virtualized scrolling or pagination
- Fast filtering and search

4.3 Sidebar (Filtering & Collections)

- Collapsible left sidebar
- Filter by:
  - Author
  - Tags
  - Publisher
- Manual user-created collections:
  - Add/remove books manually
  - Behave like playlists

4.4 Ebook Reader

- Built-in EPUB reader using EPUB.js
- Responsive for mobile devices
- Persist reading position per user per book
- Basic reader controls:
  - Font size
  - Light/Dark mode
- Reader opens in:
  - New browser tab (default)

4.5 Book Detail Panel

Appears when selecting a book

- Shows:
  - Cover image
  - Author(s)
  - Tags
  - Description

Collapsible panel

4.6 Search

- Global search bar
- Searches:
  - Title
  - Author
  - Tags
- Combines with sidebar filters

4.7 Authentication

- Local authentication
- Single-user mode supported
- Reading progress stored per user
- JWT-based authentication preferred

5. AI & OPDS (NOT IMPLEMENTED IN MVP)

- Do NOT implement AI summarization
- Do NOT implement OPDS server
- BUT:
  - Design backend interfaces so both can be added later
  - Avoid architectural decisions that block them

6. Data Model Expectations (High Level)

Minimum entities:
- User
- Book
- Author
- Tag
- Collection
- ReadingProgress


Use many-to-many relationships where appropriate.

7. Docker & Deployment Requirements

- Provide:
  - docker-compose.yml
  - Backend Dockerfile
  - Frontend Dockerfile
- Persistent volumes for:
  - PostgreSQL
  - Ebook files
- Environment-variable driven configuration

8. Performance & Quality Requirements

- UI must remain responsive with large libraries
- Avoid loading entire datasets into memory
- API endpoints must be paginated
- Clean, maintainable code
- Clear separation of concerns

9. Deliverables

- Produce:
- Project folder structure
- Database schema (Alembic migrations)
- Core backend API
- Frontend SPA with library + reader
- Docker Compose deployment
- README with setup instructions

10. Implementation Philosophy

- Prefer clarity over cleverness
- Avoid premature optimization
- Build solid foundations for Phase 2:
  - AI summaries
  - Smart collections
  - OPDS server
  - Advanced reader features
