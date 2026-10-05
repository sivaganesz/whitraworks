import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '@whitraworks/ui';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { opsApi, type TenantListItem, ApiError } from '../lib/api';

interface TenantStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantListItem | null;
  onSuccess: () => void;
}

export function TenantStatusModal({ isOpen, onClose, tenant, onSuccess }: TenantStatusModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !tenant) return null;

  const isSuspending = tenant.status === 'ACTIVE';
  const targetStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setErrorMessage('Please provide an audit reason of at least 3 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await opsApi.updateTenantStatus(tenant.id, {
        status: targetStatus,
        reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update tenant status. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-6 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                isSuspending
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}
            >
              {isSuspending ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {isSuspending ? 'Suspend Tenant Access' : 'Reactivate Tenant'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Target workspace: <span className="font-medium text-zinc-700 dark:text-zinc-300">{tenant.name}</span>{' '}
                (<code className="font-mono text-zinc-500">{tenant.slug}.whitraworks.com</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Warning */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div
            className={`p-3.5 rounded-lg text-xs leading-relaxed ${
              isSuspending
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {isSuspending
              ? 'Warning: Suspending this tenant immediately locks all members out of this workspace. Active API requests will be rejected.'
              : 'Reactivating will immediately restore full access to workspace members and active services.'}
          </div>

          {errorMessage && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60">
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="auditReason"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Mandatory Audit Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="auditReason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isSuspending
                  ? 'e.g. Terms of Service violation, billing delinquency, requested by owner...'
                  : 'e.g. Payment verified, compliance review resolved...'
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-colors resize-none"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Minimum 3 characters. This action is permanently logged to the system audit trail.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || reason.trim().length < 3}
              className={
                isSuspending
                  ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              }
            >
              {isLoading
                ? 'Updating...'
                : isSuspending
                ? 'Confirm Suspension'
                : 'Confirm Reactivation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
