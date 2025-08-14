from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
from contextlib import asynccontextmanager

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Connection pool configuration
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,          # Max idle connections
    max_overflow=20,       # Max temporary connections
    pool_pre_ping=True,    # Test connections for liveness
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

@asynccontextmanager
async def get_db():
    """Async generator for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()