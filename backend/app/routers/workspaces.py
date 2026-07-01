from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from sqlmodel import select

from app.core.deps import (
    CurrentUserDep,
    SessionDep,
    get_workspace_or_404,
    require_workspace_admin,
    require_workspace_member,
)
from app.models import User, Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.workspace import (
    MemberInvite,
    MemberRead,
    MemberUpdate,
    WorkspaceRead,
)
from app.services.email import send_workspace_invite_email
from app.services.uploads import save_workspace_logo

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _workspace_read(workspace: Workspace, role: WorkspaceRole | None = None) -> WorkspaceRead:
    return WorkspaceRead(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        logo=workspace.logo,
        created_at=workspace.created_at,
        role=role,
    )


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    session: SessionDep,
    current_user: CurrentUserDep,
    name: str = Form(...),
    description: str | None = Form(None),
    logo: UploadFile | None = File(None),
) -> WorkspaceRead:
    logo_path: str | None = None
    if logo is not None and logo.filename:
        logo_path = await save_workspace_logo(logo)

    workspace = Workspace(
        name=name.strip(),
        description=description.strip() if description else None,
        logo=logo_path,
    )
    session.add(workspace)
    session.flush()

    membership = WorkspaceMember(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=WorkspaceRole.ADMIN,
    )
    session.add(membership)
    session.commit()
    session.refresh(workspace)

    return _workspace_read(workspace, WorkspaceRole.ADMIN)


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[WorkspaceRead]:
    statement = (
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    rows = session.exec(statement).all()
    return [_workspace_read(workspace, role) for workspace, role in rows]


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> WorkspaceRead:
    membership = require_workspace_member(session, str(workspace_id), current_user.id)
    workspace = get_workspace_or_404(session, str(workspace_id))
    return _workspace_read(workspace, membership.role)


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    name: str | None = Form(None),
    description: str | None = Form(None),
    logo: UploadFile | None = File(None),
    remove_logo: str | bool = Form(False),
) -> WorkspaceRead:
    require_workspace_admin(session, str(workspace_id), current_user.id)
    workspace = get_workspace_or_404(session, str(workspace_id))

    # Convert remove_logo to bool if it's a string
    if isinstance(remove_logo, str):
        remove_logo = remove_logo.lower() == 'true'

    if name is not None:
        workspace.name = name.strip()
    if description is not None:
        workspace.description = description.strip() if description else None
    
    if remove_logo:
        workspace.logo = None
    elif logo is not None and logo.filename:
        workspace.logo = await save_workspace_logo(logo)

    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    membership = require_workspace_member(session, str(workspace_id), current_user.id)
    return _workspace_read(workspace, membership.role)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    require_workspace_admin(session, str(workspace_id), current_user.id)
    workspace = get_workspace_or_404(session, str(workspace_id))
    session.delete(workspace)
    session.commit()


@router.get("/{workspace_id}/members", response_model=list[MemberRead])
def list_members(
    workspace_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[MemberRead]:
    require_workspace_member(session, str(workspace_id), current_user.id)

    statement = (
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    rows = session.exec(statement).all()
    return [
        MemberRead(
            user_id=member.user_id,
            workspace_id=member.workspace_id,
            role=member.role,
            email=user.email,
            name=user.name,
            image=user.image,
        )
        for member, user in rows
    ]


@router.post(
    "/{workspace_id}/members",
    response_model=MemberRead,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    workspace_id: UUID,
    payload: MemberInvite,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> MemberRead:
    require_workspace_admin(session, str(workspace_id), current_user.id)
    workspace = get_workspace_or_404(session, str(workspace_id))

    # Case-insensitive email lookup
    invitee = session.exec(
        select(User).where(User.email.ilike(payload.email))
    ).first()

    if invitee is None:
        # Create a placeholder user for the invite
        # We use a unique ID that we can recognize later
        invitee = User(
            id=f"invited:{payload.email.lower()}",
            email=payload.email.lower(),
            name=payload.email.split("@")[0], # Default name from email
            image=None,
        )
        session.add(invitee)
        session.flush() # Ensure we have the user record before creating membership

    if invitee.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this workspace",
        )

    existing = session.get(WorkspaceMember, (invitee.id, workspace_id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this workspace",
        )

    membership = WorkspaceMember(
        user_id=invitee.id,
        workspace_id=workspace_id,
        role=payload.role,
    )
    session.add(membership)
    session.commit()
    session.refresh(membership)

    if invitee.email_notifications:
        background_tasks.add_task(
            send_workspace_invite_email,
            to_email=invitee.email,
            invitee_name=invitee.name,
            workspace_name=workspace.name,
            inviter_name=current_user.name,
            role=payload.role.value,
        )

    return MemberRead(
        user_id=membership.user_id,
        workspace_id=membership.workspace_id,
        role=membership.role,
        email=invitee.email,
        name=invitee.name,
        image=invitee.image,
    )


@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberRead)
def update_member_role(
    workspace_id: UUID,
    user_id: str,
    payload: MemberUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> MemberRead:
    require_workspace_admin(session, str(workspace_id), current_user.id)

    membership = session.get(WorkspaceMember, (user_id, workspace_id))
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if membership.role == WorkspaceRole.ADMIN and payload.role == WorkspaceRole.MEMBER:
        admin_count = session.exec(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role == WorkspaceRole.ADMIN,
            )
        ).all()
        if len(admin_count) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last admin of the workspace",
            )

    membership.role = payload.role
    session.add(membership)
    session.commit()
    session.refresh(membership)

    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return MemberRead(
        user_id=membership.user_id,
        workspace_id=membership.workspace_id,
        role=membership.role,
        email=user.email,
        name=user.name,
        image=user.image,
    )


@router.delete(
    "/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_member(
    workspace_id: UUID,
    user_id: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    membership = require_workspace_member(session, str(workspace_id), current_user.id)
    target = session.get(WorkspaceMember, (user_id, workspace_id))
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    is_self = user_id == current_user.id
    is_admin = membership.role == WorkspaceRole.ADMIN

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove other members",
        )

    if target.role == WorkspaceRole.ADMIN:
        admin_count = session.exec(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role == WorkspaceRole.ADMIN,
            )
        ).all()
        if len(admin_count) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin of the workspace",
            )

    session.delete(target)
    session.commit()
