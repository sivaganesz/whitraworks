import { useState } from 'react';
import {
  Dialog,
  Button,
  Input,
  Badge,
} from '@whitraworks/ui';
import { Check, Copy, Mail, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { workspaceApi, InviteMemberResponse, ApiError } from '../lib/api';
import { useTenant } from '../context/TenantContext';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: InviteMemberModalProps) {
  const { slug } = useTenant();
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteMemberResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const resetState = () => {
    setEmail('');
    setRoleCode('STAFF');
    setIsSubmitting(false);
    setError(null);
    setInviteResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await workspaceApi.inviteMember(
        {
          email: trimmedEmail,
          roleCode,
        },
        slug
      );
      setInviteResult(result);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to dispatch invitation. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={inviteResult ? 'Invitation Issued' : 'Invite Team Member'}
      description={
        inviteResult
          ? 'Share the invitation link with your new team member.'
          : 'Send an invitation to grant a user access to this workspace.'
      }
    >
      {inviteResult ? (
        <div className="space-y-5 pt-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-950/60 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Invitation created for {inviteResult.email}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                  Assigned role:{' '}
                  <span className="font-medium">{inviteResult.role.name}</span> ({inviteResult.role.code})
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Shareable Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteResult.inviteUrl}
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0 gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This link is valid for 7 days. Anyone with this link can set up their password and join.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetState}
            >
              Invite Another Member
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-sm text-red-800 dark:border-red-950/60 dark:bg-red-950/20 dark:text-red-300">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="email"
                required
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="pl-9"
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The recipient will receive an onboarding invitation to access this workspace.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Workspace Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label
                className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
                  roleCode === 'STAFF'
                    ? 'border-zinc-900 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/40 ring-1 ring-zinc-900 dark:ring-zinc-100'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Staff
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="STAFF"
                    checked={roleCode === 'STAFF'}
                    onChange={() => setRoleCode('STAFF')}
                    className="sr-only"
                  />
                  {roleCode === 'STAFF' && (
                    <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Standard operational access. Can view team roster and operational modules.
                </p>
              </label>

              <label
                className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
                  roleCode === 'ADMIN'
                    ? 'border-zinc-900 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-800/40 ring-1 ring-zinc-900 dark:ring-zinc-100'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Admin
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={roleCode === 'ADMIN'}
                    onChange={() => setRoleCode('ADMIN')}
                    className="sr-only"
                  />
                  {roleCode === 'ADMIN' && (
                    <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Administrative permissions. Can invite & manage members and workspace settings.
                </p>
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
              Note: Owner permissions are restricted to the primary workspace creator.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !email.trim()}
              className="gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Issuing...</span>
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
