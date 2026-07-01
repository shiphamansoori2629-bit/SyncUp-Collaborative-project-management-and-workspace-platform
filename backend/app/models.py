"""
SyncUp SQLModel database models for Neon PostgreSQL.

Import all table models from this module so Alembic/metadata can discover them:
    from app.models import SQLModel, User, Workspace, ...
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Enum as SAEnum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class WorkspaceRole(str, Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User (Clerk ID as primary key)
# ---------------------------------------------------------------------------


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(primary_key=True, max_length=255, description="Clerk user ID")
    email: str = Field(index=True, max_length=320)
    name: str = Field(max_length=255)
    image: Optional[str] = Field(default=None, max_length=2048)
    email_notifications: bool = Field(default=True)

    workspace_memberships: list["WorkspaceMember"] = Relationship(
        sa_relationship=relationship(
            "WorkspaceMember",
            back_populates="user",
            cascade="all, delete-orphan",
        )
    )
    led_projects: list["Project"] = Relationship(
        sa_relationship=relationship(
            "Project",
            back_populates="project_lead",
            primaryjoin="User.id == Project.project_lead_id",
        )
    )
    assigned_tasks: list["Task"] = Relationship(
        sa_relationship=relationship(
            "Task",
            back_populates="assignee",
            primaryjoin="User.id == Task.assigned_to",
        )
    )
    comments: list["Comment"] = Relationship(
        sa_relationship=relationship("Comment", back_populates="author")
    )


# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------


class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    logo: Optional[str] = Field(default=None, max_length=2048)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    members: list["WorkspaceMember"] = Relationship(
        sa_relationship=relationship(
            "WorkspaceMember",
            back_populates="workspace",
            cascade="all, delete-orphan",
        )
    )
    projects: list["Project"] = Relationship(
        sa_relationship=relationship(
            "Project",
            back_populates="workspace",
            cascade="all, delete-orphan",
        )
    )


# ---------------------------------------------------------------------------
# WorkspaceMember (many-to-many with role)
# ---------------------------------------------------------------------------


class WorkspaceMember(SQLModel, table=True):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_workspace_member"),
    )

    user_id: str = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    workspace_id: UUID = Field(
        foreign_key="workspaces.id",
        primary_key=True,
        ondelete="CASCADE",
    )
    role: WorkspaceRole = Field(
        default=WorkspaceRole.MEMBER,
        sa_column=Column(
            SAEnum(WorkspaceRole, name="workspace_role", native_enum=False),
            nullable=False,
        ),
    )

    user: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="workspace_memberships")
    )
    workspace: "Workspace" = Relationship(
        sa_relationship=relationship("Workspace", back_populates="members")
    )


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True, ondelete="CASCADE")
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    priority: Priority = Field(
        default=Priority.MEDIUM,
        sa_column=Column(
            SAEnum(Priority, name="project_priority", native_enum=False),
            nullable=False,
        ),
    )
    project_lead_id: Optional[str] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        ondelete="SET NULL",
    )

    workspace: "Workspace" = Relationship(
        sa_relationship=relationship("Workspace", back_populates="projects")
    )
    project_lead: Optional["User"] = Relationship(
        sa_relationship=relationship(
            "User",
            back_populates="led_projects",
            primaryjoin="Project.project_lead_id == User.id",
        )
    )

    @property
    def project_lead_name(self) -> Optional[str]:
        return self.project_lead.name if self.project_lead else None

    @property
    def project_lead_email(self) -> Optional[str]:
        return self.project_lead.email if self.project_lead else None

    tasks: list["Task"] = Relationship(
        sa_relationship=relationship(
            "Task",
            back_populates="project",
            cascade="all, delete-orphan",
        )
    )


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    title: str = Field(max_length=500, index=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    project_id: UUID = Field(foreign_key="projects.id", index=True, ondelete="CASCADE")
    assigned_to: Optional[str] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        ondelete="SET NULL",
    )
    status: TaskStatus = Field(
        default=TaskStatus.TODO,
        sa_column=Column(
            SAEnum(TaskStatus, name="task_status", native_enum=False),
            nullable=False,
        ),
    )
    priority: Priority = Field(
        default=Priority.MEDIUM,
        sa_column=Column(
            SAEnum(Priority, name="task_priority", native_enum=False),
            nullable=False,
        ),
    )
    due_date: Optional[date] = Field(default=None)
    start_date: Optional[date] = Field(default=None)

    project: "Project" = Relationship(
        sa_relationship=relationship("Project", back_populates="tasks")
    )
    assignee: Optional["User"] = Relationship(
        sa_relationship=relationship(
            "User",
            back_populates="assigned_tasks",
            primaryjoin="Task.assigned_to == User.id",
        )
    )

    @property
    def assignee_name(self) -> Optional[str]:
        return self.assignee.name if self.assignee else None

    @property
    def assignee_email(self) -> Optional[str]:
        return self.assignee.email if self.assignee else None

    @property
    def task_type(self) -> str:
        text = f"{self.title or ''} {self.description or ''}".lower()
        if any(kw in text for kw in ["api", "dev", "code", "db", "database", "test", "frontend", "backend", "git", "build", "run", "endpoint"]):
            return "coding"
        if any(kw in text for kw in ["drawing", "wireframe", "design", "canvas", "logo", "color", "theme", "ui", "ux", "sketch", "mockup", "css"]):
            return "designing"
        return "document"

    comments: list["Comment"] = Relationship(
        sa_relationship=relationship(
            "Comment",
            back_populates="task",
            cascade="all, delete-orphan",
        )
    )


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------


class Comment(SQLModel, table=True):
    __tablename__ = "comments"
    __table_args__ = {"extend_existing": True}

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content: str = Field(sa_column=Column(Text, nullable=False))
    task_id: UUID = Field(foreign_key="tasks.id", index=True, ondelete="CASCADE")
    user_id: str = Field(foreign_key="users.id", index=True, ondelete="CASCADE")
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    task: "Task" = Relationship(
        sa_relationship=relationship("Task", back_populates="comments")
    )
    author: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="comments")
    )


# Re-export metadata helper for Alembic / database setup
__all__ = [
    "SQLModel",
    "WorkspaceRole",
    "TaskStatus",
    "Priority",
    "User",
    "Workspace",
    "WorkspaceMember",
    "Project",
    "Task",
    "Comment",
]
