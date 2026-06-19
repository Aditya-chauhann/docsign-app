from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth, documents, signatures, audit

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Document Signature App", version="1.0.0")

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://docsign-app-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(documents.router,  prefix="/api/docs",       tags=["Documents"])
app.include_router(signatures.router, prefix="/api/signatures", tags=["Signatures"])
app.include_router(audit.router,      prefix="/api/audit",      tags=["Audit"])

@app.get("/")
def root():
    return {"message": "Document Signature API is running"}
