from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    task_id: UUID


class CommentCreateForProject(CommentBase):
    project_id: UUID


class CommentRead(CommentBase):
    id: UUID
    task_id: UUID
    user_id: str
    created_at: datetime
    author_name: str | None = None
    author_image: str | None = None

    model_config = ConfigDict(from_attributes=True)
