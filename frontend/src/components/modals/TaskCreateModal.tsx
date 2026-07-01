import { useEffect, useState } from 'react'
import { Calendar, Mail } from 'lucide-react'
import { createTask } from '@/api/tasks'
import { listProjects } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDataRefresh } from '@/context/DataRefreshContext'
import type { Priority, Project, TaskStatus } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: string
}

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

export function TaskCreateModal({ open, onClose, workspaceId }: Props) {
  const { notifyDataChanged } = useDataRefresh()
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeEmail, setAssigneeEmail] = useState('')
  const [status, setStatus] = useState<TaskStatus>('TODO')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !workspaceId) return
    void (async () => {
      try {
        const projs = await listProjects(workspaceId)
        setProjects(projs)
        if (projs.length > 0) setProjectId(projs[0].id)
      } catch {
        setError('Failed to load projects')
      }
    })()
  }, [open, workspaceId])

  const reset = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setAssigneeEmail('')
    setStatus('TODO')
    setPriority('MEDIUM')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!projectId) {
      setError('Select a project')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        assignee_email: assigneeEmail.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
      })
      notifyDataChanged()
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      description="POST /api/tasks — triggers Brevo email when assignee email is set."
      className="max-h-[90vh] max-w-xl overflow-y-auto"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Title *</Label>
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-desc">Description</Label>
          <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-project">Project *</Label>
          <Select id="task-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
            <option value="" disabled>Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <Select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="font-medium"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-status">Status</Label>
            <Select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-due" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Due date
          </Label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Sent to API as YYYY-MM-DD</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Assignee email
          </Label>
          <Input
            id="task-email"
            type="email"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            placeholder="teammate@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Allow tasks to be successfully created for any assignee email entered. Triggers assignment email via Brevo.
          </p>
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting || projects.length === 0}>
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
