from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
import os

from database import get_db
from models.models import Signature, Document, AuditLog, User
from schemas.schemas import SignatureCreate, SignatureOut, SignatureFinalize
from utils.jwt import get_current_user
from services.pdf_service import generate_signed_pdf_with_images

router = APIRouter()

SIGNED_DIR = "signed"
os.makedirs(SIGNED_DIR, exist_ok=True)


@router.post("", response_model=SignatureOut, status_code=201)
def place_signature(
    data: SignatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == data.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    sig = Signature(
        doc_id=data.doc_id, user_id=current_user.id,
        page=data.page, x=data.x, y=data.y,
        width=data.width, height=data.height,
    )
    db.add(sig); db.commit(); db.refresh(sig)
    return sig


@router.get("/{doc_id}", response_model=list[SignatureOut])
def get_signatures(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Signature).filter(Signature.doc_id == doc_id).all()


@router.delete("/{sig_id}")
def delete_signature(sig_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sig = db.query(Signature).filter(Signature.id == sig_id, Signature.user_id == current_user.id).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signature not found")
    db.delete(sig); db.commit()
    return {"deleted": True}


@router.post("/finalize", response_model=SignatureOut)
def finalize_signature(
    data: SignatureFinalize,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sig = db.query(Signature).filter(Signature.id == data.signature_id).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signature not found")

    doc = db.query(Document).filter(Document.id == sig.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if data.action == "reject":
        sig.status = "rejected"
        sig.reason = data.reason
        doc.status = "rejected"
        db.add(AuditLog(doc_id=doc.id, user_id=current_user.id, action="rejected",
                        ip_address=request.client.host, detail=f"Reason: {data.reason or 'none'}"))
        db.commit(); db.refresh(sig)
        return sig

    if data.action != "sign":
        raise HTTPException(status_code=400, detail="action must be 'sign' or 'reject'")

    # Mark this sig signed
    sig.status = "signed"
    sig.signed_at = datetime.utcnow()

    # Get ALL pending sigs for this doc to embed together
    all_pending = db.query(Signature).filter(
        Signature.doc_id == doc.id,
        Signature.status.in_(["pending", "signed"])
    ).all()
    # Mark all as signed
    for s in all_pending:
        s.status = "signed"
        s.signed_at = datetime.utcnow()

    doc.status = "signed"

    # Build sig data for PDF generation
    sig_image = current_user.signature_image  # may be None → fall back to text
    sig_dicts = [{"page": s.page, "x": s.x, "y": s.y, "width": s.width, "height": s.height} for s in all_pending]

    output_path = os.path.join(SIGNED_DIR, f"signed_{doc.id}.pdf")
    generate_signed_pdf_with_images(
        source_path=doc.filepath,
        signatures=sig_dicts,
        output_path=output_path,
        signer_name=current_user.name,
        signature_image_path=sig_image,
    )
    doc.signed_filepath = output_path

    db.add(AuditLog(doc_id=doc.id, user_id=current_user.id, action="signed",
                    ip_address=request.client.host, detail=f"Signed by {current_user.name}"))
    db.commit(); db.refresh(sig)
    return sig