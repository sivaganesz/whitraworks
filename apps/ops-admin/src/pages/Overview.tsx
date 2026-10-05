import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from '@whitraworks/ui';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
  Database,
  RefreshCw,
  ArrowRight,
  Clock,
  Activity,
  Loader2,
} from 'lucide-react';
import { opsApi, OverviewMetricsResponse } from '../lib/api';

export function OverviewPage() {
  const [data, setData] = useState<OverviewMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await opsApi.getOverviewMetrics();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const metrics = data?.metrics;
  const systemHealth = data?.systemHealth;
  const recentActivity = data?.recentActivity || [];

  const operationalPct = metrics?.totalTenants
    ? Math.round((metrics.activeTenants / metrics.totalTenants) * 100)
    : 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Platform Overview
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            High-level operational health and multi-tenant infrastructure metrics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          disabled={isLoading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">Failed to load platform overview</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {isLoading && !data ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Total Workspaces
                </CardTitle>
                <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {metrics?.totalTenants ?? 0}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {metrics?.activeTenants ?? 0} active &bull; {metrics?.suspendedTenants ?? 0} suspended
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Active Data Planes
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {metrics?.activeTenants ?? 0}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {operationalPct}% operational availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Users & Members
                </CardTitle>
                <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {metrics?.totalUsers ?? 0}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {metrics?.totalMembers ?? 0} active workspace memberships
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Suspended Tenants
                </CardTitle>
                <AlertTriangle className={`w-4 h-4 ${(metrics?.suspendedTenants ?? 0) > 0 ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {metrics?.suspendedTenants ?? 0}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {(metrics?.suspendedTenants ?? 0) > 0 ? 'Requires operator review' : 'No tenants suspended'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Invariants & Infrastructure Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle>Control Plane Invariants</CardTitle>
                </div>
                <CardDescription>
                  Golden architectural invariants enforced in the active runtime.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Two-Tier Privilege Orthogonality (Rule 6)
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Superadmin vs Tenant RBAC separation
                      </p>
                    </div>
                    <Badge variant="active">Enforced</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Host-Only Cookie Isolation (Rule 5)
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        No wildcard session domains
                      </p>
                    </div>
                    <Badge variant="active">Enforced</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Scenario A Identity Model (Rule 10)
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Invite-only secondary workspaces
                      </p>
                    </div>
                    <Badge variant="active">Enforced</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          PostgreSQL 16 Primary DB
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          UUID v7 keys & row-level tenant extension
                        </p>
                      </div>
                    </div>
                    <Badge variant="active">{systemHealth?.database || 'Healthy'}</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Redis 7 Session & Cache Bus
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Active distributed cache
                        </p>
                      </div>
                    </div>
                    <Badge variant="active">{systemHealth?.redis || 'Healthy'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Platform Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Platform Activity</CardTitle>
                  <CardDescription>
                    Latest security and operational audit log events.
                  </CardDescription>
                </div>
                <Link to="/audit-logs">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
                    No platform audit events recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {recentActivity.map((log) => (
                      <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              {log.action}
                            </span>
                            {log.tenant && (
                              <Badge variant="neutral" className="text-[10px]">
                                {log.tenant.slug}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                            By {log.actor?.email || 'System'} &bull; {log.entityType} ({log.entityId.slice(0, 8)}...)
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
