from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.security import ClerkTokenError, verify_clerk_token
from app.database import get_session
from app.models import User, Workspace, WorkspaceMember, WorkspaceRole

security = HTTPBearer(auto_error=False)

SessionDep = Annotated[Session, Depends(get_session)]
TokenDep = Annotated[HTTPAuthorizationCredentials | None, Depends(security)]


def get_token_payload(token: TokenDep) -> dict[str, Any]:
    if token is None or not token.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_clerk_token(token.credentials)
    except ClerkTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


TokenPayloadDep = Annotated[dict[str, Any], Depends(get_token_payload)]


def get_current_user_id(payload: TokenPayloadDep) -> str:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject",
        )
    return user_id


CurrentUserIdDep = Annotated[str, Depends(get_current_user_id)]


def get_current_user(
    session: SessionDep,
    payload: TokenPayloadDep,
) -> User:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject",
        )

    user = session.get(User, user_id)
    if user is None:
        # Seamlessly create user if missing in DB but valid in Clerk
        email = (
            payload.get("email")
            or payload.get("email_address")
            or f"user_{user_id}@clerk.syncup.local"
        )
        name = (
            payload.get("name")
            or payload.get("full_name")
            or payload.get("username")
            or "SyncUp User"
        )
        image = payload.get("picture") or payload.get("image_url")

        user = User(
            id=user_id,
            email=email,
            name=name,
            image=image,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_workspace_membership(
    session: Session,
    workspace_id: str,
    user_id: str,
) -> WorkspaceMember | None:
    from uuid import UUID

    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == UUID(workspace_id),
        WorkspaceMember.user_id == user_id,
    )
    return session.exec(statement).first()


def require_workspace_member(
    session: SessionDep,
    workspace_id: str,
    user_id: CurrentUserIdDep,
) -> WorkspaceMember:
    membership = get_workspace_membership(session, workspace_id, user_id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return membership


def require_workspace_admin(
    session: SessionDep,
    workspace_id: str,
    user_id: CurrentUserIdDep,
) -> WorkspaceMember:
    membership = require_workspace_member(session, workspace_id, user_id)
    if membership.role != WorkspaceRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return membership


def get_workspace_or_404(session: Session, workspace_id: str) -> Workspace:
    from uuid import UUID

    workspace = session.get(Workspace, UUID(workspace_id))
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace
