from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.deps import (
    CurrentUserDep,
    SessionDep,
    get_workspace_membership,
    require_workspace_member,
)
from app.models import Project, User, WorkspaceMember, Task
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.assignees import resolve_workspace_assignee
from app.services.email import send_onboarding_email, send_project_lead_assigned_email

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_project_or_404(session: SessionDep, project_id: UUID) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _require_project_access(
    session: SessionDep,
    project: Project,
    user_id: str,
) -> WorkspaceMember:
    return require_workspace_member(session, str(project.workspace_id), user_id)


def _validate_project_lead(
    session: SessionDep,
    workspace_id: UUID,
    project_lead_id: str | None,
) -> None:
    if project_lead_id is None:
        return
    lead_membership = get_workspace_membership(session, str(workspace_id), project_lead_id)
    if lead_membership is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project lead must be a member of the workspace",
        )
    if session.get(User, project_lead_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project lead user not found")


def _projects_with_leads(statement):
    return statement.options(selectinload(Project.project_lead))  # type: ignore[arg-type]


def _notify_project_lead(
    background_tasks: BackgroundTasks,
    *,
    project: Project,
    lead: User,
    assigner: User,
) -> None:
    if not lead.email_notifications:
        return

    if lead.id.startswith("invited:"):
        background_tasks.add_task(
            send_onboarding_email,
            to_email=lead.email,
            project_name=project.name,
            assigner_name=assigner.name,
        )
    else:
        background_tasks.add_task(
            send_project_lead_assigned_email,
            to_email=lead.email,
            lead_name=lead.name,
            project_name=project.name,
            assigner_name=assigner.name,
        )


def _apply_lead_from_payload(
    session: SessionDep,
    project: Project,
    payload: ProjectCreate | ProjectUpdate,
    current_user: User,
) -> User | None:
    assignee_email = getattr(payload, "assignee_email", None)
    project_lead_id = getattr(payload, "project_lead_id", None)

    if assignee_email is not None:
        return resolve_workspace_assignee(
            session,
            project,
            assigned_to=project_lead_id,
            assignee_email=str(assignee_email) if assignee_email else None,
            current_user=current_user,
        )

    if project_lead_id is not None:
        lead = session.get(User, project_lead_id)
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project lead user not found")
        return lead

    return None


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Project:
    require_workspace_member(session, str(payload.workspace_id), current_user.id)

    project_data = payload.model_dump(exclude={"assignee_email", "project_lead_id"})
    project = Project.model_validate(project_data)

    lead = _apply_lead_from_payload(session, project, payload, current_user)
    if lead is not None:
        project.project_lead_id = lead.id
    elif payload.project_lead_id is not None:
        _validate_project_lead(session, payload.workspace_id, payload.project_lead_id)
        project.project_lead_id = payload.project_lead_id

    session.add(project)
    session.commit()
    session.refresh(project)

    if lead is not None:
        _notify_project_lead(background_tasks, project=project, lead=lead, assigner=current_user)

    return project


@router.get("", response_model=list[ProjectRead])
def list_projects(
    session: SessionDep,
    current_user: CurrentUserDep,
    workspace_id: UUID | None = None,
) -> list[Project]:
    if workspace_id is not None:
        require_workspace_member(session, str(workspace_id), current_user.id)
        statement = _projects_with_leads(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.name)
        )
    else:
        statement = _projects_with_leads(
            select(Project)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Project.workspace_id,
            )
            .where(WorkspaceMember.user_id == current_user.id)
            .order_by(Project.name)
        )
    return list(session.exec(statement).all())


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Project:
    statement = _projects_with_leads(select(Project).where(Project.id == project_id))
    project = session.exec(statement).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_project_access(session, project, current_user.id)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    project = _get_project_or_404(session, project_id)
    _require_project_access(session, project, current_user.id)

    statement = select(Task).where(Task.project_id == project_id)
    tasks = session.exec(statement).all()
    for task in tasks:
        session.delete(task)

    session.delete(project)
    session.commit()


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Project:
    project = _get_project_or_404(session, project_id)
    _require_project_access(session, project, current_user.id)

    previous_lead_id = project.project_lead_id
    update_data = payload.model_dump(exclude_unset=True, exclude={"assignee_email", "project_lead_id"})

    new_lead: User | None = None
    if payload.assignee_email is not None:
        new_lead = _apply_lead_from_payload(session, project, payload, current_user)
        update_data["project_lead_id"] = new_lead.id if new_lead else None
    elif payload.project_lead_id is not None:
        _validate_project_lead(session, project.workspace_id, payload.project_lead_id)
        update_data["project_lead_id"] = payload.project_lead_id
        new_lead = session.get(User, payload.project_lead_id)

    for key, value in update_data.items():
        setattr(project, key, value)

    session.add(project)
    session.commit()
    session.refresh(project)

    if (
        new_lead is not None
        and project.project_lead_id == new_lead.id
        and project.project_lead_id != previous_lead_id
    ):
        _notify_project_lead(background_tasks, project=project, lead=new_lead, assigner=current_user)

    return project
