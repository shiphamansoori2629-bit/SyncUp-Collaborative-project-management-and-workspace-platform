import { useEffect, useState } from 'react'
import { AlertCircle, Wifi } from 'lucide-react'
import { checkApiHealth } from '@/api/client'

export function ApiStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const probe = async () => {
      setOnline(await checkApiHealth())
    }
    void probe()
    const id = window.setInterval(() => void probe(), 15000)
    return () => window.clearInterval(id)
  }, [])

  if (online === null || online) return null

  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-100">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>
        Cannot reach the API at <strong>http://localhost:8000</strong>. Start the backend:
        <code className="ml-1 rounded bg-amber-100 px-1 dark:bg-amber-900">
          uvicorn app.main:app --reload --port 8000
        </code>
      </span>
      <Wifi className="ml-auto h-4 w-4 opacity-50" />
    </div>
  )
}
