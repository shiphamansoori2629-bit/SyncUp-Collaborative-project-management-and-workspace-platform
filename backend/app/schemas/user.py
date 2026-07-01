from pydantic import BaseModel


class UserPreferencesRead(BaseModel):
    email_notifications: bool


class UserPreferencesUpdate(BaseModel):
    email_notifications: bool
