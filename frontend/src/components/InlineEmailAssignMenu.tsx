import { cn } from '@/lib/utils'

interface Props {
  emails: string[]
  open: boolean
  onSelect: (email: string) => void
  onClose: () => void
  className?: string
}

export function InlineEmailAssignMenu({ emails, open, onSelect, onClose, className }: Props) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900',
          className,
        )}
      >
        {emails.map((email) => (
          <button
            key={email}
            type="button"
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => {
              onSelect(email)
              onClose()
            }}
          >
            {email}
          </button>
        ))}
      </div>
    </>
  )
}
