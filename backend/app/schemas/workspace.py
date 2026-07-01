from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import WorkspaceRole


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    logo: str | None = Field(default=None, max_length=2048)


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    logo: str | None = Field(default=None, max_length=2048)


class WorkspaceRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    logo: str | None
    created_at: datetime
    role: WorkspaceRole | None = None

    model_config = {"from_attributes": True}


class MemberInvite(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class MemberUpdate(BaseModel):
    role: WorkspaceRole


class MemberRead(BaseModel):
    user_id: str
    workspace_id: UUID
    role: WorkspaceRole
    email: str
    name: str
    image: str | None = None

    model_config = {"from_attributes": True}
