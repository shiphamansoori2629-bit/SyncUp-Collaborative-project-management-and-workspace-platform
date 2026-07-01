import { useCallback, useEffect, useState } from 'react'
import { Mail, Shield, UserPlus, Users } from 'lucide-react'
import { listMembers } from '@/api/workspaces'
import { InviteMemberModal } from '@/components/modals/InviteMemberModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/WorkspaceContext'
import type { MemberRead } from '@/types'

export function Team() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<MemberRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listMembers(activeWorkspace.id)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    void load()
  }, [load])

  const isAdmin = activeWorkspace?.role === 'ADMIN'

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Users className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Select a workspace to view the team.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl text-shadow">Team</h1>
          <p className="mt-1 text-white/80">
            GET /api/workspaces/{'{workspace_id}'}/members
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <Card className="border-0 shadow-md ring-1 ring-border">
        <CardHeader className="border-b border-white/10 bg-white/5">
          <CardTitle className="flex items-center gap-2 text-shadow">
            <Users className="h-5 w-5 text-primary drop-shadow-high" />
            Workspace members
          </CardTitle>
          <CardDescription className="text-white/60">{members.length} member(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full bg-white/5" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {members.map((member) => (
                <li key={member.user_id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-2 border-white/20"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-2 border-white/20">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant={member.role === 'ADMIN' ? 'danger' : 'secondary'} className="shadow-sm">
                    <Shield className="mr-1 h-3.3 w-3.3" />
                    {member.role}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InviteMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={activeWorkspace.id}
        onSuccess={() => void load()}
      />
    </div>
  )
}
