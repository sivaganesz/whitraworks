import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@whitraworks/ui';
import {
  Building,
  Globe,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function DashboardPage() {
  const { slug, resolution } = useTenant();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Workspace Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Welcome to your tenant administration data plane.
        </p>
      </div>

      {/* Top Identity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Active Tenant Slug
            </CardTitle>
            <Building className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {slug || 'None'}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Data plane workspace identifier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Subdomain Detection
            </CardTitle>
            <Globe className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold font-mono text-zinc-950 dark:text-zinc-50 truncate">
              {resolution.hostname}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {resolution.isDevFallback ? 'Dev Mock Fallback' : 'Strict Host Resolution'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tenant Data Isolation
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              Enforced
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Row-level tenant extension active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Architecture & Isolation Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <CardTitle>Data Plane Architectural Standards</CardTitle>
          </div>
          <CardDescription>
            Golden invariants active for this workspace interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Mandatory Tenant Context (Rule 2)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  All queries bound strictly to active tenant identifier
                </p>
              </div>
              <Badge variant="active">Active</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Host-Only Cookies (Rule 5)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sessions locked to <span className="font-mono">{slug}.whitraworks.com</span>
                </p>
              </div>
              <Badge variant="active">Enforced</Badge>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Monorepo Tier Boundaries (Rule 7)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Zero direct DB access; clean HTTP communication via shared DTOs
                </p>
              </div>
              <Badge variant="active">Enforced</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
