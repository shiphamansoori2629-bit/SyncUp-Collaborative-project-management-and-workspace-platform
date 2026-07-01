from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.core.deps import CurrentUserDep, SessionDep, require_workspace_member
from app.models import Comment, Project, Task
from app.schemas.comment import CommentCreate, CommentCreateForProject, CommentRead
from app.seed import DISCUSSION_TASK_TITLE
from app.services.discussion import get_or_create_discussion_task

router = APIRouter(prefix="/comments", tags=["comments"])


def _comment_to_read(comment: Comment) -> CommentRead:
    read = CommentRead.model_validate(comment)
    if comment.author:
        read.author_name = comment.author.name
        read.author_image = comment.author.image
    return read


def _require_project_comment_access(session: SessionDep, project: Project, user_id: str) -> None:
    require_workspace_member(session, str(project.workspace_id), user_id)


@router.post("", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    payload: CommentCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Comment:
    task = session.get(Task, payload.task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    project = session.get(Project, task.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_project_comment_access(session, project, current_user.id)

    comment = Comment(
        task_id=payload.task_id,
        user_id=current_user.id,
        content=payload.content,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


@router.post("/project", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_project_comment(
    payload: CommentCreateForProject,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Comment:
    project = session.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_project_comment_access(session, project, current_user.id)

    discussion_task = get_or_create_discussion_task(session, payload.project_id)
    comment = Comment(
        task_id=discussion_task.id,
        user_id=current_user.id,
        content=payload.content.strip(),
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    if comment.author is None:
        comment = session.get(Comment, comment.id)
    return _comment_to_read(comment)


@router.get("/task/{task_id}", response_model=list[CommentRead])
def list_task_comments(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[CommentRead]:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    project = session.get(Project, task.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_project_comment_access(session, project, current_user.id)

    statement = (
        select(Comment)
        .where(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
    )
    comments = session.exec(statement).all()

    return [_comment_to_read(c) for c in comments]


@router.get("/project/{project_id}", response_model=list[CommentRead])
def list_project_comments(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[CommentRead]:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_project_comment_access(session, project, current_user.id)

    discussion_task = session.exec(
        select(Task).where(Task.project_id == project_id, Task.title == DISCUSSION_TASK_TITLE)
    ).first()
    if discussion_task is None:
        return []

    statement = (
        select(Comment)
        .where(Comment.task_id == discussion_task.id)
        .order_by(Comment.created_at.desc())
    )
    comments = session.exec(statement).all()
    return [_comment_to_read(c) for c in comments]
