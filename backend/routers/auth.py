from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import get_db
from models.models import User
from schemas.schemas import UserRegister, UserLogin, UserOut, Token
from utils.jwt import create_access_token, get_current_user
import os, shutil, secrets

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SIG_DIR = "signatures"
os.makedirs(SIG_DIR, exist_ok=True)


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=data.name, email=data.email, password=pwd_context.hash(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/signature-image")
def upload_signature_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files allowed for signatures")
    path = os.path.join(SIG_DIR, f"sig_{current_user.id}.png")
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    # Save path on user model
    user = db.query(User).filter(User.id == current_user.id).first()
    user.signature_image = path
    db.commit()
    return {"message": "Signature uploaded", "path": path}


@router.get("/signature-image")
def get_signature_image(current_user: User = Depends(get_current_user)):
    path = f"signatures/sig_{current_user.id}.png"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No signature uploaded yet")
    return FileResponse(path, media_type="image/png")


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user