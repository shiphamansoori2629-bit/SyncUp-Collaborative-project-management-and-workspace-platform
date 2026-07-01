import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, FolderKanban, Plus, User } from 'lucide-react'
import { listProjects, updateProject } from '@/api/projects'
import { listMembers } from '@/api/workspaces'
import { InlineEmailAssignMenu } from '@/components/InlineEmailAssignMenu'
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataRefresh } from '@/context/DataRefreshContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { cn, formatDate } from '@/lib/utils'
import type { Project } from '@/types'

const priorityVariant: Record<string, 'secondary' | 'warning' | 'danger'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

const FALLBACK_ASSIGN_EMAILS = ['developer@srit.edu']

export function Projects() {
  const { activeWorkspace } = useWorkspace()
  const { theme } = useTheme()
  const { version } = useDataRefresh()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [memberEmails, setMemberEmails] = useState<string[]>(FALLBACK_ASSIGN_EMAILS)
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null)
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null)
  const hasBackground = !!activeWorkspace?.logo

  const assignableEmails = useMemo(() => {
    const emails = memberEmails.length > 0 ? memberEmails : FALLBACK_ASSIGN_EMAILS
    return [...new Set(emails)]
  }, [memberEmails])

  const load = useCallback(async () => {
    if (!activeWorkspace) {
      setProjects([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects(activeWorkspace.id)
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    void load()
  }, [load, version])

  useEffect(() => {
    if (!activeWorkspace) {
      setMemberEmails(FALLBACK_ASSIGN_EMAILS)
      return
    }
    void (async () => {
      try {
        const members = await listMembers(activeWorkspace.id)
        const emails = members.map((m) => m.email).filter(Boolean)
        setMemberEmails(emails.length > 0 ? emails : FALLBACK_ASSIGN_EMAILS)
      } catch {
        setMemberEmails(FALLBACK_ASSIGN_EMAILS)
      }
    })()
  }, [activeWorkspace])

  const handleAssignProjectLead = async (projectId: string, email: string) => {
    setAssigningProjectId(projectId)
    try {
      const updated = await updateProject(projectId, { assignee_email: email })
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign project lead')
    } finally {
      setAssigningProjectId(null)
      setAssignProjectId(null)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 py-20 text-center glass-panel">
        <FolderKanban className="mb-4 h-12 w-12 text-primary opacity-40" />
        <p className="text-lg font-black high-contrast-text">Select a workspace to view projects.</p>
      </div>
    )
  }

  const isPlain = !hasBackground

  return (
    <div className={cn("space-y-8 transition-all duration-300", !isPlain && (theme === 'dark' ? "force-white-text" : "force-dark-text"))}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-shadow high-contrast-text">Projects</h1>
          <p className="mt-2 text-lg font-medium opacity-90 high-contrast-text">
            Active projects in <span className="font-black underline decoration-primary underline-offset-4">{activeWorkspace.name}</span>
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-xl shadow-primary/30 font-black px-6 py-6 h-auto">
          <Plus className="h-5 w-5" />
          New project
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border-2 border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm font-black text-rose-600 dark:text-rose-400 backdrop-blur-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 py-24 glass-panel">
          <p className="mb-6 text-xl font-black opacity-60 high-contrast-text">No projects yet.</p>
          <Button onClick={() => setModalOpen(true)} size="lg" className="font-black">Create your first project</Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block">
              <Card className="h-full border-0 transition-all hover:scale-[1.03] overflow-hidden group cursor-pointer">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold group-hover:text-primary transition-colors">
                      <FolderKanban className="h-6 w-6 text-primary drop-shadow-high" />
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant={priorityVariant[project.priority]}
                      className={cn(
                        'font-semibold px-3 py-1',
                        project.priority === 'LOW' && 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-white/10 dark:text-slate-100',
                      )}
                    >
                      {project.priority}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2 mt-2 text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium opacity-80">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>
                        {formatDate(project.start_date)} → {formatDate(project.end_date)}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-3 text-sm font-medium opacity-80">
                      <User className="h-4 w-4 shrink-0 text-primary" />
                      {project.project_lead_name || project.project_lead_email ? (
                        <span className="truncate">
                          {project.project_lead_name || project.project_lead_email}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={assigningProjectId === project.id}
                          className="truncate cursor-pointer text-left text-primary hover:underline disabled:opacity-50"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setAssignProjectId((current) => (current === project.id ? null : project.id))
                          }}
                        >
                          {assigningProjectId === project.id ? 'Assigning…' : 'Unassigned'}
                        </button>
                      )}
                      <InlineEmailAssignMenu
                        emails={assignableEmails}
                        open={assignProjectId === project.id}
                        onClose={() => setAssignProjectId(null)}
                        onSelect={(email) => void handleAssignProjectLead(project.id, email)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={activeWorkspace.id}
      />
    </div>
  )
}
