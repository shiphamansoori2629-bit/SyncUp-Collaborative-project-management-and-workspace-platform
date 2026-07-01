import { Outlet } from 'react-router-dom'
import { ApiStatusBanner } from '@/components/ApiStatusBanner'
import { Sidebar } from './Sidebar'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { activeWorkspace } = useWorkspace()
  const { theme } = useTheme()
  const hasBackground = !!activeWorkspace?.logo

  return (
    <div className={cn(
      "relative flex min-h-screen flex-col overflow-hidden transition-colors duration-300",
      !hasBackground ? "bg-slate-50 dark:bg-slate-950" : "has-bg-image",
      hasBackground && (theme === 'dark' ? "force-white-text" : "force-dark-text")
    )}>
      {/* Dynamic Background */}
      {hasBackground && (
        <div className="fixed inset-0 -z-10 h-full w-full">
          <img
            src={activeWorkspace.logo || undefined}
            alt=""
            className="h-full w-full object-cover scale-110 blur-2xl opacity-60"
          />
          <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl" />
        </div>
      )}

      <ApiStatusBanner />
      <div className="flex min-h-0 flex-1 relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
