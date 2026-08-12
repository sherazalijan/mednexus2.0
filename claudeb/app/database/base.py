import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Check your environment variables / .env file."
    )

# IMPORTANT (Vercel / serverless deployment):
# Every serverless invocation can spin up a brand-new process. A pooled
# engine (the SQLAlchemy default, QueuePool) opens N idle connections PER
# INSTANCE and never fully closes them between invocations, so under any
# real traffic you exhaust Postgres's connection limit within minutes -
# this is almost certainly the actual cause of "Analytics Offline" and
# "[API] Quiz History failed": the DB simply refuses new connections.
#
# Fix: use NullPool (open a connection per request, close it right after)
# and pair it with a Postgres-side pooler (Supabase's "Transaction" mode
# pooler on port 6543, or PgBouncer) so you don't hit Postgres's native
# connection cap directly. Point DATABASE_URL at the pooler host/port.
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that guarantees the session is closed after every
    request, even if the handler raises. Replaces the old pattern of
    `db = SessionLocal()` with no matching db.close(), which was leaking
    a connection on every single API call.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
