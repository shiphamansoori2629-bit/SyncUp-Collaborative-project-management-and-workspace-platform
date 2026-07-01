from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func
from sqlmodel import select

from app.core.deps import CurrentUserDep, SessionDep, require_workspace_member
from app.models import Priority, Project, Task, TaskStatus
from app.schemas.analytics import TaskAnalytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _empty_counts() -> tuple[dict[TaskStatus, int], dict[Priority, int]]:
    by_status = {status: 0 for status in TaskStatus}
    by_priority = {priority: 0 for priority in Priority}
    return by_status, by_priority


@router.get("/workspaces/{workspace_id}/tasks", response_model=TaskAnalytics)
def workspace_task_analytics(
    workspace_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    project_id: UUID | None = None,
) -> TaskAnalytics:
    require_workspace_member(session, str(workspace_id), current_user.id)

    if project_id is not None:
        project = session.get(Project, project_id)
        if project is None or project.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found in this workspace",
            )
        base_filter = Task.project_id == project_id
    else:
        project_ids = select(Project.id).where(Project.workspace_id == workspace_id)
        base_filter = Task.project_id.in_(project_ids)

    by_status, by_priority = _empty_counts()

    status_rows = session.exec(
        select(Task.status, func.count()).where(base_filter).group_by(Task.status)
    ).all()
    for task_status, count in status_rows:
        by_status[task_status] = int(count)

    priority_rows = session.exec(
        select(Task.priority, func.count()).where(base_filter).group_by(Task.priority)
    ).all()
    for priority, count in priority_rows:
        by_priority[priority] = int(count)

    total = sum(by_status.values())

    return TaskAnalytics(by_status=by_status, by_priority=by_priority, total=total)
