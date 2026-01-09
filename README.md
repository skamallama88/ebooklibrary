# Ebook Library - Self-Hosted EPUB & PDF Manager

A modern, self-hosted web application for managing and reading ebooks at scale (20,000+ books), built with FastAPI and React.

## Features

- 📚 **Library Management**: Import, organize, and browse large ebook collections
- 📖 **Built-in Reader**: Read EPUBs directly in your browser with customizable themes
- 🏷️ **Smart Organization**: Filter by authors, publishers, tags, and collections
- 🔍 **Advanced Search**: Search across titles, authors, and tags
- 🌙 **Dark Mode**: Full dark mode support
- 📊 **Reading Progress**: Automatic progress tracking and resume
- 🎨 **Modern UI**: Clean, responsive interface built with TailwindCSS

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ebook-library
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

3. **IMPORTANT: Set security credentials**
   
   Edit `.env` and set the following **required** values:
   
   ```bash
   # Generate a strong JWT secret
   JWT_SECRET=$(openssl rand -base64 32)
   
   # Set a strong database password
   POSTGRES_PASSWORD=<your-strong-password>
   ```

   > [!CAUTION]
   > **Never use default or weak values for JWT_SECRET and POSTGRES_PASSWORD in production!**

4. **Start the application**
   ```bash
   docker-compose up --build
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### First-Time Setup

When you first deploy the application:

1.  **Automatic Seeding**: The backend automatically creates a default admin user (`admin`/`admin`) if no users exist in the database.
2.  **Password Reset**: If you forget your admin password or are having trouble logging in, set the environment variable `RESET_ADMIN_PASSWORD=true` in your `.env` file and restart the backend. This will force-reset the `admin` password back to `admin`.
3.  **Initial Scan**: You may want to click "Scan Library" in the sidebar to import any books already placed in the `data/books` folder.
4.  **Security**: Change the default admin password from the "User Settings" menu immediately after logging in.

### Default Login

- **Username**: `admin`
- **Password**: `admin`

> [!WARNING]
> Change the default admin password immediately after first login!

## Development Setup

### Backend (Python/FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/TypeScript)

```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

All configuration is managed through environment variables. See [`.env.example`](.env.example) for all available options.

#### Required Variables

- `JWT_SECRET`: Secret key for JWT token signing (generate with `openssl rand -base64 32`)
- `POSTGRES_PASSWORD`: Database password

#### Optional Variables

- `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:3000`)
- `BOOK_STORAGE_PATH`: Path to store ebook files (default: `/data/books`)
- `COVER_STORAGE_PATH`: Path to store cover images (default: `/data/covers`)

### Security Best Practices

1. ✅ Always generate a unique `JWT_SECRET` for each deployment
2. ✅ Use strong passwords for database and admin accounts
3. ✅ Restrict CORS by setting `FRONTEND_URL` to your actual domain
4. ✅ Keep `.env` files out of version control (already in `.gitignore`)
5. ✅ Regularly update dependencies for security patches

## Usage

### Importing Books

1. **Via Upload**: Click "Add Books" in the top bar to upload EPUB or PDF files
2. **Via Directory Scan**: 
   - Copy books to the `./data/books` directory
   - Click "Scan Library" in the sidebar to automatically import

### Managing Collections

- Create collections from the sidebar
- Add books to collections via the detail panel or bulk actions
- Collections act like playlists for organizing themed book groups

### Bulk Actions

1. Select multiple books using checkboxes
2. Use the top bar to:
   - Download selected books
   - Delete selected books
   - Add to collection

## Technology Stack

### Backend
- Python 3.11+ with FastAPI
- PostgreSQL database
- SQLAlchemy ORM
- JWT authentication

### Frontend
- React 18 with TypeScript
- TanStack Query & Table
- Tailwind CSS
- EPUB.js for reading

## Project Structure

```
ebook-library/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Business logic
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── api.ts          # API client
│   └── package.json
├── data/             # Persistent data (gitignored)
│   ├── books/        # Ebook file storage
│   └── covers/       # Cover image storage
└── docker-compose.yml
```

## Troubleshooting

### Application won't start

**Error: `JWT_SECRET` environment variable not set**
- Solution: Copy `.env.example` to `.env` and set a valid `JWT_SECRET`

**Error: Database connection failed**
- Solution: Ensure PostgreSQL container is running: `docker-compose ps`

### Books not appearing after scan

- Check file permissions in `./data/books`
- Verify files have `.epub` or `.pdf` extensions
- Check backend logs: `docker-compose logs backend`

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

[MIT License](LICENSE)

## Roadmap

See [future features.md](future%20features.md) for planned enhancements.
