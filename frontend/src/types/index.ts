/** Types aligned with backend/app/schemas */

export type WorkspaceRole = 'ADMIN' | 'MEMBER'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskType = 
  | 'coding' 
  | 'designing' 
  | 'qa' 
  | 'db' 
  | 'review' 
  | 'document' 
  | 'devops' 
  | 'planning' 
  | 'architecture' 
  | 'bugs' 
  | 'audit' 
  | 'feedback'

export interface Workspace {
  id: string
  name: string
  description: string | null
  logo: string | null
  created_at: string
  role: WorkspaceRole | null
}

export interface WorkspaceCreate {
  name: string
  description?: string | null
  logo?: string | null
}

export interface WorkspaceUpdate {
  name?: string
  description?: string | null
  logo?: string | null
}

export interface MemberRead {
  user_id: string
  workspace_id: string
  role: WorkspaceRole
  email: string
  name: string
  image: string | null
}

export interface MemberInvite {
  email: string
  role?: WorkspaceRole
}

export interface MemberUpdate {
  role: WorkspaceRole
}

export interface Project {
  id: string
  name: string
  description: string | null
  workspace_id: string
  start_date: string | null
  end_date: string | null
  priority: Priority
  project_lead_id: string | null
  project_lead_name?: string | null
  project_lead_email?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectCreate {
  name: string
  description?: string | null
  workspace_id: string
  start_date?: string | null
  end_date?: string | null
  priority?: Priority
  project_lead_id?: string | null
  assignee_email?: string | null
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  priority?: Priority
  project_lead_id?: string | null
  assignee_email?: string | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  project_id: string
  assigned_to?: string | null
  status: TaskStatus
  priority: Priority
  start_date?: string | null
  due_date: string | null
  assignee_name?: string | null
  assignee_email?: string | null
  assigned_to_email?: string | null
  task_type?: TaskType
  created_at?: string
  updated_at?: string
}

export interface TaskCreate {
  title: string
  description?: string | null
  project_id: string
  assigned_to?: string | null
  assignee_email?: string | null
  assigned_to_email?: string | null
  status?: TaskStatus
  priority?: Priority
  start_date?: string | null
  due_date?: string | null
  task_type?: TaskType
}

export interface TaskAnalytics {
  by_status: Record<TaskStatus, number>
  by_priority: Record<Priority, number>
  total: number
}
