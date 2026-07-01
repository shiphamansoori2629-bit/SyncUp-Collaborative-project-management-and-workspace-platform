import { useState } from 'react'
import { createWorkspace } from '@/api/workspaces'
import { LogoFileInput } from '@/components/LogoFileInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useDataRefresh } from '@/context/DataRefreshContext'
import { useWorkspace } from '@/context/WorkspaceContext'

interface Props {
  open: boolean
  onClose: () => void
}

export function WorkspaceCreateModal({ open, onClose }: Props) {
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspace()
  const { notifyDataChanged } = useDataRefresh()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setLogoFile(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Workspace name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const workspace = await createWorkspace({
        name: trimmed,
        description: description.trim() || null,
        logoFile,
      })
      await refreshWorkspaces()
      setActiveWorkspaceId(workspace.id)
      notifyDataChanged()
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create workspace"
      description="Upload a logo image and set your workspace details."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ws-name">Workspace name *</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Design Team"
            maxLength={255}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ws-desc">Description</Label>
          <Textarea
            id="ws-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this workspace for?"
            rows={3}
          />
        </div>
        <LogoFileInput id="ws-logo-file" file={logoFile} onFileChange={setLogoFile} />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create workspace'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
