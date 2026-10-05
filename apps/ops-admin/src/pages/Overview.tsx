import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@whitraworks/ui';
import { Building2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export function OverviewPage() {
  const stats = [
    {
      title: 'Total Workspaces',
      value: '24',
      change: '+3 this week',
      icon: Building2,
    },
    {
      title: 'Active Data Planes',
      value: '22',
      change: '91.6% operational',
      icon: CheckCircle2,
    },
    {
      title: 'Suspended Tenants',
      value: '2',
      change: 'Payment / audit hold',
      icon: AlertTriangle,
    },
    {
      title: 'Platform Control Plane',
      value: 'Healthy',
      change: 'PostgreSQL 16 & Redis 7',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Platform Overview
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          High-level operational health and multi-tenant infrastructure metrics.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </CardTitle>
                <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {stat.value}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Control Plane Invariants Status</CardTitle>
          <CardDescription>
            Golden architectural invariants enforced in the active runtime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Two-Tier Privilege Orthogonality (Rule 6)
              </span>
              <Badge variant="active">Active & Enforced</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Host-Only Session Cookie Isolation (Rule 5)
              </span>
              <Badge variant="active">Active & Enforced</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Scenario A Identity & Invite-Only Secondary Workspaces (Rule 10)
              </span>
              <Badge variant="active">Active & Enforced</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

