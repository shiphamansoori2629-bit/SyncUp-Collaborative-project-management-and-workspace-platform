import { api } from './client'
import type { MemberInvite, MemberRead, MemberUpdate, Workspace } from '@/types'

const BASE = '/api/workspaces'

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get<Workspace[]>(BASE)
  return data
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const { data } = await api.get<Workspace>(`${BASE}/${workspaceId}`)
  return data
}

export interface WorkspaceFormPayload {
  name: string
  description?: string | null
  logoFile?: File | null
  removeLogo?: boolean
}

function buildWorkspaceFormData(payload: WorkspaceFormPayload, forUpdate = false): FormData {
  const form = new FormData()
  form.append('name', payload.name)
  if (forUpdate) {
    form.append('description', payload.description ?? '')
  } else if (payload.description) {
    form.append('description', payload.description)
  }
  if (payload.logoFile) {
    form.append('logo', payload.logoFile)
  }
  if (payload.removeLogo) {
    form.append('remove_logo', 'true')
  }
  return form
}

export async function createWorkspace(payload: WorkspaceFormPayload): Promise<Workspace> {
  const form = buildWorkspaceFormData(payload)
  const { data } = await api.post<Workspace>(BASE, form)
  return data
}

export async function updateWorkspace(
  workspaceId: string,
  payload: WorkspaceFormPayload,
): Promise<Workspace> {
  const form = buildWorkspaceFormData(payload, true)
  const { data } = await api.patch<Workspace>(`${BASE}/${workspaceId}`, form)
  return data
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await api.delete(`${BASE}/${workspaceId}`)
}

export async function listMembers(workspaceId: string): Promise<MemberRead[]> {
  const { data } = await api.get<MemberRead[]>(`${BASE}/${workspaceId}/members`)
  return data
}

export async function inviteMember(
  workspaceId: string,
  payload: MemberInvite,
): Promise<MemberRead> {
  const { data } = await api.post<MemberRead>(`${BASE}/${workspaceId}/members`, payload)
  return data
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  payload: MemberUpdate,
): Promise<MemberRead> {
  const { data } = await api.patch<MemberRead>(
    `${BASE}/${workspaceId}/members/${userId}`,
    payload,
  )
  return data
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await api.delete(`${BASE}/${workspaceId}/members/${userId}`)
}
