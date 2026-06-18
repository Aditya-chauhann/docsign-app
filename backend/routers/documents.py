from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.models import Document, AuditLog
from schemas.schemas import DocumentOut
from utils.jwt import get_current_user
from models.models import User
import os, shutil, secrets

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Save file to disk
    safe_name = f"{current_user.id}_{secrets.token_hex(8)}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Save metadata to DB
    doc = Document(
        filename=file.filename,
        filepath=filepath,
        owner_id=current_user.id,
        sign_token=secrets.token_urlsafe(32),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Log the upload
    log = AuditLog(
        doc_id=doc.id,
        user_id=current_user.id,
        action="uploaded",
        ip_address=request.client.host,
        detail=f"File: {file.filename}",
    )
    db.add(log)
    db.commit()

    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(
    status: str | None = Query(default=None, description="Filter by status: pending | signed | rejected"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document).filter(Document.owner_id == current_user.id)
    if status:
        q = q.filter(Document.status == status)
    return q.order_by(Document.created_at.desc()).all()


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Log the view
    log = AuditLog(
        doc_id=doc.id,
        user_id=current_user.id,
        action="viewed",
        ip_address=request.client.host,
    )
    db.add(log)
    db.commit()

    return doc


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    signed: bool = Query(default=False, description="Download the signed version if true"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if signed:
        if not doc.signed_filepath or not os.path.exists(doc.signed_filepath):
            raise HTTPException(status_code=404, detail="Signed PDF not available yet")
        return FileResponse(doc.signed_filepath, media_type="application/pdf",
                             filename=f"signed_{doc.filename}")

    if not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="Original file not found on disk")
    return FileResponse(doc.filepath, media_type="application/pdf", filename=doc.filename)