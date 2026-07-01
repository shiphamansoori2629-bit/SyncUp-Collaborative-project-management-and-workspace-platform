import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getWorkspaceTaskAnalytics } from '@/api/analytics'
import { listProjects } from '@/api/projects'
import { listTasks, updateTaskStatus } from '@/api/tasks'
import { ProjectCreateModal } from '@/components/modals/ProjectCreateModal'
import { TaskCreateModal } from '@/components/modals/TaskCreateModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataRefresh } from '@/context/DataRefreshContext'
import { useTheme } from '@/context/ThemeContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Project, Task, TaskStatus } from '@/types'

const HIDDEN_DISCUSSION_TASK_TITLE = '__syncup_discussion__'

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  DONE: '#10b981',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#8b5cf6',
  HIGH: '#f43f5e',
}

const statusVariant: Record<TaskStatus, 'secondary' | 'default' | 'success'> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  DONE: 'success',
}

const priorityVariant: Record<string, 'secondary' | 'warning' | 'danger'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

export function Dashboard() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace()
  const { theme } = useTheme()
  const { version } = useDataRefresh()
  const hasBackground = !!activeWorkspace?.logo
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!activeWorkspace) {
      setProjects([])
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [projectData, taskData] = await Promise.all([
        listProjects(activeWorkspace.id),
        listTasks({ workspace_id: activeWorkspace.id }),
        getWorkspaceTaskAnalytics(activeWorkspace.id),
      ])
      setProjects(projectData)
      setTasks(taskData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard, version])

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.title !== HIDDEN_DISCUSSION_TASK_TITLE),
    [tasks],
  )

  const overdueCount = useMemo(
    () => visibleTasks.filter((t) => isOverdue(t.due_date, t.status)).length,
    [visibleTasks],
  )

  const completedCount = useMemo(
    () => visibleTasks.filter((t) => t.status === 'DONE').length,
    [visibleTasks],
  )
  const totalTasks = visibleTasks.length

  const statusChartData = useMemo(() => {
    const counts: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 }
    for (const task of visibleTasks) {
      counts[task.status] += 1
    }
    return (Object.entries(counts) as [TaskStatus, number][]).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      key: name,
    }))
  }, [visibleTasks])

  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
    for (const task of visibleTasks) {
      counts[task.priority] = (counts[task.priority] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [visibleTasks])

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  )

  const sortedTasks = useMemo(() => {
    return [...visibleTasks].sort((a, b) => {
      const aOver = isOverdue(a.due_date, a.status)
      const bOver = isOverdue(b.due_date, b.status)
      if (aOver !== bOver) return aOver ? -1 : 1
      if (a.status === 'DONE' && b.status !== 'DONE') return 1
      if (b.status === 'DONE' && a.status !== 'DONE') return -1
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      return a.title.localeCompare(b.title)
    })
  }, [visibleTasks])

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    setUpdatingId(task.id)
    try {
      const updated = await updateTaskStatus(task.id, status)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      void loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setUpdatingId(null)
    }
  }

  if (wsLoading || (loading && activeWorkspace)) {
    return <DashboardSkeleton />
  }

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No workspace selected</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Create or select a workspace from the sidebar.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-8 p-4 rounded-2xl transition-all duration-300", hasBackground && (theme === 'dark' ? "force-white-text" : "force-dark-text"))}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-shadow high-contrast-text">Dashboard</h1>
          <p className="mt-1 high-contrast-text opacity-90 text-lg">
            Live data for <span className="font-black underline decoration-primary underline-offset-4">{activeWorkspace.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setProjectModalOpen(true)} className="gap-2 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 shadow-md font-bold">
            <Plus className="h-4 w-4" />
            New project
          </Button>
          <Button onClick={() => setTaskModalOpen(true)} className="gap-2 shadow-xl shadow-primary/30 font-bold" disabled={projects.length === 0}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm font-bold text-rose-600 dark:text-rose-400 backdrop-blur-md">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadDashboard()} className="border-rose-500/20 hover:bg-rose-500/20">
            Retry
          </Button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Tasks" value={totalTasks} icon={ClipboardList} accent="from-indigo-500 to-blue-600" />
        <SummaryCard title="Completed" value={completedCount} icon={CheckCircle2} accent="from-emerald-500 to-teal-600" />
        <SummaryCard title="Overdue" value={overdueCount} icon={AlertCircle} accent="from-rose-500 to-orange-600" />
        <SummaryCard title="Projects" value={projects.length} icon={FolderKanban} accent="from-amber-500 to-yellow-600" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6">
            <CardTitle className="high-contrast-text text-shadow text-xl">Tasks by status</CardTitle>
            <CardDescription className="high-contrast-text opacity-70 font-medium">Distribution of tasks in your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="h-80 p-6">
            {statusChartData.every((d) => d.value === 0) ? (
              <p className="flex h-full items-center justify-center text-sm high-contrast-text opacity-40 italic font-bold">No task data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={{ fill: !hasBackground ? (theme === 'dark' ? '#fff' : '#0f172a') : '#0f172a', fontSize: 13, fontWeight: 'bold' }}>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key as TaskStatus]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6">
            <CardTitle className="high-contrast-text text-shadow text-xl">Tasks by priority</CardTitle>
            <CardDescription className="high-contrast-text opacity-70 font-medium">Distribution across LOW, MEDIUM, HIGH</CardDescription>
          </CardHeader>
          <CardContent className="h-80 p-6">
            {priorityChartData.every((d) => d.value === 0) ? (
              <p className="flex h-full items-center justify-center text-sm high-contrast-text opacity-40 italic font-bold">No task data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData}>
                  <XAxis dataKey="name" stroke={!hasBackground ? (theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : 'rgba(0,0,0,0.5)'} fontSize={12} fontWeight="bold" />
                  <YAxis allowDecimals={false} stroke={!hasBackground ? (theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : 'rgba(0,0,0,0.5)'} fontSize={12} fontWeight="bold" />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                    {priorityChartData.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-0 shadow-2xl">
        <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-shadow high-contrast-text text-xl">
                <ClipboardList className="h-6 w-6 text-primary drop-shadow-high" />
                Task list
              </CardTitle>
              <CardDescription className="high-contrast-text opacity-70 font-medium">Active tasks in this workspace</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 shadow-sm font-bold px-4">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedTasks.length === 0 ? (
            <p className="p-12 text-center text-sm high-contrast-text opacity-60 font-bold italic">
              No tasks yet. Create a project, then add a task.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-left high-contrast-text opacity-70">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Due</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10 high-contrast-text">
                  {sortedTasks.map((task) => {
                    const overdue = isOverdue(task.due_date, task.status)
                    return (
                      <tr
                        key={task.id}
                        className={cn('transition-colors hover:bg-black/5 dark:hover:bg-white/5', overdue && 'bg-rose-500/5 dark:bg-rose-500/10')}
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-base">{task.title}</p>
                          {task.description && (
                            <p className="line-clamp-1 text-xs opacity-60 font-medium mt-0.5">{task.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 opacity-80 font-bold">
                          {projectNameById[task.project_id] ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={statusVariant[task.status]}
                            className={cn(
                              'font-medium px-2.5 py-1 rounded-full text-xs',
                              task.status === 'TODO' && 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-white/10 dark:text-slate-100',
                              task.status === 'IN_PROGRESS' && 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800',
                            )}
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={priorityVariant[task.priority]}
                            className={cn(
                              'font-black px-3 py-1',
                              task.priority === 'LOW' && 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-white/10 dark:text-slate-100',
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 opacity-90">
                          <span className={cn('font-black text-sm', overdue && 'text-rose-600 dark:text-rose-400')}>
                            {formatDate(task.due_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {updatingId === task.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto" />
                          ) : (
                            <div className="flex justify-end gap-2">
                              {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && (
                                <Button size="sm" variant="outline" onClick={() => void handleStatusChange(task, 'IN_PROGRESS')} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 shadow-sm font-bold">
                                  Start
                                </Button>
                              )}
                              {task.status !== 'DONE' && (
                                <Button size="sm" onClick={() => void handleStatusChange(task, 'DONE')} className="shadow-lg shadow-primary/20 font-bold">
                                  Done
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectCreateModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        workspaceId={activeWorkspace.id}
      />
      <TaskCreateModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        workspaceId={activeWorkspace.id}
      />
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg transition-transform hover:scale-105">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg drop-shadow-high', accent)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium high-contrast-text opacity-70">{title}</p>
          <p className="text-3xl font-bold tracking-tight high-contrast-text text-shadow">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-64 bg-black/5 dark:bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl bg-black/5 dark:bg-white/5" />
        <Skeleton className="h-80 rounded-xl bg-black/5 dark:bg-white/5" />
      </div>
      <Skeleton className="h-96 rounded-xl bg-black/5 dark:bg-white/5" />
    </div>
  )
}
