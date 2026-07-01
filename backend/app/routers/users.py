from fastapi import APIRouter

from app.core.deps import CurrentUserDep, SessionDep
from app.schemas.user import UserPreferencesRead, UserPreferencesUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/preferences", response_model=UserPreferencesRead)
def get_preferences(current_user: CurrentUserDep) -> UserPreferencesRead:
    return UserPreferencesRead(email_notifications=current_user.email_notifications)


@router.patch("/me/preferences", response_model=UserPreferencesRead)
def update_preferences(
    payload: UserPreferencesUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> UserPreferencesRead:
    current_user.email_notifications = payload.email_notifications
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return UserPreferencesRead(email_notifications=current_user.email_notifications)
