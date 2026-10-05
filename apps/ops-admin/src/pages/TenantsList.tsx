import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@whitraworks/ui';

export function TenantsListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Tenants Directory
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage all multi-tenant organizations, statuses, and capability configurations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Workspaces</CardTitle>
          <CardDescription>
            Live tenant registry with status toggle and capability controls (Task 4.3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tenant directory table will be populated in Task 4.3.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

