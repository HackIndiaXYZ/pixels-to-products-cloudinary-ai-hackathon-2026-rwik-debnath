import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event, create_engine
from app.core.config import settings
from app.db.base import Base

# Ensure data directory exists
if "sqlite" in settings.DATABASE_URL:
    db_path = settings.DATABASE_URL.split(":///")[-1]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
else:
    os.makedirs("data", exist_ok=True)

# Async SQLite engine
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

# Apply SQLite WAL mode and foreign key pragmas on connection
@event.listens_for(async_engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()
    except Exception:
        pass

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing an async database session per request."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Creates database tables if they do not exist and adds new columns if needed."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate non-breaking columns for existing sqlite databases
        for col_def in [
            "ALTER TABLE media_assets ADD COLUMN brand_theme VARCHAR(50) DEFAULT 'global_wire'",
            "ALTER TABLE media_assets ADD COLUMN custom_strap_id VARCHAR(255)"
        ]:
            try:
                await conn.exec_driver_sql(col_def)
            except Exception:
                pass
