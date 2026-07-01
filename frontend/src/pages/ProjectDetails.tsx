import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  CheckCircle2,
  FolderKanban,
  MessageSquare,
  Send,
  Trash2,
  User as UserIcon,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  Plus,
  ArrowLeft,
  Shield,
  Terminal,
  Palette,
  FileText,
  Layers,
} from 'lucide-react'
import { getProject, deleteProject } from '@/api/projects'
import { createProjectComment, listProjectComments } from '@/api/comments'
import { listTasks, createTask, deleteTask, updateTask } from '@/api/tasks'
import { listMembers } from '@/api/workspaces'
import { InlineEmailAssignMenu } from '@/components/InlineEmailAssignMenu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDate } from '@/lib/utils'
import type { Project, Task, TaskStatus, TaskType, Priority } from '@/types'

type NewTaskStatus = 'todo' | 'in_progress' | 'done'

const newTaskStatusToApi: Record<NewTaskStatus, TaskStatus> = {
  todo: 'TODO',
  in_progress: 'IN_PROGRESS',
  done: 'DONE',
}

const priorityVariant: Record<string, 'secondary' | 'warning' | 'danger'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

const FALLBACK_ASSIGN_EMAILS = ['developer@srit.edu']

const priorityBorderColor: Record<string, string> = {
  LOW: 'border-l-slate-400',
  MEDIUM: 'border-l-amber-500',
  HIGH: 'border-l-rose-500',
}

const taskTypeConfig = {
  coding: {
    icon: Terminal,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    label: 'Coding & Development',
    border: 'border-emerald-500/30',
  },
  designing: {
    icon: Palette,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    label: 'UI/UX Designing',
    border: 'border-purple-500/30',
  },
  qa: {
    icon: Shield,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    label: 'Software Testing & QA',
    border: 'border-rose-500/30',
  },
  db: {
    icon: Terminal,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Database Design',
    border: 'border-blue-500/30',
  },
  review: {
    icon: CheckCircle2,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Code Review',
    border: 'border-amber-500/30',
  },
  document: {
    icon: FileText,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    label: 'Technical Documentation',
    border: 'border-sky-500/30',
  },
  devops: {
    icon: RotateCcw,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    label: 'DevOps & Deployment',
    border: 'border-orange-500/30',
  },
  planning: {
    icon: FolderKanban,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    label: 'Project Planning',
    border: 'border-indigo-500/30',
  },
  architecture: {
    icon: Layers,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    label: 'System Architecture',
    border: 'border-cyan-500/30',
  },
  bugs: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Bug Tracking',
    border: 'border-red-500/30',
  },
  audit: {
    icon: Shield,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    label: 'Security Audit',
    border: 'border-slate-500/30',
  },
  feedback: {
    icon: MessageSquare,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    label: 'Client Feedback',
    border: 'border-pink-500/30',
  },
} as const

