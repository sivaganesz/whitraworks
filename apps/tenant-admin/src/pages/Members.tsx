import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from '@whitraworks/ui';
import {
  Users,
  UserPlus,
  Mail,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Trash2,
  Clock,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import {
  workspaceApi,
  WorkspaceMember,
  WorkspaceInvitation,
  ApiError,
} from '../lib/api';
import { InviteMemberModal } from '../components/InviteMemberModal';

export function MembersPage() {
  const { activeWorkspace, user } = useAuth();
  const { slug } = useTenant();

  // Active tab state
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  // Members list state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Invitations list state
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal & action states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [invitationToRevoke, setInvitationToRevoke] = useState<WorkspaceInvitation | null>(null);
  const [actionNotification, setActionNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Permissions
  const canInvite = useMemo(() => {
    if (!activeWorkspace) return false;
    return (
      activeWorkspace.role === 'OWNER' ||
      activeWorkspace.permissions.includes('*') ||
      activeWorkspace.permissions.includes('members:invite')
    );
  }, [activeWorkspace]);

  const canRemove = useMemo(() => {
    if (!activeWorkspace) return false;
    return (
      activeWorkspace.role === 'OWNER' ||
      activeWorkspace.permissions.includes('*') ||
      activeWorkspace.permissions.includes('members:remove')
    );
  }, [activeWorkspace]);

  // Load Members
  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const response = await workspaceApi.listMembers(
        {
          search: searchQuery.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          limit: 50,
        },
        slug
      );
      setMembers(response.items);
      setTotalMembers(response.meta.total);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setMembersError(err.message);
      } else {
        setMembersError('Failed to load workspace members.');
      }
    } finally {
      setIsLoadingMembers(false);
    }
  }, [searchQuery, statusFilter, slug]);

  // Load Invitations
  const fetchInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    setInvitationsError(null);
    try {
      const response = await workspaceApi.listInvitations(slug);
      setInvitations(response);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setInvitationsError(err.message);
      } else {
        setInvitationsError('Failed to load pending invitations.');
      }
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Handle member deactivation
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setActionLoadingId(memberToRemove.id);
    setActionNotification(null);
    try {
      await workspaceApi.removeMember(memberToRemove.id, slug);
      setActionNotification({
        type: 'success',
        message: `Member ${memberToRemove.firstName} ${memberToRemove.lastName} deactivated.`,
      });
      setMemberToRemove(null);
      await fetchMembers();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionNotification({ type: 'error', message: err.message });
      } else {
        setActionNotification({ type: 'error', message: 'Failed to deactivate member.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle invitation revocation
  const handleConfirmRevokeInvitation = async () => {
    if (!invitationToRevoke) return;
    setActionLoadingId(invitationToRevoke.id);
    setActionNotification(null);
    try {
      await workspaceApi.revokeInvitation(invitationToRevoke.id, slug);
      setActionNotification({
        type: 'success',
        message: `Invitation for ${invitationToRevoke.email} revoked.`,
      });
      setInvitationToRevoke(null);
      await fetchInvitations();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionNotification({ type: 'error', message: err.message });
      } else {
        setActionNotification({ type: 'error', message: 'Failed to revoke invitation.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyInviteUrl = async (invitation: WorkspaceInvitation) => {
    const inviteUrl =
      invitation.inviteUrl ||
      `${window.location.origin}/invite/accept?token=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(invitation.token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      setCopiedToken(invitation.token);
      setTimeout(() => setCopiedToken(null), 2500);
    }
  };

  const formatJoinedDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getRoleBadge = (roleCode: string) => {
    switch (roleCode) {
      case 'OWNER':
        return (
          <Badge className="bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 border-none">
            Owner
          </Badge>
        );
      case 'ADMIN':
        return (
          <Badge className="bg-zinc-700 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-600">
            Admin
          </Badge>
        );
      case 'STAFF':
      default:
        return (
          <Badge variant="neutral" className="border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            Staff
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
            Active
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-zinc-500">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Team & Access
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage workspace members, role allocations, and pending staff invitations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchMembers();
              fetchInvitations();
            }}
            disabled={isLoadingMembers || isLoadingInvitations}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isLoadingMembers || isLoadingInvitations ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh</span>
          </Button>

          {canInvite && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              className="gap-1.5 shadow-sm bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Action Notification */}
      {actionNotification && (
        <div
          className={`rounded-lg border p-3.5 text-sm flex items-center justify-between ${
            actionNotification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-950/60 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-red-200 bg-red-50/70 text-red-800 dark:border-red-950/60 dark:bg-red-950/20 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotification.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span>{actionNotification.message}</span>
          </div>
          <button
            onClick={() => setActionNotification(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Members
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {totalMembers}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active Staff
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {members.filter((m) => m.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pending Invitations
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {invitations.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <Mail className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Team Directory ({totalMembers})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'invitations'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <span>Pending Invitations</span>
            {invitations.length > 0 && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 font-semibold">
                {invitations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content: Members */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Active Workspace Members</CardTitle>
                <CardDescription>
                  Users who have active or suspended membership in this workspace.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 w-full sm:w-56"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 h-9"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100" />
                  <span className="text-xs text-zinc-500">Loading members...</span>
                </div>
              </div>
            ) : membersError ? (
              <div className="p-8 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
                  {membersError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMembers}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                <Users className="mx-auto h-8 w-8 text-zinc-400" />
                <p className="mt-2 font-medium text-zinc-700 dark:text-zinc-300">
                  No workspace members found
                </p>
                <p className="mt-1 text-xs">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try clearing your search query or filters.'
                    : 'Invite colleagues to collaborate in this workspace.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Joined Date</th>
                      {canRemove && <th className="px-5 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {members.map((member) => {
                      const isOwner = member.role.code === 'OWNER';
                      const isSelf = user?.id === member.userId;

                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                                {member.firstName.charAt(0)}
                                {member.lastName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                                  <span>
                                    {member.firstName} {member.lastName}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] text-zinc-400 font-normal">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {getRoleBadge(member.role.code)}
                          </td>
                          <td className="px-5 py-3.5">
                            {getStatusBadge(member.status)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatJoinedDate(member.createdAt)}
                          </td>
                          {canRemove && (
                            <td className="px-5 py-3.5 text-right">
                              {isOwner ? (
                                <span className="text-xs text-zinc-400 italic">
                                  Primary Owner
                                </span>
                              ) : member.status === 'SUSPENDED' ? (
                                <span className="text-xs text-zinc-400">
                                  Deactivated
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMemberToRemove(member)}
                                  disabled={actionLoadingId === member.id}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 text-xs gap-1"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Deactivate</span>
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Invitations */}
      {activeTab === 'invitations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Pending Member Invitations</CardTitle>
                <CardDescription>
                  Invitations issued to prospective team members awaiting onboarding.
                </CardDescription>
              </div>

              {canInvite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>New Invite</span>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingInvitations ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100" />
                  <span className="text-xs text-zinc-500">Loading invitations...</span>
                </div>
              </div>
            ) : invitationsError ? (
              <div className="p-8 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
                  {invitationsError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchInvitations}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                <Mail className="mx-auto h-8 w-8 text-zinc-400" />
                <p className="mt-2 font-medium text-zinc-700 dark:text-zinc-300">
                  No pending invitations
                </p>
                <p className="mt-1 text-xs">
                  All invited team members have joined or no active invitations have been issued.
                </p>
                {canInvite && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="mt-4 gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite a Member</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <th className="px-5 py-3">Invitee Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Invited By</th>
                      <th className="px-5 py-3">Expires</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {invitations.map((invitation) => {
                      const isExpired = invitation.isExpired;

                      return (
                        <tr
                          key={invitation.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-zinc-400" />
                              <span>{invitation.email}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {getRoleBadge(invitation.role.code)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {invitation.invitedBy ? invitation.invitedBy.name : 'Administrator'}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              <span>{formatJoinedDate(invitation.expiresAt)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {isExpired ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                                Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyInviteUrl(invitation)}
                                className="h-8 gap-1 text-xs"
                              >
                                {copiedToken === invitation.token ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </Button>

                              {canInvite && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setInvitationToRevoke(invitation)}
                                  disabled={actionLoadingId === invitation.id}
                                  className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 text-xs px-2"
                                  title="Revoke Invitation"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          fetchMembers();
          fetchInvitations();
        }}
      />

      {/* Confirm Deactivate Member Dialog */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMemberToRemove(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Deactivate Team Member
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This action will suspend member access immediately.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              Are you sure you want to deactivate{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {memberToRemove.firstName} {memberToRemove.lastName}
              </strong>{' '}
              ({memberToRemove.email})? They will no longer be able to access this workspace.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMemberToRemove(null)}
                disabled={actionLoadingId === memberToRemove.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRemoveMember}
                disabled={actionLoadingId === memberToRemove.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoadingId === memberToRemove.id ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Revoke Invitation Dialog */}
      {invitationToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setInvitationToRevoke(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Revoke Invitation
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cancel pending invitation link.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              Are you sure you want to revoke the invitation for{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {invitationToRevoke.email}
              </strong>
              ? The link previously sent to them will be invalidated immediately.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInvitationToRevoke(null)}
                disabled={actionLoadingId === invitationToRevoke.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRevokeInvitation}
                disabled={actionLoadingId === invitationToRevoke.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoadingId === invitationToRevoke.id ? 'Revoking...' : 'Revoke Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
