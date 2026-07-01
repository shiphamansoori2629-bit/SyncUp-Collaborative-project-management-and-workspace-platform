from datetime import date
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models import Priority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    project_id: UUID
    assigned_to: str | None = None
    assignee_email: EmailStr | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    due_date: date | None = None
    start_date: date | None = None

    @model_validator(mode="after")
    def require_single_assignee(self) -> "TaskCreate":
        if self.assigned_to and self.assignee_email:
            raise ValueError("Provide either assigned_to or assignee_email, not both")
        return self


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    assigned_to: str | None = None
    assignee_email: EmailStr | None = None
    status: TaskStatus | None = None
    priority: Priority | None = None
    due_date: date | None = None
    start_date: date | None = None


class TaskRead(BaseModel):
    id: UUID
    title: str
    description: str | None
    project_id: UUID
    assigned_to: str | None
    status: TaskStatus
    priority: Priority
    due_date: date | None
    start_date: date | None = None
    assignee_name: str | None = None
    assignee_email: str | None = None
    task_type: str = "document"

    model_config = {"from_attributes": True}
