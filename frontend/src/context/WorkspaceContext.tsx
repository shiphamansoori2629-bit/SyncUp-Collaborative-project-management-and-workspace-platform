import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@clerk/clerk-react'
import { listWorkspaces } from '@/api/workspaces'
import type { Workspace } from '@/types'

const STORAGE_KEY = 'syncup_active_workspace_id'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setActiveWorkspaceId: (id: string) => void
  refreshWorkspaces: () => Promise<void>
  loading: boolean
  error: string | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshWorkspaces = useCallback(async () => {
    if (!isSignedIn) {
      setWorkspaces([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listWorkspaces()
      setWorkspaces(data)
      if (data.length === 0) {
        setActiveWorkspaceIdState(null)
        localStorage.removeItem(STORAGE_KEY)
      } else if (!activeWorkspaceId || !data.some((w) => w.id === activeWorkspaceId)) {
        const first = data[0].id
        setActiveWorkspaceIdState(first)
        localStorage.setItem(STORAGE_KEY, first)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [isSignedIn, activeWorkspaceId])

  useEffect(() => {
    void refreshWorkspaces()
  }, [refreshWorkspaces])

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  )

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      refreshWorkspaces,
      loading,
      error,
    }),
    [workspaces, activeWorkspace, setActiveWorkspaceId, refreshWorkspaces, loading, error],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}
