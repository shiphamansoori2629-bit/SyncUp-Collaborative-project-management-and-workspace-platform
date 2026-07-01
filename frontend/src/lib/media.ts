/** Resolve workspace logo path from API (/static/uploads/...) for <img src>. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}
