'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function roleLabel(role: string) {
  return role === 'COMPANY_ADMIN' ? 'Admin' : 'Member';
}

type MembersManagerProps = {
  currentUserId: string;
};

export function MembersManager({ currentUserId }: MembersManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'CLIENT' | 'COMPANY_ADMIN'>('CLIENT');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/companies/members'),
        fetch('/api/companies/invites'),
      ]);

      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();

      if (!membersRes.ok) throw new Error(membersData.error || 'Failed to load members');
      if (!invitesRes.ok) throw new Error(invitesData.error || 'Failed to load invites');

      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteUrl(null);
    setCreatingInvite(true);

    try {
      const res = await fetch('/api/companies/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');

      setInviteUrl(data.inviteUrl);
      setInviteEmail('');
      setSuccess('Invite created. Copy the link and share it with your teammate.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInviteUrl = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy link.');
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    setActionId(memberId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: data.role } : m)));
      setSuccess('Member role updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from your company?')) return;

    setActionId(memberId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/members/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccess('Member removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setActionId(inviteId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/invites/${inviteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke invite');

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setSuccess('Invite revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading team...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Invite member
          </CardTitle>
          <CardDescription>
            Create a shareable invite link. The link expires in 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as 'CLIENT' | 'COMPANY_ADMIN')}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Member</SelectItem>
                    <SelectItem value="COMPANY_ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={creatingInvite}>
              {creatingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Generate invite link'
              )}
            </Button>
          </form>

          {inviteUrl && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Share this link</p>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyInviteUrl}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending invites</CardTitle>
            <CardDescription>Invites that haven&apos;t been accepted yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabel(inv.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">{formatDate(inv.expiresAt)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={actionId === inv.id}
                        onClick={() => handleRevokeInvite(inv.id)}
                        title="Revoke invite"
                      >
                        {actionId === inv.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team members</CardTitle>
          <CardDescription>People who have access to this company workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.id === currentUserId;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || member.email.split('@')[0]}
                      {isSelf && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant="outline">{roleLabel(member.role)}</Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v)}
                          disabled={actionId === member.id}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLIENT">Member</SelectItem>
                            <SelectItem value="COMPANY_ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)]">{formatDate(member.createdAt)}</TableCell>
                    <TableCell>
                      {!isSelf && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={actionId === member.id}
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove member"
                        >
                          {actionId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
