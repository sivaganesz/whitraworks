import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@whitraworks/ui';
import {
  Search,
  ExternalLink,
  Users,
  Layers,
  PowerOff,
  RotateCcw,
  RefreshCw,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import { opsApi, type TenantListItem } from '../lib/api';
import { TenantStatusModal } from '../components/TenantStatusModal';

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';

export function TenantsListPage() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Status modal state
  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await opsApi.getTenants({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTenants(res.tenants);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleOpenStatusModal = (tenant: TenantListItem) => {
    setSelectedTenant(tenant);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: TenantListItem['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Active
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            Suspended
          </span>
        );
      case 'PROVISIONING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Provisioning
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Tenant Directory
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Global catalog of registered organizations, operational metrics, and lifecycle states.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTenants()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by organization name or slug..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-lg self-start sm:self-auto">
              {(['ALL', 'ACTIVE', 'SUSPENDED', 'PROVISIONING'] as StatusFilter[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setStatusFilter(tab);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {tab === 'ALL' ? 'All Tenants' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-500" />
              Organizations ({total})
            </CardTitle>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && tenants.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
              Loading tenants directory...
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No organizations found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Organization</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Active Members</th>
                    <th className="px-5 py-3.5">Capabilities</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Name & Subdomain */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {tenant.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <code className="font-mono text-zinc-600 dark:text-zinc-400">
                            {tenant.slug}.whitraworks.com
                          </code>
                          <a
                            href={`http://${tenant.slug}.localhost:3000`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            title="Visit tenant workspace"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">{getStatusBadge(tenant.status)}</td>

                      {/* Members */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <Users className="w-4 h-4 text-zinc-400" />
                          <span className="font-medium">{tenant.memberCount}</span>
                        </div>
                      </td>

                      {/* Capabilities */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <Layers className="w-4 h-4 text-zinc-400" />
                          <span className="font-medium">{tenant.activeCapabilitiesCount} active</span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(tenant.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tenant.status === 'ACTIVE' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusModal(tenant)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 text-xs h-8"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                              Suspend
                            </Button>
                          ) : tenant.status === 'SUSPENDED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusModal(tenant)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 text-xs h-8"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reactivate
                            </Button>
                          ) : null}

                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5 text-xs h-8 text-zinc-700 dark:text-zinc-300"
                            title="Manage tenant capabilities (Task 4.4)"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Capabilities
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing {tenants.length} of {total} tenants
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="text-xs h-8"
                >
                  Previous
                </Button>
                <span className="text-xs px-2 font-medium text-zinc-700 dark:text-zinc-300">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="text-xs h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Transition Modal */}
      <TenantStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenant={selectedTenant}
        onSuccess={() => loadTenants()}
      />
    </div>
  );
}
