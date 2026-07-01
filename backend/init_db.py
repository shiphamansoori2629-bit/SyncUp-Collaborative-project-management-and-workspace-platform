"""
Initialize or refresh the local SQLite database.

By default this only creates missing tables and upserts seed rows (no wipe).
Pass --reset to drop and recreate the database file.
"""

import argparse
import logging
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from sqlmodel import Session, SQLModel, create_engine, select

from app.models import (
    Priority,
    Project,
    Task,
    TaskStatus,
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.seed import DISCUSSION_TASK_TITLE, SEED_PROJECTS, ensure_default_records

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "local_syncup.db"))
SQLITE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})


def init_db(reset: bool = False) -> None:
    if reset and os.path.exists(DB_PATH):
        logger.info("Removing existing database at %s...", DB_PATH)
        try:
            os.remove(DB_PATH)
        except OSError as exc:
            logger.error("Could not remove database file: %s", exc)
            logger.info("Attempting to drop all tables instead...")
            SQLModel.metadata.drop_all(engine)

    logger.info("Ensuring tables exist...")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = session.exec(select(User)).first()
        if user is None:
            logger.info("Inserting demo user and workspace...")
            user = User(
                id="user_2X6n4u9Y8kRz0q3v1m5b7n9p2q4",
                email="developer@srit.edu",
                name="SRIT Developer",
                email_notifications=True,
            )
            session.add(user)
            session.flush()

            from uuid import uuid4

            workspace = Workspace(
                id=uuid4(),
                name="SRIT MCA Projects",
                description="Core workspace for managing MCA final year projects.",
            )
            session.add(workspace)
            session.flush()

            session.add(
                WorkspaceMember(
                    user_id=user.id,
                    workspace_id=workspace.id,
                    role=WorkspaceRole.ADMIN,
                )
            )
            session.commit()

        ensure_default_records(session)

        workspace = session.exec(select(Workspace)).first()
        if workspace is None:
            return

        for spec in SEED_PROJECTS:
            project = session.exec(
                select(Project).where(
                    Project.workspace_id == workspace.id,
                    Project.name == spec["name"],
                )
            ).first()
            if project is None:
                continue

            has_discussion = session.exec(
                select(Task).where(
                    Task.project_id == project.id,
                    Task.title == DISCUSSION_TASK_TITLE,
                )
            ).first()
            if has_discussion is None:
                session.add(
                    Task(
                        title=DISCUSSION_TASK_TITLE,
                        description="Internal thread for project discussion feed.",
                        project_id=project.id,
                        status=TaskStatus.DONE,
                        priority=Priority.LOW,
                    )
                )

        session.commit()
        logger.info("Database ready at %s", DB_PATH)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize SyncUp local SQLite database")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing database file before creating tables",
    )
    args = parser.parse_args()
    init_db(reset=args.reset)
