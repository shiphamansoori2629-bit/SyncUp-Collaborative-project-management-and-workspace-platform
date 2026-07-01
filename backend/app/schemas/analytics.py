from pydantic import BaseModel

from app.models import Priority, TaskStatus


class TaskAnalytics(BaseModel):
    by_status: dict[TaskStatus, int]
    by_priority: dict[Priority, int]
    total: int
