"""
Database engine and session for Neon PostgreSQL.
"""

import os
import logging
from collections.abc import Generator

from sqlalchemy import inspect, text, exc
from sqlmodel import Session, create_engine

from app.config import settings
from app.models import SQLModel  # noqa: F401 — register all table models

logger = logging.getLogger(__name__)

# Local SQLite fallback URL
LOCAL_SQLITE_URL = "sqlite:///./local_syncup.db"

def create_resilient_engine():
    """Create a database engine with immediate fallback to SQLite on timeout."""
    primary_url = settings.database_url
    
    # Check if we are using Postgres (Neon)
    is_postgres = "postgresql" in primary_url
    connect_args = {"connect_timeout": 5} if is_postgres else {}

    try:
        logger.info("Attempting to connect to primary database...")
        eng = create_engine(
            primary_url,
            echo=settings.debug,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        # Test connection immediately with a small timeout
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to primary database")
        return eng
    except (exc.OperationalError, Exception) as e:
        logger.error("Primary database connection failed (OperationalError/Timeout): %s", e)
        logger.warning("FALLING BACK to local SQLite database: %s", LOCAL_SQLITE_URL)
        return create_engine(
            LOCAL_SQLITE_URL,
            connect_args={"check_same_thread": False},  # Required for SQLite
        )

# Global engine instance
engine = create_resilient_engine()


def create_db_and_tables(force_drop: bool = False) -> None:
    if force_drop:
        logger.warning("FORCING DROP of all tables due to schema conflict...")
        SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    logger.info("SQLModel metadata.create_all completed")


def run_schema_migrations() -> None:
    """Sync legacy databases: add missing columns without Alembic."""
    statements = [
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo VARCHAR(2048)",
        (
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
            "email_notifications BOOLEAN DEFAULT TRUE"
        ),
        "UPDATE users SET email_notifications = TRUE WHERE email_notifications IS NULL",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                logger.warning("Migration statement failed: %s. Error: %s", stmt, e)
    logger.info("Schema migrations applied")


def verify_workspace_columns() -> None:
    """Log warning if workspaces table is missing expected columns."""
    insp = inspect(engine)
    if not insp.has_table("workspaces"):
        return
    cols = {c["name"] for c in insp.get_columns("workspaces")}
    required = {"id", "name", "description", "logo", "created_at"}
    missing = required - cols
    if missing:
        logger.error("workspaces table missing columns: %s", missing)
        raise RuntimeError(f"Database schema incomplete. Missing columns: {missing}")


def sync_database() -> None:
    """Full sync: create tables, migrate columns, verify."""
    # Check if we should force a drop (e.g. via env var)
    force_drop = os.getenv("FORCE_DB_RECREATE", "false").lower() == "true"
    
    try:
        logger.info("Starting database synchronization (force_drop=%s)...", force_drop)
        create_db_and_tables(force_drop=force_drop)
        run_schema_migrations()
        verify_workspace_columns()
        with Session(engine) as session:
            from app.seed import ensure_default_records

            ensure_default_records(session)
        logger.info("Database synchronization completed successfully")
    except Exception as e:
        logger.error("Database synchronization failed: %s", e)
        
        if not force_drop:
            logger.warning("Attempting ONE-TIME automatic recreation to fix schema conflict...")
            try:
                create_db_and_tables(force_drop=True)
                run_schema_migrations()
                logger.info("Database recovered via forced recreation")
                return
            except Exception as retry_err:
                logger.error("Recovery failed: %s", retry_err)
        
        logger.warning("Proceeding with application startup despite database error")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
