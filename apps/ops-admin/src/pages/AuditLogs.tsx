import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Dialog,
} from '@whitraworks/ui';
import {
  Search,
  RefreshCw,
  Clock,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
} from 'lucide-react';
import { opsApi, AuditLogItem } from '../lib/api';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector Dialog state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await opsApi.getAuditLogs({
        page,
        limit,
        search: search.trim() || undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeVariant = (action: string): 'active' | 'suspended' | 'provisioning' | 'neutral' => {
    if (action.includes('status')) return 'suspended';
    if (action.includes('capabilities')) return 'active';
    if (action.includes('create') || action.includes('provision')) return 'provisioning';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Platform Audit Logs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Immutable system-wide security, tenant status, and capability change audit records.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">Error loading audit records</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search actions, emails, tenant slugs, or entities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50"
              >
                <option value="ALL">All Actions</option>
                <option value="tenant.status.update">tenant.status.update</option>
                <option value="tenant.capabilities.update">tenant.capabilities.update</option>
                <option value="tenant.create">tenant.create</option>
                <option value="auth.login">auth.login</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Trail Records</CardTitle>
              <CardDescription>
                Showing {logs.length} of {total} total immutable security events
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No audit logs found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => {
                    const date = new Date(log.createdAt);
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant={getActionBadgeVariant(log.action)} className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100 font-medium text-xs">
                          {log.tenant ? (
                            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              {log.tenant.slug}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Platform Level</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{log.entityType}</span>
                          <span className="text-zinc-400 font-mono ml-1">
                            ({log.entityId.slice(0, 8)}...)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5">
                            {log.actor?.isPlatformSuperadmin && (
                              <span title="Superadmin">
                                <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                              {log.actor?.email || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="gap-1 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
              <div>
                Page <span className="font-medium text-zinc-900 dark:text-zinc-100">{page}</span> of{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Detail Inspector Modal */}
      {selectedLog && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Record Details"
          description={`Log ID: ${selectedLog.id}`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-zinc-500 dark:text-zinc-400">Action</span>
                <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedLog.action}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-zinc-500 dark:text-zinc-400">Timestamp</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-zinc-500 dark:text-zinc-400">Actor</span>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedLog.actor?.email || 'System'}
                  {selectedLog.actor?.isPlatformSuperadmin && ' (Superadmin)'}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-zinc-500 dark:text-zinc-400">Target Tenant</span>
                <p className="font-mono font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedLog.tenant ? `${selectedLog.tenant.name} (${selectedLog.tenant.slug})` : 'Platform-Level'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Payload / Metadata JSON
              </span>
              <pre className="mt-1.5 p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 max-h-72">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
