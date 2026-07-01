import { api } from './client'
import type { Task, TaskCreate, TaskStatus } from '@/types'

const BASE = '/api/tasks'

export async function listTasks(params?: {
  workspace_id?: string
  project_id?: string
}): Promise<Task[]> {
  const { data } = await api.get<Task[]>(BASE, { params })
  return data
}

export async function createTask(payload: TaskCreate): Promise<Task> {
  const { data } = await api.post<Task>(BASE, payload)
  return data
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch<Task>(`${BASE}/${taskId}`, { status })
  return data
}

export async function updateTask(
  taskId: string,
  payload: { assignee_email?: string | null; status?: TaskStatus },
): Promise<Task> {
  const { data } = await api.patch<Task>(`${BASE}/${taskId}`, payload)
  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`${BASE}/${taskId}`)
}
