from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    password        = Column(String, nullable=False)
    signature_image = Column(String, nullable=True)   # path to user's PNG signature
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    documents = relationship("Document", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"

    id              = Column(Integer, primary_key=True, index=True)
    filename        = Column(String, nullable=False)
    filepath        = Column(String, nullable=False)
    signed_filepath = Column(String, nullable=True)
    status          = Column(String, default="pending")
    owner_id        = Column(Integer, ForeignKey("users.id"))
    sign_token      = Column(String, unique=True, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    owner      = relationship("User", back_populates="documents")
    signatures = relationship("Signature", back_populates="document")
    audit_logs = relationship("AuditLog", back_populates="document")


class Signature(Base):
    __tablename__ = "signatures"

    id        = Column(Integer, primary_key=True, index=True)
    doc_id    = Column(Integer, ForeignKey("documents.id"))
    user_id   = Column(Integer, ForeignKey("users.id"))
    page      = Column(Integer, nullable=False)
    x         = Column(Float, nullable=False)   # fraction 0-1 of page width
    y         = Column(Float, nullable=False)   # fraction 0-1 of page height
    width     = Column(Float, default=0.25)
    height    = Column(Float, default=0.08)
    status    = Column(String, default="pending")
    reason    = Column(Text, nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="signatures")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, index=True)
    doc_id     = Column(Integer, ForeignKey("documents.id"))
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    action     = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp  = Column(DateTime(timezone=True), server_default=func.now())
    detail     = Column(Text, nullable=True)

    document = relationship("Document", back_populates="audit_logs")