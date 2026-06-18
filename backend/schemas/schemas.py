from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Documents ─────────────────────────────────────────
class DocumentOut(BaseModel):
    id: int
    filename: str
    status: str
    owner_id: int
    sign_token: Optional[str]
    signed_filepath: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


# ── Signatures ────────────────────────────────────────
class SignatureCreate(BaseModel):
    doc_id: int
    page: int
    x: float
    y: float
    width: float = 150.0
    height: float = 50.0

class SignatureOut(BaseModel):
    id: int
    doc_id: int
    user_id: int
    page: int
    x: float
    y: float
    width: float
    height: float
    status: str
    signed_at: Optional[datetime]
    class Config:
        from_attributes = True

class SignatureFinalize(BaseModel):
    signature_id: int
    action: str          # "sign" or "reject"
    reason: Optional[str] = None


# ── Audit ─────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: int
    doc_id: int
    user_id: Optional[int]
    action: str
    ip_address: Optional[str]
    timestamp: datetime
    detail: Optional[str]
    class Config:
        from_attributes = True