import { api } from './client'
import type { TaskAnalytics } from '@/types'

export async function getWorkspaceTaskAnalytics(
  workspaceId: string,
  projectId?: string,
): Promise<TaskAnalytics> {
  const { data } = await api.get<TaskAnalytics>(
    `/api/analytics/workspaces/${workspaceId}/tasks`,
    { params: projectId ? { project_id: projectId } : undefined },
  )
  return data
}
