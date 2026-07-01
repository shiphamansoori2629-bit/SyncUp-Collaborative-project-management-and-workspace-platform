import { api } from './client'

const BASE = '/api/users/me/preferences'

export interface UserPreferences {
  email_notifications: boolean
}

export async function getPreferences(): Promise<UserPreferences> {
  const { data } = await api.get<UserPreferences>(BASE)
  return data
}

export async function updatePreferences(
  email_notifications: boolean,
): Promise<UserPreferences> {
  const { data } = await api.patch<UserPreferences>(BASE, { email_notifications })
  return data
}
