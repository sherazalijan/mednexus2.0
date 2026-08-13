import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


def build_engine(url: str):
    if not url:
        return create_engine("sqlite:///:memory:")

    clean_url = url.strip()
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql://", 1)

    # Try 1: Standard URL
    try:
        return create_engine(clean_url, poolclass=NullPool, pool_pre_ping=True)
    except Exception:
        pass

    # Try 2: pg8000 URL
    if clean_url.startswith("postgresql://") and "+pg8000" not in clean_url:
        try:
            pg8000_url = clean_url.replace("postgresql://", "postgresql+pg8000://", 1)
            return create_engine(pg8000_url, poolclass=NullPool, pool_pre_ping=True)
        except Exception:
            pass

    # Fallback memory database if connection engine creation fails
    return create_engine("sqlite:///:memory:")


engine = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is missing on Vercel.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
