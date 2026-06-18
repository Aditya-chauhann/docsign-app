from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Uses DATABASE_URL from .env — defaults to local SQLite for easy dev start
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./signature_app.db")

# SQLite needs this extra arg; PostgreSQL does not
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Dependency — use this in every router to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
