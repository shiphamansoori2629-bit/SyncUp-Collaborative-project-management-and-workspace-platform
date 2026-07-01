"""Project-level discussion thread backed by a hidden anchor task."""

from uuid import UUID

from sqlmodel import Session, select

from app.models import Priority, Task, TaskStatus
from app.seed import DISCUSSION_TASK_TITLE


def get_or_create_discussion_task(session: Session, project_id: UUID) -> Task:
    statement = select(Task).where(
        Task.project_id == project_id,
        Task.title == DISCUSSION_TASK_TITLE,
    )
    task = session.exec(statement).first()
    if task is not None:
        return task

    task = Task(
        title=DISCUSSION_TASK_TITLE,
        description="Internal thread for project discussion feed.",
        project_id=project_id,
        status=TaskStatus.DONE,
        priority=Priority.LOW,
    )
    session.add(task)
    session.flush()
    return task
