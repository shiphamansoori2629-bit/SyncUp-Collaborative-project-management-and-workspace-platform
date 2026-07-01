import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface LogoFileInputProps {
  id: string
  label?: string
  currentLogoPath?: string | null
  file: File | null
  onFileChange: (file: File | null) => void
  onClearExisting?: () => void
  className?: string
}

export function LogoFileInput({
  id,
  label = 'Workspace logo',
  currentLogoPath,
  file,
  onFileChange,
  onClearExisting,
  className,
}: LogoFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const existingUrl = !file && currentLogoPath ? resolveMediaUrl(currentLogoPath) : null
  const displayUrl = preview ?? existingUrl

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/50">
          {displayUrl ? (
            <img src={displayUrl} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="block w-full cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-indigo-600"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null
              onFileChange(picked)
            }}
          />
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP, or SVG — max 5 MB</p>
          {(file || existingUrl) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => {
                // Fully reset all states
                onFileChange(null)
                setPreview(null)
                if (inputRef.current) {
                  inputRef.current.value = ''
                }
                if (!file && existingUrl && onClearExisting) {
                  onClearExisting()
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
              Remove image
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
