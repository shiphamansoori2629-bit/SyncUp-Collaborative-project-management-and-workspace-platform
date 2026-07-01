import { api } from './client'

export interface CommentCreate {
  task_id: string
  content: string
}

export interface ProjectCommentCreate {
  project_id: string
  content: string
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
  author_image?: string
}

const BASE = '/api/comments'

export async function createComment(payload: CommentCreate): Promise<Comment> {
  const { data } = await api.post<Comment>(BASE, payload)
  return data
}

export async function listTaskComments(taskId: string): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`${BASE}/task/${taskId}`)
  return data
}

export async function createProjectComment(payload: ProjectCommentCreate): Promise<Comment> {
  const { data } = await api.post<Comment>(`${BASE}/project`, payload)
  return data
}

export async function listProjectComments(projectId: string): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`${BASE}/project/${projectId}`)
  return data
}
