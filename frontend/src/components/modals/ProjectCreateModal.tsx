import { useState } from 'react'
import { createProject } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDataRefresh } from '@/context/DataRefreshContext'
import type { Priority } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: string
}

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH']

export function ProjectCreateModal({ open, onClose, workspaceId }: Props) {
  const { notifyDataChanged } = useDataRefresh()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [assigneeEmail, setAssigneeEmail] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setAssigneeEmail('')
    setPriority('MEDIUM')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || null,
        workspace_id: workspaceId,
        start_date: startDate || null,
        end_date: endDate || null,
        priority,
        assignee_email: assigneeEmail.trim() || null,
      })
      notifyDataChanged()
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="POST /api/projects — matches ProjectCreate schema."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="proj-name">Name *</Label>
          <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-desc">Description</Label>
          <Textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proj-start">Start date</Label>
            <Input id="proj-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-end">End date</Label>
            <Input id="proj-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignee_email">Project Lead Email</Label>
          <Input
            id="assignee_email"
            type="email"
            placeholder="lead@srit.edu"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proj-priority">Priority</Label>
            <Select id="proj-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Create project'}</Button>
        </div>
      </form>
    </Modal>
  )
}
