import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Fallback memory database for build step if DATABASE_URL is not set at build time
effective_db_url = DATABASE_URL if DATABASE_URL else "sqlite:///:memory:"

engine = create_engine(
    effective_db_url,
    poolclass=NullPool if "sqlite" not in effective_db_url else None,
    pool_pre_ping=True if "sqlite" not in effective_db_url else False,
)

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
