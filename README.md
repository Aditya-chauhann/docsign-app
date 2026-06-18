# Document Signature App

A DocuSign-like PDF signing system built with FastAPI + React.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit .env if needed
uvicorn main:app --reload
```
Backend runs at: http://localhost:8000
API docs (auto-generated): http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at: http://localhost:3000

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |
| POST | /api/docs/upload | Upload a PDF |
| GET | /api/docs | List your documents |
| GET | /api/docs/{id} | Get one document |
| POST | /api/signatures | Place a signature |
| GET | /api/signatures/{docId} | Get signatures for doc |
| POST | /api/signatures/finalize | Sign or reject |
| GET | /api/audit/{docId} | Audit trail for doc |

## Folder Structure
```
/backend
  main.py           — FastAPI app + CORS + router registration
  database.py       — SQLAlchemy engine + session
  /models           — DB table definitions
  /schemas          — Pydantic request/response models
  /routers          — Route handlers (auth, docs, signatures, audit)
  /utils            — JWT helpers
  requirements.txt

/frontend
  /src
    App.jsx         — Top-level routing
    /pages          — Login, Register, Dashboard
    /utils          — API fetch helper
```
