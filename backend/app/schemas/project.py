from datetime import date
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import Priority


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    workspace_id: UUID
    start_date: date | None = None
    end_date: date | None = None
    priority: Priority = Priority.MEDIUM
    project_lead_id: str | None = None
    assignee_email: EmailStr | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    priority: Priority | None = None
    project_lead_id: str | None = None
    assignee_email: EmailStr | None = None


class ProjectRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    workspace_id: UUID
    start_date: date | None
    end_date: date | None
    priority: Priority
    project_lead_id: str | None
    project_lead_name: str | None = None
    project_lead_email: str | None = None

    model_config = {"from_attributes": True}
