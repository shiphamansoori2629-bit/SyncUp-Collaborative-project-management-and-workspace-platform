import { api } from './client'
import type { Project, ProjectCreate, ProjectUpdate } from '@/types'

const BASE = '/api/projects'

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  const { data } = await api.get<Project[]>(BASE, {
    params: workspaceId ? { workspace_id: workspaceId } : undefined,
  })
  return data
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await api.get<Project>(`${BASE}/${projectId}`)
  return data
}

export async function createProject(payload: ProjectCreate): Promise<Project> {
  const { data } = await api.post<Project>(BASE, payload)
  return data
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`${BASE}/${projectId}`)
}

export async function updateProject(projectId: string, payload: ProjectUpdate): Promise<Project> {
  const { data } = await api.patch<Project>(`${BASE}/${projectId}`, payload)
  return data
}
