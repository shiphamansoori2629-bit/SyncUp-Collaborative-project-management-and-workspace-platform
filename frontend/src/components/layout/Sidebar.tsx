import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import {
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Layers,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { WorkspaceCreateModal } from '@/components/modals/WorkspaceCreateModal'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, loading } = useWorkspace()
  const { theme, toggleTheme } = useTheme()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const hasBackground = !!activeWorkspace?.logo

  return (
    <>
      <aside className={cn(
        "flex h-full w-64 shrink-0 flex-col transition-all duration-300 lg:w-72 border-r relative z-20",
        hasBackground 
          ? (theme === 'dark' ? "bg-slate-900/95 border-white/10 text-white" : "bg-white/95 border-black/5 text-slate-900")
          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
      )}>
        <div className={cn("border-b p-5", hasBackground ? (theme === 'dark' ? "border-white/10" : "border-black/5") : "border-slate-200 dark:border-white/10")}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={cn("text-sm font-black tracking-tight", hasBackground ? (theme === 'dark' ? "text-white" : "text-slate-900") : "text-slate-900 dark:text-white")}>SyncUp</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SRIT MCA PROJECTS</p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition font-semibold",
                hasBackground 
                  ? (theme === 'dark' ? "border-white/10 bg-white/5 hover:border-white/20" : "border-black/5 bg-black/5 hover:border-black/10")
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {activeWorkspace?.logo ? (
                  <img
                    src={activeWorkspace.logo || undefined}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded bg-slate-700 flex items-center justify-center text-[10px] text-white">
                    {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                )}
                <span className="truncate">
                  {loading ? 'Loading…' : (activeWorkspace?.name ?? 'Select workspace')}
                </span>
              </div>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-slate-400 transition', switcherOpen && 'rotate-180')}
              />
            </button>

            {switcherOpen && (
              <div className={cn(
                "absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-auto rounded-lg border py-1 shadow-2xl backdrop-blur-2xl",
                hasBackground 
                  ? (theme === 'dark' ? "border-white/10 bg-slate-900" : "border-black/10 bg-white")
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900"
              )}>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      setActiveWorkspaceId(ws.id)
                      setSwitcherOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      activeWorkspace?.id === ws.id 
                        ? 'bg-primary/20 text-primary font-bold' 
                        : hasBackground 
                          ? (theme === 'dark' ? 'text-white/80 hover:bg-white/10' : 'text-slate-700 hover:bg-black/5') 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
                    )}
                  >
                    {ws.logo ? (
                      <img src={ws.logo || undefined} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded bg-slate-700 flex items-center justify-center text-[10px] text-white">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate flex-1 font-medium">{ws.name}</span>
                    {ws.role && (
                      <span className="ml-2 shrink-0 text-[10px] uppercase font-bold text-slate-400">
                        {ws.role}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSwitcherOpen(false)
                    setWorkspaceModalOpen(true)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 border-t px-3 py-2.5 text-sm transition-colors font-semibold",
                    hasBackground 
                      ? (theme === 'dark' ? "border-white/10 text-indigo-300 hover:bg-white/10" : "border-black/5 text-indigo-600 hover:bg-black/5")
                      : "border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  New workspace
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition-all duration-200',
                  isActive
                    ? 'bg-slate-900 dark:bg-primary text-white shadow-xl shadow-primary/30 border border-white/10'
                    : hasBackground 
                      ? (theme === 'dark' ? 'text-slate-200 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-black/5 hover:text-slate-900')
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white',
                )
              }
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-colors", "text-slate-500 group-hover:text-primary")} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={cn("space-y-2 border-t p-4", hasBackground ? (theme === 'dark' ? "border-white/10" : "border-black/5") : "border-slate-200 dark:border-white/10")}>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 transition-colors font-bold",
              hasBackground 
                ? (theme === 'dark' ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-black/5 hover:text-slate-900")
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            )}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-5 w-5" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                Dark mode
              </>
            )}
          </Button>
          <div className={cn(
            "flex items-center justify-between gap-2 rounded-lg px-3 py-2",
            hasBackground ? (theme === 'dark' ? "bg-white/5" : "bg-black/5") : "bg-slate-100 dark:bg-white/5"
          )}>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account</span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </aside>

      <WorkspaceCreateModal open={workspaceModalOpen} onClose={() => setWorkspaceModalOpen(false)} />
    </>
  )
}
