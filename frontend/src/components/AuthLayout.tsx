import { Layers } from 'lucide-react'
import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <div className="mb-8 flex items-center gap-3 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
          <Layers className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SyncUp</h1>
          <p className="text-sm text-slate-400">Project management, in sync</p>
        </div>
      </div>
      {children}
    </div>
  )
}
