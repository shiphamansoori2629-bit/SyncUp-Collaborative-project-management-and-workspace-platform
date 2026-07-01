import { useCallback, useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Bell, Mail, Settings as SettingsIcon, Shield, Trash2, Users, HelpCircle, Info } from 'lucide-react'
import {
  deleteWorkspace,
  listMembers,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from '@/api/workspaces'
import { getPreferences, updatePreferences } from '@/api/users'
import { InviteMemberModal } from '@/components/modals/InviteMemberModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LogoFileInput } from '@/components/LogoFileInput'
import { useTheme } from '@/context/ThemeContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'
import type { MemberRead, WorkspaceRole } from '@/types'

export function Settings() {
  const { user } = useUser()
  const { theme, toggleTheme, setTheme } = useTheme()
  const { activeWorkspace, refreshWorkspaces, workspaces, setActiveWorkspaceId } = useWorkspace()

  const [wsName, setWsName] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [wsSaving, setWsSaving] = useState(false)
  const [wsMessage, setWsMessage] = useState<string | null>(null)

  const [members, setMembers] = useState<MemberRead[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifLoading, setNotifLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setWsName(activeWorkspace.name)
    setWsDescription(activeWorkspace.description ?? '')
    setLogoFile(null)
    setRemoveLogo(false)
  }, [activeWorkspace])

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) return
    setMembersLoading(true)
    try {
      setMembers(await listMembers(activeWorkspace.id))
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  useEffect(() => {
    void (async () => {
      try {
        const prefs = await getPreferences()
        setEmailNotifications(prefs.email_notifications)
      } catch {
        /* use default */
      } finally {
        setNotifLoading(false)
      }
    })()
  }, [])

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace) return
    setWsSaving(true)
    if (!wsName.trim()) {
      setWsMessage('Workspace name is required.')
      setWsSaving(false)
      return
    }

    setWsMessage(null)
    try {
      await updateWorkspace(activeWorkspace.id, {
        name: wsName.trim(),
        description: wsDescription.trim() || null,
        logoFile,
        removeLogo,
      })
      
      // Update local context immediately for instant UI feedback
      await refreshWorkspaces()
      
      if (removeLogo) {
        setLogoFile(null)
        setRemoveLogo(false)
      }
      
      setWsMessage('Workspace updated successfully.')
    } catch (err) {
      setWsMessage(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setWsSaving(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return
    if (!window.confirm(`Delete workspace "${activeWorkspace.name}"? This cannot be undone.`)) return
    try {
      await deleteWorkspace(activeWorkspace.id)
      await refreshWorkspaces()
      const next = workspaces.find((w) => w.id !== activeWorkspace.id)
      if (next) setActiveWorkspaceId(next.id)
      setWsMessage('Workspace deleted.')
    } catch (err) {
      setWsMessage(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    if (!activeWorkspace) return
    try {
      await updateMemberRole(activeWorkspace.id, userId, { role })
      await loadMembers()
    } catch (err) {
      setWsMessage(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!activeWorkspace) return
    if (!window.confirm(`Remove ${name} from this workspace?`)) return
    try {
      await removeMember(activeWorkspace.id, userId)
      await loadMembers()
    } catch (err) {
      setWsMessage(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    setEmailNotifications(enabled)
    try {
      await updatePreferences(enabled)
    } catch (err) {
      setEmailNotifications(!enabled)
      setWsMessage(err instanceof Error ? err.message : 'Failed to update notifications')
    }
  }

  const isAdmin = activeWorkspace?.role === 'ADMIN'

  if (!activeWorkspace) return null

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl text-shadow high-contrast-text">Settings</h1>
        <p className="mt-1 high-contrast-text opacity-70">Manage your account and workspace preferences.</p>
      </div>

      <div className="grid gap-8">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <CardTitle className="flex items-center gap-2 high-contrast-text text-shadow">
              <SettingsIcon className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 p-6">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
              Light
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
              Dark
            </Button>
            <Button variant="secondary" onClick={toggleTheme}>Toggle theme</Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <CardTitle className="flex items-center gap-2 high-contrast-text text-shadow">
              <Bell className="h-5 w-5 text-primary" />
              Email notifications
            </CardTitle>
            <CardDescription className="high-contrast-text opacity-60">
              PATCH /api/users/me/preferences — controls Brevo task assignment emails
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="font-medium high-contrast-text">Background email alerts</p>
              <p className="text-sm high-contrast-text opacity-60">
                When ON, you receive Brevo emails for task assignments and invites.
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              disabled={notifLoading}
              onCheckedChange={(v) => void handleNotificationToggle(v)}
              className={cn(
                "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                emailNotifications ? "bg-emerald-600" : "bg-slate-600 border border-slate-400"
              )}
            />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
              <CardTitle className="high-contrast-text text-shadow">Workspace general settings</CardTitle>
              <CardDescription className="high-contrast-text opacity-60">PATCH /api/workspaces/&#123;id&#125;</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={(e) => void handleSaveWorkspace(e)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="set-name" className="text-slate-900 dark:text-white">Name</Label>
                    <Input
                      id="set-name"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      maxLength={255}
                      className="bg-white/50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 dark:text-white">Workspace logo</Label>
                    <LogoFileInput
                      id="set-logo-file"
                      label="Workspace logo"
                      currentLogoPath={removeLogo ? null : activeWorkspace.logo}
                      file={logoFile}
                      onFileChange={(f) => {
                        setLogoFile(f)
                        if (f) setRemoveLogo(false)
                      }}
                      onClearExisting={() => setRemoveLogo(true)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-desc" className="text-slate-900 dark:text-white">Description</Label>
                  <Textarea
                    id="set-desc"
                    value={wsDescription}
                    onChange={(e) => setWsDescription(e.target.value)}
                    className="bg-white/50 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30"
                    rows={3}
                  />
                </div>
                {wsMessage && (
                  <p className={cn("text-sm", wsMessage.includes('successfully') ? "text-emerald-400" : "text-rose-400")}>
                    {wsMessage}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={wsSaving} className="shadow-lg shadow-primary/20">
                    {wsSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDeleteWorkspace()}
                    className="gap-2 text-rose-400 border-rose-400/20 hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete workspace
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 high-contrast-text text-shadow">
                  <Users className="h-5 w-5 text-primary drop-shadow-high" />
                  Team management
                </CardTitle>
                <CardDescription className="high-contrast-text opacity-60">Members in {activeWorkspace.name}</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => setInviteOpen(true)} className="shadow-lg shadow-primary/20">Invite member</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {membersLoading ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/5" />
                <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/5" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-left high-contrast-text opacity-60">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5 high-contrast-text">
                    {members.map((m) => (
                      <tr key={m.user_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {m.image ? (
                              <img src={m.image} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-xs">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 opacity-60">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isAdmin && m.user_id !== user?.id ? (
                            <Select
                              value={m.role}
                              onChange={(e) =>
                                void handleRoleChange(m.user_id, e.target.value as WorkspaceRole)
                              }
                              className="h-8 w-32 bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs"
                            >
                              <option value="MEMBER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">MEMBER</option>
                              <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ADMIN</option>
                            </Select>
                          ) : (
                            <Badge variant={m.role === 'ADMIN' ? 'danger' : 'secondary'}>
                              <Shield className="mr-1 h-3 w-3" />
                              {m.role}
                            </Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {m.user_id !== user?.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-rose-400 border-rose-400/20 hover:bg-rose-400/10"
                                onClick={() => void handleRemoveMember(m.user_id, m.name)}
                              >
                                Remove
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <CardTitle className="high-contrast-text text-shadow flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              How to Use SyncUp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">📊 Dashboard Metrics</h4>
              <p className="opacity-80">Real-time task progress, project priorities, and team allocations.</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">🖥️ Task Workspaces</h4>
              <p className="opacity-80">Click "Open Workspace" on any task card to enter a full-screen focused environment. Use the Back to Tasks button to return here.</p>
              <ul className="list-disc list-inside pl-3 space-y-1 opacity-80">
                <li><strong>Coding</strong>: Monaco-style editor + compiler simulation.</li>
                <li><strong>Designing</strong>: Interactive HTML5 drawing canvas.</li>
                <li><strong>Document</strong>: Markdown editor with live preview.</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">⚡ Smart Work Tracking</h4>
              <p className="opacity-80">Start the timer in any workspace. After 5 minutes of inactivity an idle prompt keeps your logs accurate.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <CardTitle className="high-contrast-text text-shadow flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              About Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="font-bold">SyncUp Project Board Studio v1.2.0 (Stable)</p>
            <p className="opacity-80">Enterprise-level task and team management platform.</p>
            <div className="space-y-1 text-xs font-mono bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/10">
              <div>Backend: Uvicorn ASGI + FastAPI + SQLModel</div>
              <div>Frontend: React + TypeScript + Vite</div>
              <div>Auth: Clerk Secure Dev Tokens</div>
              <div>SMTP: Brevo Transactional Relays</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <CardTitle className="high-contrast-text text-shadow">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-6 text-sm high-contrast-text">
            <p>
              <span className="opacity-40">Name:</span>{' '}
              {user?.fullName ?? user?.firstName ?? '—'}
            </p>
            <p>
              <span className="opacity-40">Email:</span>{' '}
              {user?.primaryEmailAddress?.emailAddress ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <InviteMemberModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          workspaceId={activeWorkspace.id}
          onSuccess={() => void loadMembers()}
        />
      )}
    </div>
  )
}
