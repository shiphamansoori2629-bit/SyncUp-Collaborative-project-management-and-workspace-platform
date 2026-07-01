from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlmodel import select

from app.core.deps import CurrentUserDep, SessionDep, require_workspace_member
from app.models import Project, Task, User, WorkspaceMember
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.seed import DISCUSSION_TASK_TITLE
from app.services.assignees import resolve_workspace_assignee
from app.services.email import send_task_assigned_email, send_onboarding_email

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_project_or_404(session: SessionDep, project_id: UUID) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _get_task_or_404(session: SessionDep, task_id: UUID) -> Task:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _require_task_access(session: SessionDep, project: Project, user_id: str) -> None:
    require_workspace_member(session, str(project.workspace_id), user_id)


def _notify_task_assignment(
    background_tasks: BackgroundTasks,
    *,
    task: Task,
    project: Project,
    assignee: User,
    assigner: User,
) -> None:
    if not assignee.email_notifications:
        return

    if assignee.id.startswith("invited:"):
        background_tasks.add_task(
            send_onboarding_email,
            to_email=assignee.email,
            project_name=project.name,
            assigner_name=assigner.name,
        )
    else:
        due_str = task.due_date.isoformat() if task.due_date else None
        background_tasks.add_task(
            send_task_assigned_email,
            to_email=assignee.email,
            assignee_name=assignee.name,
            task_title=task.title,
            project_name=project.name,
            assigner_name=assigner.name,
            due_date=due_str,
            priority=task.priority.value,
        )


def _build_task_from_create(
    session: SessionDep,
    project: Project,
    payload: TaskCreate,
    current_user: User,
) -> tuple[Task, User | None]:
    assignee = resolve_workspace_assignee(
        session,
        project,
        assigned_to=payload.assigned_to,
        assignee_email=str(payload.assignee_email) if payload.assignee_email else None,
        current_user=current_user,
    )
    task = Task(
        title=payload.title,
        description=payload.description,
        project_id=payload.project_id,
        assigned_to=assignee.id if assignee else None,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        start_date=payload.start_date,
    )
    return task, assignee


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    project = _get_project_or_404(session, payload.project_id)
    _require_task_access(session, project, current_user.id)

    task, assignee = _build_task_from_create(session, project, payload, current_user)
    session.add(task)
    session.commit()
    session.refresh(task)

    if assignee is not None:
        _notify_task_assignment(
            background_tasks,
            task=task,
            project=project,
            assignee=assignee,
            assigner=current_user,
        )

    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    session: SessionDep,
    current_user: CurrentUserDep,
    project_id: UUID | None = None,
    workspace_id: UUID | None = None,
) -> list[Task]:
    if project_id is not None:
        project = _get_project_or_404(session, project_id)
        _require_task_access(session, project, current_user.id)
        statement = (
            select(Task)
            .where(Task.project_id == project_id, Task.title != DISCUSSION_TASK_TITLE)
            .order_by(Task.title)
        )
        return list(session.exec(statement).all())

    if workspace_id is not None:
        require_workspace_member(session, str(workspace_id), current_user.id)
        statement = (
            select(Task)
            .join(Project, Project.id == Task.project_id)
            .where(Project.workspace_id == workspace_id)
            .order_by(Task.title)
        )
        return list(session.exec(statement).all())

    statement = (
        select(Task)
        .join(Project, Project.id == Task.project_id)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
        .order_by(Task.title)
    )
    return list(session.exec(statement).all())


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    task = _get_task_or_404(session, task_id)
    project = _get_project_or_404(session, task.project_id)
    _require_task_access(session, project, current_user.id)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    task = _get_task_or_404(session, task_id)
    project = _get_project_or_404(session, task.project_id)
    _require_task_access(session, project, current_user.id)

    previous_assignee = task.assigned_to
    update_data = payload.model_dump(exclude_unset=True, exclude={"assignee_email"})

    new_assignee: User | None = None
    if payload.assignee_email is not None or "assigned_to" in update_data:
        new_assignee = resolve_workspace_assignee(
            session,
            project,
            assigned_to=update_data.pop("assigned_to", task.assigned_to),
            assignee_email=str(payload.assignee_email) if payload.assignee_email else None,
            current_user=current_user,
        )
        update_data["assigned_to"] = new_assignee.id if new_assignee else None

    for key, value in update_data.items():
        setattr(task, key, value)

    session.add(task)
    session.commit()
    session.refresh(task)

    if (
        new_assignee is not None
        and task.assigned_to == new_assignee.id
        and task.assigned_to != previous_assignee
    ):
        _notify_task_assignment(
            background_tasks,
            task=task,
            project=project,
            assignee=new_assignee,
            assigner=current_user,
        )

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    task = _get_task_or_404(session, task_id)
    project = _get_project_or_404(session, task.project_id)
    _require_task_access(session, project, current_user.id)
    session.delete(task)
    session.commit()
