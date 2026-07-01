"""
Idempotent seed data for local / refreshed databases.

Inserts primary demo projects only when missing (matched by workspace + name).
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlmodel import Session, select

from app.models import Priority, Project, User, Workspace, WorkspaceMember

logger = logging.getLogger(__name__)

DISCUSSION_TASK_TITLE = "__syncup_discussion__"

SEED_PROJECTS: tuple[dict, ...] = (
    {
        "name": "UI/UX Design",
        "description": "Design system, wireframes, and high-fidelity UI for the SyncUp platform.",
        "priority": Priority.HIGH,
    },
    {
        "name": "e commerce website launch",
        "description": "Launch planning and delivery for the eco-friendly e-commerce storefront.",
        "priority": Priority.MEDIUM,
    },
)


def ensure_default_records(session: Session) -> None:
    """Insert default workspace projects if they do not already exist."""
    workspace = session.exec(select(Workspace).order_by(Workspace.created_at)).first()
    if workspace is None:
        logger.info("Seed skipped: no workspace in database yet")
        return

    lead = _default_lead_for_workspace(session, workspace.id)
    today = date.today()

    for spec in SEED_PROJECTS:
        existing = session.exec(
            select(Project).where(
                Project.workspace_id == workspace.id,
                Project.name == spec["name"],
            )
        ).first()
        if existing is not None:
            continue

        project = Project(
            name=spec["name"],
            description=spec["description"],
            workspace_id=workspace.id,
            project_lead_id=lead.id if lead else None,
            priority=spec["priority"],
            start_date=today,
            end_date=today + timedelta(days=60),
        )
        session.add(project)
        logger.info("Seeded project: %s", spec["name"])

    try:
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.warning("Seed commit skipped (likely concurrent insert): %s", exc)


def _default_lead_for_workspace(session: Session, workspace_id) -> User | None:
    membership = session.exec(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    ).first()
    if membership is None:
        return session.exec(select(User).order_by(User.email)).first()
    return session.get(User, membership.user_id)
