"""Resolve workspace members by email or user id for assignments."""

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Project, User, WorkspaceMember, WorkspaceRole


def resolve_workspace_assignee(
    session: Session,
    project: Project,
    *,
    assigned_to: str | None,
    assignee_email: str | None,
    current_user: User,
) -> User | None:
    if assignee_email:
        email_clean = assignee_email.strip().lower()

        if current_user.email.lower() == email_clean:
            return current_user

        assignee = session.exec(
            select(User).where(User.email.ilike(email_clean))
        ).first()

        if assignee is None:
            assignee = User(
                id=f"invited:{email_clean}",
                email=email_clean,
                name=email_clean.split("@")[0],
                image=None,
            )
            session.add(assignee)
            session.flush()

            membership = session.get(WorkspaceMember, (assignee.id, project.workspace_id))
            if membership is None:
                session.add(
                    WorkspaceMember(
                        user_id=assignee.id,
                        workspace_id=project.workspace_id,
                        role=WorkspaceRole.MEMBER,
                    )
                )
                session.flush()

            return assignee

        if assignee.id != current_user.id:
            membership = session.get(WorkspaceMember, (assignee.id, project.workspace_id))
            if membership is None:
                session.add(
                    WorkspaceMember(
                        user_id=assignee.id,
                        workspace_id=project.workspace_id,
                        role=WorkspaceRole.MEMBER,
                    )
                )
                session.flush()

        return assignee

    if assigned_to is None:
        return None

    assignee = session.get(User, assigned_to)
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")

    if assignee.id != current_user.id:
        membership = session.get(WorkspaceMember, (assignee.id, project.workspace_id))
        if membership is None:
            session.add(
                WorkspaceMember(
                    user_id=assignee.id,
                    workspace_id=project.workspace_id,
                    role=WorkspaceRole.MEMBER,
                )
            )
            session.flush()

    return assignee