const platformCategories = {
  coding: {
    label: 'Coding & Development',
    top: [
      { label: 'VS Code Web', url: 'https://vscode.dev' },
      { label: 'StackBlitz', url: 'https://stackblitz.com' },
      { label: 'GitHub Codespaces', url: 'https://github.com/codespaces' },
    ],
    mid: [
      { label: 'CodePen', url: 'https://codepen.io' },
      { label: 'Replit', url: 'https://replit.com' },
      { label: 'JSFiddle', url: 'https://jsfiddle.net' },
      { label: 'GitPod', url: 'https://gitpod.io' },
    ],
  },
  designing: {
    label: 'UI/UX Designing',
    top: [
      { label: 'Figma', url: 'https://www.figma.com' },
      { label: 'Adobe Express', url: 'https://www.adobe.com/express' },
      { label: 'Framer', url: 'https://www.framer.com' },
    ],
    mid: [
      { label: 'Canva', url: 'https://www.canva.com' },
      { label: 'Pixlr', url: 'https://pixlr.com' },
      { label: 'Photopea', url: 'https://www.photopea.com' },
      { label: 'Penpot', url: 'https://penpot.app' },
    ],
  },
  qa: {
    label: 'Software Testing & QA',
    top: [
      { label: 'Postman Web', url: 'https://www.postman.com' },
      { label: 'LambdaTest', url: 'https://www.lambdatest.com' },
      { label: 'Hoppscotch', url: 'https://hoppscotch.io' },
    ],
    mid: [
      { label: 'ReqBin', url: 'https://reqbin.com' },
      { label: 'TestSigma', url: 'https://testsigma.com' },
      { label: 'BrowserStack', url: 'https://www.browserstack.com' },
      { label: 'Assertible', url: 'https://assertible.com' },
    ],
  },
  db: {
    label: 'Database Design',
    top: [
      { label: 'dbdiagram.io', url: 'https://dbdiagram.io' },
      { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' },
      { label: 'Prisma Studio', url: 'https://www.prisma.io/studio' },
    ],
    mid: [
      { label: 'MongoDB Atlas', url: 'https://www.mongodb.com/atlas' },
      { label: 'QuickDBD', url: 'https://www.quickdatabasediagrams.com' },
      { label: 'Draw.io DB', url: 'https://app.diagrams.net' },
      { label: 'SQLFiddle', url: 'http://sqlfiddle.com' },
    ],
  },
  review: {
    label: 'Code Review',
    top: [
      { label: 'GitHub PRs', url: 'https://github.com/pulls' },
      { label: 'GitLab Merge Requests', url: 'https://gitlab.com' },
      { label: 'CodeScene', url: 'https://codescene.com' },
    ],
    mid: [
      { label: 'SonarCloud', url: 'https://sonarcloud.io' },
      { label: 'Reviewable', url: 'https://reviewable.io' },
      { label: 'Codacy', url: 'https://www.codacy.com' },
      { label: 'PullRequest', url: 'https://www.pullrequest.com' },
    ],
  },
  document: {
    label: 'Technical Documentation',
    top: [
      { label: 'Notion', url: 'https://www.notion.so' },
      { label: 'Google Docs', url: 'https://docs.google.com' },
      { label: 'Miro', url: 'https://miro.com' },
    ],
    mid: [
      { label: 'MS Word Online', url: 'https://www.office.com/launch/word' },
      { label: 'Excalidraw', url: 'https://excalidraw.com' },
      { label: 'GitBook', url: 'https://www.gitbook.com' },
      { label: 'Confluence Web', url: 'https://www.atlassian.com/software/confluence' },
    ],
  },
  devops: {
    label: 'DevOps & Deployment',
    top: [
      { label: 'Vercel Dashboard', url: 'https://vercel.com/dashboard' },
      { label: 'Netlify App', url: 'https://app.netlify.com' },
      { label: 'GitHub Actions', url: 'https://github.com/features/actions' },
    ],
    mid: [
      { label: 'Render Dashboard', url: 'https://dashboard.render.com' },
      { label: 'CircleCI', url: 'https://circleci.com' },
      { label: 'Heroku Dashboard', url: 'https://dashboard.heroku.com' },
      { label: 'Railway App', url: 'https://railway.app' },
    ],
  },
  planning: {
    label: 'Project Planning',
    top: [
      { label: 'Trello Board', url: 'https://trello.com' },
      { label: 'Asana', url: 'https://asana.com' },
      { label: 'Jira Software', url: 'https://www.atlassian.com/software/jira' },
    ],
    mid: [
      { label: 'ClickUp', url: 'https://clickup.com' },
      { label: 'Monday.com', url: 'https://monday.com' },
      { label: 'Wrike', url: 'https://www.wrike.com' },
      { label: 'Linear', url: 'https://linear.app' },
    ],
  },
  architecture: {
    label: 'System Architecture',
    top: [
      { label: 'Lucidchart', url: 'https://www.lucidchart.com' },
      { label: 'Diagrams.net', url: 'https://app.diagrams.net' },
      { label: 'Cloudcraft', url: 'https://www.cloudcraft.co' },
    ],
    mid: [
      { label: 'Whimsical', url: 'https://whimsical.com' },
      { label: 'Eraser.io', url: 'https://www.eraser.io' },
      { label: 'Cacoo', url: 'https://cacoo.com' },
      { label: 'Terrastruct', url: 'https://terrastruct.com' },
    ],
  },
  bugs: {
    label: 'Bug Tracking',
    top: [
      { label: 'GitHub Issues', url: 'https://github.com/issues' },
      { label: 'Sentry', url: 'https://sentry.io' },
      { label: 'Bugsnag', url: 'https://www.bugsnag.com' },
    ],
    mid: [
      { label: 'LogRocket', url: 'https://logrocket.com' },
      { label: 'Airbrake', url: 'https://airbrake.io' },
      { label: 'Rollbar', url: 'https://rollbar.com' },
      { label: 'Datadog', url: 'https://www.datadoghq.com' },
    ],
  },
  audit: {
    label: 'Security Audit',
    top: [
      { label: 'Snyk Dashboard', url: 'https://snyk.io' },
      { label: 'OWASP ZAP', url: 'https://www.zaproxy.org' },
      { label: 'Burp Suite Web', url: 'https://portswigger.net' },
    ],
    mid: [
      { label: 'Checkmarx', url: 'https://checkmarx.com' },
      { label: 'Veracode', url: 'https://www.veracode.com' },
      { label: 'WhiteSource', url: 'https://www.mend.io' },
      { label: 'Qualys', url: 'https://www.qualys.com' },
    ],
  },
  feedback: {
    label: 'Client Feedback',
    top: [
      { label: 'Typeform', url: 'https://www.typeform.com' },
      { label: 'SurveyMonkey', url: 'https://www.surveymonkey.com' },
      { label: 'Google Forms', url: 'https://forms.google.com' },
    ],
    mid: [
      { label: 'Hotjar', url: 'https://www.hotjar.com' },
      { label: 'UserTesting', url: 'https://www.usertesting.com' },
      { label: 'Canny', url: 'https://canny.io' },
      { label: 'Productboard', url: 'https://www.productboard.com' },
    ],
  },
}

export function ProjectDetails() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()

  // ── Data state ──
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [deletingProject, setDeletingProject] = useState(false)

  // ── Navigation state ──
  // selectedTaskId tracks WHICH task is chosen; isWorkspaceOpen controls VIEW 2.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)

  // ── Timer state ──
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [, setIdleCounter] = useState(0)
  const [showIdleModal, setShowIdleModal] = useState(false)
  const [auditLogs, setAuditLogs] = useState<string[]>([])

  // ── Task creation state ──
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM')
  const [newTaskStatus, setNewTaskStatus] = useState<NewTaskStatus>('todo')
  const [newTaskAssigneeEmail, setNewTaskAssigneeEmail] = useState('')
  const [newTaskStartDate, setNewTaskStartDate] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  // ── Inline assignment state ──
  const [memberEmails, setMemberEmails] = useState<string[]>(FALLBACK_ASSIGN_EMAILS)
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null)
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null)

  // ── Workspace Hub state ──
  const [activeWorkspaceCategory, setActiveWorkspaceCategory] = useState<keyof typeof platformCategories>('coding')

  // ── Derived ──
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getTaskProgress = (task: Task) => {
    const desc = task.description || ''
    const totalMatches = desc.match(/- \[( |x)\]/g)
    if (!totalMatches) return { percent: 0, total: 0, checked: 0 }
    const checkedMatches = desc.match(/- \[x\]/g)
    const checked = checkedMatches ? checkedMatches.length : 0
    const total = totalMatches.length
    return { percent: Math.round((checked / total) * 100), total, checked }
  }

  const getTaskType = (task: Task): TaskType => {
    if (task.task_type) return task.task_type
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase()
    
    if (/\b(api|dev|code|git|frontend|backend|endpoint|compiler|script|function|logic|repository|integration)\b/.test(text)) return 'coding'
    if (/\b(test|qa|quality|automation|bug|issue|verify|postman|hoppscotch|assertion|scenario)\b/.test(text)) return 'qa'
    if (/\b(drawing|wireframe|design|canvas|logo|color|theme|ui|ux|sketch|mockup|css|illustration|prototype)\b/.test(text)) return 'designing'
    if (/\b(db|database|sql|schema|migration|postgresql|mongodb|table|query|index|nosql)\b/.test(text)) return 'db'
    if (/\b(review|audit|pr|pull|merge|inspect|standard|lint)\b/.test(text)) return 'review'
    if (/\b(devops|deploy|cicd|actions|vercel|netlify|cloud|pipeline|docker|kubernetes)\b/.test(text)) return 'devops'
    if (/\b(plan|schedule|roadmap|trello|jira|board|timeline|milestone)\b/.test(text)) return 'planning'
    if (/\b(architecture|diagram|structure|system|lucidchart|drawio|flowchart)\b/.test(text)) return 'architecture'
    if (/\b(security|vulnerability|penetration|snyk|auth|jwt|encryption|ssl)\b/.test(text)) return 'audit'
    if (/\b(feedback|survey|client|user|response|opinion|poll)\b/.test(text)) return 'feedback'
    
    return 'document'
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [h, m, sec].map((v) => (v < 10 ? '0' + v : v)).join(':')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Timer effects
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let interval: any = null
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
        setIdleCounter((prev) => {
          const next = prev + 1
          if (next >= 300) {
            setTimerActive(false)
            setShowIdleModal(true)
            return 0
          }
          return next
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  useEffect(() => {
    if (!timerActive) return
    const reset = () => setIdleCounter(0)
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('click', reset)
    window.addEventListener('scroll', reset)
    return () => {
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('click', reset)
      window.removeEventListener('scroll', reset)
    }
  }, [timerActive])

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleConfirmIdleBreak = (wasBreak: boolean) => {
    setShowIdleModal(false)
    if (wasBreak) {
      setTimerSeconds((prev) => Math.max(0, prev - 300))
    } else {
      const ts = new Date().toLocaleTimeString()
      setAuditLogs((prev) => [
        `[${ts}] Idle override: user declared 5m idle as active work on "${selectedTask?.title ?? 'Unknown Task'}"`,
        ...prev,
      ])
    }
    setTimerActive(true)
  }

  const openWorkspace = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const type = getTaskType(task)
      setActiveWorkspaceCategory(type as keyof typeof platformCategories)
    }
    setSelectedTaskId(taskId)
    setIsWorkspaceOpen(true)
  }
  const closeWorkspace = () => {
    setIsWorkspaceOpen(false)
    setTimerActive(false)
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !projectId) return
    setIsCreatingTask(true)
    try {
      const payload = {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        project_id: projectId,
        task_type: activeWorkspaceCategory as TaskType, // Fallback to active workspace tab
        priority: newTaskPriority,
        status: newTaskStatusToApi[newTaskStatus],
        assignee_email: newTaskAssigneeEmail.trim() || null,
        start_date: newTaskStartDate || null,
        due_date: newTaskDueDate || null,
      }
      const created = await createTask(payload)
      setTasks((prev) => [created, ...prev])
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskAssigneeEmail('')
      setNewTaskStartDate('')
      setNewTaskDueDate('')
    } catch (err) {
      console.error('Failed to create task:', err)
      // Fallback for demo/local mode
      const mockTask: Task = {
        id: Math.random().toString(),
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        project_id: projectId,
        task_type: activeWorkspaceCategory as TaskType,
        priority: newTaskPriority,
        status: newTaskStatusToApi[newTaskStatus],
        start_date: newTaskStartDate || null,
        due_date: newTaskDueDate || null,
        assignee_email: newTaskAssigneeEmail.trim() || 'Unassigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setTasks((prev) => [mockTask, ...prev])
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskAssigneeEmail('')
      setNewTaskStartDate('')
      setNewTaskDueDate('')
    } finally {
      setIsCreatingTask(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLocalBackup = useCallback(() => {
    const name =
      projectId === '48ec9ef7-fbfc-4116-9da3-3430a6b13b82' ? 'Green Soul Pro' : 'EcoBuy Platform'
    const desc =
      projectId === '48ec9ef7-fbfc-4116-9da3-3430a6b13b82'
        ? 'A full-stack web application for plant care, watering schedules, and diagnostics.'
        : 'A sustainable e-commerce web application focusing on eco-friendly lifestyle products.'

    setProject({
      id: projectId || 'backup-id',
      name,
      description: desc,
      priority: 'MEDIUM',
      workspace_id: 'srit-mca-workspace',
      project_lead_id: null,
      project_lead_name: user?.fullName || 'MCA Student',
      project_lead_email: user?.primaryEmailAddress?.emailAddress || 'student@srit.edu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    setTasks([
      {
        id: 'task-1',
        project_id: projectId || 'backup-id',
        title: 'Integrate Razorpay Payment Gateway',
        description:
          'Implement the payment processing logic using Razorpay API.\n- [x] Install razorpay-node\n- [ ] Configure webhook secret',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: '2026-06-15T18:30:00.000Z',
        task_type: 'coding',
        assignee_name: user?.fullName || 'Developer',
        assignee_email: user?.primaryEmailAddress?.emailAddress || 'student@srit.edu',
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        project_id: projectId || 'backup-id',
        title: 'Connect Frontend API Fetch Calls',
        description: 'Verify endpoints with Uvicorn FastAPI server and handle state management.',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: '2026-06-22T18:30:00.000Z',
        task_type: 'coding',
        assignee_name: 'Unassigned',
        assignee_email: 'dev@srit.edu',
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-3',
        project_id: projectId || 'backup-id',
        title: 'Design Logo & Branding Mockups',
        description: 'Create wireframe mockups and the color palette for the application UI/UX.',
        status: 'TODO',
        priority: 'LOW',
        due_date: '2026-06-30T18:30:00.000Z',
        task_type: 'designing',
        assignee_name: 'Unassigned',
        assignee_email: 'designer@srit.edu',
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-4',
        project_id: projectId || 'backup-id',
        title: 'Write Project Documentation Report',
        description: 'Draft the project specification, API docs, and onboarding notes for the team.',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: '2026-07-05T18:30:00.000Z',
        task_type: 'document',
        assignee_name: 'Unassigned',
        assignee_email: 'writer@srit.edu',
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    setLoading(false)
  }, [projectId, user])

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    
    // Safety fallback: if API hangs, use local backup after 3 seconds
    const fallbackTimer = setTimeout(() => {
      setProject(prev => {
        if (!prev) {
          handleLocalBackup()
          return null // handleLocalBackup will set it
        }
        return prev
      })
    }, 3000)

    try {
      const data = await getProject(projectId)
      if (data) {
        setProject(data)
        const taskData = await listTasks({ project_id: projectId })
        setTasks(taskData ?? [])
        setLoading(false)
      } else {
        handleLocalBackup()
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      handleLocalBackup()
    } finally {
      clearTimeout(fallbackTimer)
    }
  }, [projectId, handleLocalBackup])

  const loadComments = useCallback(async () => {
    if (!projectId || projectId.includes('backup')) {
      setComments([])
      return
    }
    try {
      const data = await listProjectComments(projectId)
      setComments(data ?? [])
    } catch {
      setComments([])
    }
  }, [projectId])

  useEffect(() => { loadProject() }, [loadProject])
  useEffect(() => { void loadComments() }, [loadComments])

  useEffect(() => {
    if (!project?.workspace_id) return
    void (async () => {
      try {
        const members = await listMembers(project.workspace_id)
        const emails = members.map((m) => m.email).filter(Boolean)
        setMemberEmails(emails.length > 0 ? emails : FALLBACK_ASSIGN_EMAILS)
      } catch {
        setMemberEmails(FALLBACK_ASSIGN_EMAILS)
      }
    })()
  }, [project?.workspace_id])

  const handleAssignTaskMember = async (taskId: string, email: string) => {
    setAssigningTaskId(taskId)
    try {
      const updated = await updateTask(taskId, { assignee_email: email })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      console.error('Failed to assign task member:', err)
    } finally {
      setAssigningTaskId(null)
      setAssignTaskId(null)
    }
  }

  const handleDeleteProject = async () => {
    if (!project?.id) return
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return
    
    setDeletingProject(true)
    try {
      // Clear local state first for instant feedback
      setTasks([])
      setComments([])
      
      await deleteProject(project.id)
      
      // programmatic redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to delete project:', err)
      // Fallback for demo projects
      if (project.id.includes('backup')) {
        navigate('/projects')
      } else {
        alert('Could not delete project from database. Please try again.')
      }
    } finally {
      setDeletingProject(false)
    }
  }

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this task?')) return
    
    try {
      await deleteTask(taskId)
      
      // Update local state ONLY after successful backend response
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null)
        setIsWorkspaceOpen(false)
      }
    } catch (err) {
      console.error('Failed to delete task:', err)
      // Fallback for demo tasks
      if (taskId.startsWith('task-')) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null)
          setIsWorkspaceOpen(false)
        }
      } else {
        alert('Database sync failed. Task could not be removed.')
      }
    }
  }

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !projectId) return
    const content = commentText.trim()
    setCommentText('')

    if (projectId.includes('backup')) {
      setComments((prev) => [
        {
          id: Math.random().toString(),
          content,
          created_at: new Date().toISOString(),
          author_name: user?.fullName || 'You',
          author_image: user?.imageUrl || null,
        },
        ...prev,
      ])
      return
    }

    try {
      const created = await createProjectComment({ project_id: projectId, content })
      setComments((prev) => [
        {
          id: created.id,
          content: created.content,
          created_at: created.created_at,
          author_name: created.author_name ?? user?.fullName ?? 'You',
          author_image: created.author_image ?? user?.imageUrl ?? null,
        },
        ...prev,
      ])
    } catch (err) {
      console.error('Failed to save comment:', err)
      setCommentText(content)
    }
  }

  // ── Loading guard ──
  if (loading && !project) return <ProjectDetailsSkeleton />

  if (!loading && !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Project Data Unavailable</h2>
        <p className="text-slate-500">We couldn't load the project board. Please try refreshing or check your connection.</p>
        <Button onClick={() => loadProject()} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Retry Loading
        </Button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2 — Full-screen immersive workspace
  // Uses fixed inset-0 z-[200] to cover the entire viewport including the
  // main app sidebar. Returns early so View 1 is completely unmounted.
  // ─────────────────────────────────────────────────────────────────────────────

  if (isWorkspaceOpen && selectedTask) {
    const taskType = getTaskType(selectedTask)
    const conf = taskTypeConfig[taskType as keyof typeof taskTypeConfig] || taskTypeConfig.document
    const TypeIcon = conf.icon
    const activeCat = platformCategories[activeWorkspaceCategory]

    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">

          {/* Left: back + task info */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={closeWorkspace}
              className="gap-2 font-black text-xs shrink-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 shadow-md"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Tasks
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className={cn('p-1.5 rounded-lg shrink-0', conf.bg)}>
              <TypeIcon className={cn('h-4 w-4', conf.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate leading-tight">{selectedTask.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={priorityVariant[selectedTask.priority || 'MEDIUM']}
                  className={cn(
                    'text-[9px] px-1.5 py-0 font-bold',
                    selectedTask.priority === 'LOW' && 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-white/10 dark:text-slate-100',
                  )}
                >
                  {selectedTask.priority}
                </Badge>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', conf.bg, conf.color)}>
                  {conf.label} Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Right: timer + platforms + close */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Compact timer */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider hidden sm:inline">Timer</span>
              <span className={cn('font-mono font-bold text-xs tracking-widest min-w-[50px] text-center', timerActive ? 'text-emerald-500' : 'text-slate-400')}>
                {formatTime(timerSeconds)}
              </span>
              <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 mx-0.5" />
              {timerActive ? (
                <button onClick={() => setTimerActive(false)} title="Pause" className="p-0.5 text-amber-500 hover:text-amber-600 transition-colors">
                  <Pause className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button onClick={() => setTimerActive(true)} title="Start" className="p-0.5 text-emerald-500 hover:text-emerald-600 transition-colors">
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setTimerSeconds(0)} title="Reset" className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={closeWorkspace}
              className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/60 dark:bg-slate-950">

          {/* Dynamic Task Selection Hub */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              {(Object.keys(platformCategories) as Array<keyof typeof platformCategories>).map((catId) => {
                const cat = platformCategories[catId]
                const isActive = activeWorkspaceCategory === catId
                return (
                  <button
                    key={catId}
                    onClick={() => setActiveWorkspaceCategory(catId)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border",
                      isActive 
                        ? "bg-slate-900 dark:bg-primary text-white shadow-md border-white/10" 
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px]">🏆</span>
                  Top-Tier Suggestions
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCat.top.map((p) => (
                    <button
                      key={p.url}
                      onClick={() => window.open(p.url, '_blank')}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:border-primary transition-all duration-300 text-left"
                    >
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{p.label}</span>
                      <ExternalLink className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">⚙️</span>
                  Alternative Platforms
                </h3>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {activeCat.mid.map((p) => (
                    <button
                      key={p.url}
                      onClick={() => window.open(p.url, '_blank')}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 text-left"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{p.label}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Task description */}
          {selectedTask.description && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-4 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Task Description</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{selectedTask.description}</p>
            </div>
          )}
        </div>

        {/* ── Idle modal (inside workspace) ── */}
        {showIdleModal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <Card className="w-full max-w-md border-rose-500/30 bg-white dark:bg-slate-950 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-rose-500/10 p-6 border-b border-rose-500/20 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-rose-500 animate-bounce" />
                <CardTitle className="text-lg font-black">Hey! Was this a break?</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <p className="text-sm opacity-80 leading-relaxed">No activity detected for the last 5 minutes.</p>
                <div className="flex justify-end gap-3">
                  <Button onClick={() => handleConfirmIdleBreak(true)} className="bg-emerald-500 hover:bg-emerald-600 font-bold">Yes (Deduct 5m)</Button>
                  <Button onClick={() => handleConfirmIdleBreak(false)} className="bg-rose-500 hover:bg-rose-600 font-bold">No (Log Work Hour)</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1 — Main project page (app sidebar stays visible, normal scroll layout)
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 bg-transparent relative z-10 text-slate-900 dark:text-white space-y-6">

      {/* Top bar */}
      <div className="flex flex-wrap justify-between items-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 shadow-md gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-emerald-500 uppercase">Production Active</span>
        </div>
      </div>

      {/* Project header */}
      <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-primary">
              <FolderKanban className="h-5 w-5 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">Project Board Studio</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{project?.name}</h1>
            <p className="text-sm font-medium opacity-75 max-w-2xl leading-relaxed whitespace-pre-line">{project?.description}</p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <Badge
                variant={priorityVariant[project?.priority || 'MEDIUM']}
                className={cn(
                  'px-4 py-1.5 text-sm font-bold',
                  project?.priority === 'LOW' && 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-white/10 dark:text-slate-100',
                )}
              >
                {project?.priority || 'MEDIUM'} PRIORITY
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDeleteProject} disabled={deletingProject} className="gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 border-rose-500/30 font-bold">
                <Trash2 className="h-4 w-4" /> Delete Project
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold opacity-75 bg-white/10 dark:bg-black/20 px-3 py-1.5 rounded-lg">
              <UserIcon className="h-4 w-4 text-primary" />
              <span>
                Lead: {project?.project_lead_name || project?.project_lead_email || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: tasks + chat */}
      <div className="grid gap-6 lg:grid-cols-12">

        {/* ── Left Column: Form + Tasks (col 8) ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Task Creation Form */}
          <Card className="border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-lg overflow-hidden">
            <CardHeader className="py-3 px-5 border-b border-white/10 bg-black/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                <Plus className="h-4 w-4 text-primary" /> Create New Task
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Task Title</label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Implement Auth Flow"
                      className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Assignee Email</label>
                    <input
                      type="email"
                      value={newTaskAssigneeEmail}
                      onChange={(e) => setNewTaskAssigneeEmail(e.target.value)}
                      placeholder="e.g. dev@srit.edu"
                      className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Start Date</label>
                      <input
                        type="date"
                        value={newTaskStartDate}
                        onChange={(e) => setNewTaskStartDate(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Due Date</label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none text-slate-800 dark:text-white"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                      <select
                        value={newTaskStatus}
                        onChange={(e) => setNewTaskStatus(e.target.value as NewTaskStatus)}
                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none text-slate-800 dark:text-white"
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Describe the task requirements..."
                    className="w-full bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 h-20 resize-none text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isCreatingTask} className="font-black gap-2 bg-slate-900 dark:bg-primary text-white hover:opacity-90 shadow-xl border border-white/20 px-8 py-6 rounded-2xl text-base">
                    {isCreatingTask ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    Add Task to Board
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Project Tasks
              </h2>
              <span className="text-xs font-black bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-800 py-32 text-center bg-slate-50/50 dark:bg-white/5 shadow-inner">
                <div className="bg-primary/20 p-6 rounded-full mb-6 ring-8 ring-primary/5">
                  <CheckCircle2 className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-slate-700 dark:text-white uppercase tracking-widest">No tasks yet</h3>
                <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your project board is currently empty. Use the creation form above to add your first task and start the workflow!
                </p>
              </div>
            ) : (
              <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {tasks.map((task) => {
                  const progress = getTaskProgress(task)
                  const taskType = getTaskType(task)
                  const conf = taskTypeConfig[taskType]
                  const TypeIcon = conf.icon

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'group relative flex flex-col gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/70 border-l-[6px] shrink-0 w-[320px]',
                        'bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg',
                        'hover:shadow-2xl hover:-translate-y-1 transition-all duration-300',
                        priorityBorderColor[task.priority || 'MEDIUM']
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('p-2 rounded-xl shrink-0 shadow-sm', conf.bg)}>
                            <TypeIcon className={cn('h-4 w-4', conf.color)} />
                          </div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">{task.title}</h3>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 shrink-0"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {!task.assignee_email && !task.assignee_name && (
                        <div className="relative">
                          <button
                            type="button"
                            disabled={assigningTaskId === task.id}
                            className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-primary disabled:opacity-50"
                            onClick={() =>
                              setAssignTaskId((current) => (current === task.id ? null : task.id))
                            }
                          >
                            {assigningTaskId === task.id ? 'Assigning…' : '+ Assign Member'}
                          </button>
                          <InlineEmailAssignMenu
                            emails={memberEmails}
                            open={assignTaskId === task.id}
                            onClose={() => setAssignTaskId(null)}
                            onSelect={(email) => void handleAssignTaskMember(task.id, email)}
                          />
                        </div>
                      )}

                      {/* Description preview */}
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={priorityVariant[task.priority || 'MEDIUM']} className={cn(
                            "text-[9px] px-2 py-0.5 font-black uppercase border-2",
                            task.priority === 'HIGH' ? "bg-rose-500 text-white border-rose-600 shadow-sm" :
                            task.priority === 'MEDIUM' ? "bg-amber-500 text-slate-900 border-amber-600 shadow-sm" :
                            "bg-slate-200 text-slate-900 border-slate-400 shadow-sm dark:bg-slate-500 dark:text-white dark:border-slate-600"
                          )}>
                            {task.priority}
                          </Badge>
                          {task.assignee_email && (
                            <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-sm">
                              <UserIcon className="h-3 w-3 text-primary" /> {task.assignee_email}
                            </span>
                          )}
                        </div>

                      {/* Progress */}
                      {progress.total > 0 && (
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between text-[10px] font-black opacity-60 uppercase tracking-tighter">
                            <span>Progress</span>
                            <span>{progress.checked}/{progress.total} · {progress.percent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${progress.percent}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Timer running indicator */}
                      {timerActive && selectedTaskId === task.id && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 animate-pulse bg-emerald-500/5 py-1 px-2 rounded-lg border border-emerald-500/20">
                          <Loader2 className="h-3 w-3 animate-spin" /> Active in Workspace
                        </div>
                      )}

                      {/* Open workspace CTA */}
                      <button
                        onClick={() => openWorkspace(task.id)}
                        className="mt-4 w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900 dark:bg-primary text-white shadow-lg shadow-primary/10 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-slate-800 dark:border-primary/50"
                      >
                        <TypeIcon className="h-4 w-4" />
                        Open Workspace
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Chat + Audit (col 4) ── */}
        <div className="lg:col-span-4 space-y-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Discussion Feed
          </h2>

          <Card className="flex flex-col h-[420px] overflow-hidden border-white/20 shadow-2xl bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
            <CardHeader className="p-3 border-b border-white/10 bg-black/5 dark:bg-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Live Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center opacity-40 py-10 text-xs font-bold italic">No comments yet. Write a message below.</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {comment.author_image
                        ? <img src={comment.author_image} className="h-6 w-6 rounded-full object-cover ring-2 ring-white/10" alt="" />
                        : <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black">{comment.author_name?.charAt(0) || 'U'}</div>
                      }
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold">{comment.author_name}</span>
                        <span className="text-[8px] font-bold opacity-50">{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    <div className="ml-8 rounded-xl bg-white/40 dark:bg-black/40 p-2.5 text-xs font-medium border border-white/10 shadow-sm">{comment.content}</div>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-3 border-t border-white/10 bg-black/5 dark:bg-white/5">
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter message..."
                  className="flex-1 bg-white/50 dark:bg-slate-950/50 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <Button type="submit" size="icon" className="h-8 w-8 shrink-0 rounded-xl bg-primary">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>

          {/* Security Audit */}
          <Card className="border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 shadow-md">
            <CardHeader className="py-2.5 px-4 border-b border-rose-500/10">
              <CardTitle className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" /> Security Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 max-h-36 overflow-y-auto space-y-1.5 text-[10px] font-mono">
              {auditLogs.length === 0
                ? <div className="text-slate-400 dark:text-slate-500 italic">No security incidents logged.</div>
                : auditLogs.map((log, i) => (
                    <div key={i} className="text-rose-600 dark:text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">⚠️ {log}</div>
                  ))
              }
            </CardContent>
          </Card>
        </div>
      </div>

      {showIdleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border-rose-500/30 bg-white dark:bg-slate-950 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-rose-500/10 p-6 border-b border-rose-500/20 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-500 animate-bounce" />
              <CardTitle className="text-lg font-black">Hey! Was this a break?</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-sm opacity-80 leading-relaxed">No mouse or keyboard activity detected for 5 minutes.</p>
              <div className="flex justify-end gap-3">
                <Button onClick={() => handleConfirmIdleBreak(true)} className="bg-emerald-500 hover:bg-emerald-600 font-bold">Yes (Deduct 5m)</Button>
                <Button onClick={() => handleConfirmIdleBreak(false)} className="bg-rose-500 hover:bg-rose-600 font-bold">No (Log Work Hour)</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6 p-6 min-h-screen bg-transparent">
      <div className="h-14 w-full rounded-xl bg-white/10 animate-pulse" />
      <div className="h-40 w-full rounded-2xl bg-white/10 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 w-full rounded-xl bg-white/10 animate-pulse" />)}
        </div>
        <div className="lg:col-span-4 h-[420px] w-full rounded-xl bg-white/10 animate-pulse" />
      </div>
    </div>
  )
}
