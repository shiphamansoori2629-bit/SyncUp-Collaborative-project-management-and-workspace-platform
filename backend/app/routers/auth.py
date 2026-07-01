import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.config import settings
from app.core.deps import SessionDep
from app.models import Comment, Task, User, WorkspaceMember


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_primary_email(data: dict[str, Any]) -> str | None:
    addresses = data.get("email_addresses") or []
    primary_id = data.get("primary_email_address_id")
    for entry in addresses:
        if entry.get("id") == primary_id:
            return entry.get("email_address")
    if addresses:
        return addresses[0].get("email_address")
    return None


def _full_name(data: dict[str, Any]) -> str:
    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    name = f"{first} {last}".strip()
    return name or data.get("username") or "SyncUp User"


def _image_url(data: dict[str, Any]) -> str | None:
    return data.get("image_url") or data.get("profile_image_url")


def _upsert_user(session: SessionDep, data: dict[str, Any]) -> User:
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing user id")

    email = _extract_primary_email(data)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing user email")

    user = session.get(User, user_id)
    if user is None:
        # Check if we have a placeholder user from an invite
        from sqlmodel import select
        placeholder = session.exec(
            select(User).where(User.email.ilike(email), User.id.startswith("invited:"))
        ).first()

        if placeholder:
            # We found a placeholder! 
            # We need to transfer all their data to the new Clerk ID.
            # 1. Update WorkspaceMember records
            memberships = session.exec(
                select(WorkspaceMember).where(WorkspaceMember.user_id == placeholder.id)
            ).all()
            for m in memberships:
                # We can't just change user_id because it's a primary key.
                # We need to create a new record and delete the old one.
                new_m = WorkspaceMember(
                    user_id=user_id,
                    workspace_id=m.workspace_id,
                    role=m.role,
                )
                session.add(new_m)
                session.delete(m)

            # 2. Update Task assignments
            tasks = session.exec(
                select(Task).where(Task.assigned_to == placeholder.id)
            ).all()
            for t in tasks:
                t.assigned_to = user_id
                session.add(t)

            # 3. Update Comments
            comments = session.exec(
                select(Comment).where(Comment.user_id == placeholder.id)
            ).all()
            for c in comments:
                c.user_id = user_id
                session.add(c)

            # 4. Delete the placeholder user
            session.delete(placeholder)
            session.flush()

        # Now create the actual user
        user = User(
            id=user_id,
            email=email,
            name=_full_name(data),
            image=_image_url(data),
        )
    else:
        user.email = email
        user.name = _full_name(data)
        user.image = _image_url(data)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/webhooks/clerk", status_code=status.HTTP_204_NO_CONTENT)
async def clerk_webhook(request: Request, session: SessionDep) -> None:
    if not settings.clerk_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk webhook secret is not configured",
        )

    payload = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        wh = Webhook(settings.clerk_webhook_secret)
        event = wh.verify(payload, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        ) from exc

    if isinstance(event, bytes):
        event = json.loads(event.decode("utf-8"))
    elif isinstance(event, str):
        event = json.loads(event)

    event_type = event.get("type")
    data = event.get("data", {})

    logger.info("Clerk webhook received: %s", event_type)

    if event_type in ("user.created", "user.updated"):
        _upsert_user(session, data)
    elif event_type == "user.deleted":
        user_id = data.get("id")
        if user_id:
            user = session.get(User, user_id)
            if user:
                session.delete(user)
                session.commit()
    else:
        logger.debug("Unhandled Clerk event type: %s", event_type)
